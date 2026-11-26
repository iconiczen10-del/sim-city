// electricityBilling.ts — Day-30 electricity billing, arrears disconnects, plant upkeep/failures, and GJ AI

import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { appendCompanyLedger } from './companyLedger';
import type { Company } from './companyTypes';
import { calculateElectricBill, RECONNECT_FEE } from './electricityCatalog';
import { stepGJPlantsAndAIMonthEnd } from './electricityPlantMonthly';
import type { ElectricityState } from './electricityTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta, formatMonthYear } from './formatters';
import type { HousingState } from './housingTypes';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent } from './types';

function collectPayment(payer: Citizen, amount: number, clock: SimClock, dateLabel: string, label: string): number {
  const payable = Math.max(0, payer.savings - 15);
  const paid = Math.min(payable, amount);
  if (paid <= 0) return 0;
  payer.savings = Math.round((payer.savings - paid) * 100) / 100;
  appendLedgerEntry(payer, clock.totalDays, dateLabel, 'expense', 'Electricity', label, paid);
  return Math.round(paid * 100) / 100;
}

export function processElectricityMonthEnd(params: {
  electricity: ElectricityState;
  housing: HousingState;
  citizens: Citizen[];
  companies: Company[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { electricity, housing, citizens, companies, clock, dateLabel, events } = params;
  const gj = companies.find((c) => c.id === 'gjelectricity');
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const monthLabel = formatMonthYear(clock.month, clock.year);
  let billedTotal = 0;
  let collectedTotal = 0;

  // 1. Household bills (after salary)
  for (const h of housing.houses) {
    const leg = h.electricLedger;
    const occ = h.occupantIds.map((id) => byId.get(id)).filter((c): c is Citizen => Boolean(c && c.alive));
    if (!leg || occ.length === 0) continue;

    const bill = calculateElectricBill({
      id: `eb_${clock.totalDays}_${h.id}`,
      units: leg.monthUnits, tariff: electricity.tariff, days: 30,
      month: clock.month, year: clock.year, dateLabel, priorArrears: leg.arrearsBalance,
    });
    const reconnectNeed = leg.powerCut ? RECONNECT_FEE : 0;
    const totalOwed = Math.round((leg.arrearsBalance + bill.totalDue + reconnectNeed) * 100) / 100;
    billedTotal += bill.totalDue;

    const share = totalOwed / occ.length;
    let housePaid = 0;
    for (const c of occ) {
      const p = collectPayment(c, share, clock, dateLabel, `${h.name} electric bill`);
      housePaid += p;
      c.lastElectricBill = Math.round((bill.totalDue / occ.length) * 100) / 100;
    }
    housePaid = Math.round(housePaid * 100) / 100;
    collectedTotal += housePaid;
    bill.paidAmount = Math.min(bill.totalDue, housePaid);
    const remaining = Math.round(Math.max(0, totalOwed - housePaid) * 100) / 100;

    if (remaining <= 0.5) {
      bill.status = leg.powerCut ? 'reconnected' : 'paid';
      leg.arrearsBalance = 0;
      leg.unpaidMonths = 0;
      leg.powerCut = false;
      leg.disconnectNotice = null;
    } else {
      leg.arrearsBalance = remaining;
      leg.unpaidMonths += 1;
      bill.status = leg.unpaidMonths >= 3 ? 'disconnected' : housePaid > 0 ? 'partial' : 'unpaid';
      if (leg.unpaidMonths === 1) {
        leg.disconnectNotice = 'Month 1 Warning (+5% late fee)';
        for (const c of occ) { c.mood = clamp(c.mood - 6, 0, 100); appendLifeLog(c, clock.totalDays, dateLabel, 'money', `Missed ${h.name} electricity bill (${formatDelta(remaining)} due).`); }
      } else if (leg.unpaidMonths === 2) {
        leg.disconnectNotice = 'Month 2 Disconnect Notice';
        for (const c of occ) { c.stress = clamp(c.stress + 10, 0, 100); addCitizenMemory(c, clock, dateLabel, 'broke', `Electric disconnect notice at ${h.name}.`, -24); }
        events.push(makeCityEvent(clock, `edisc_warn_${h.id}`, { type: 'electric-bill', companyId: 'gjelectricity', citizenId: occ[0]?.id, citizenName: occ[0]?.name, title: 'Electricity Disconnect Notice', detail: `${h.name} has 2 months unpaid power (${formatDelta(remaining)}).` }));
      } else {
        const wasCut = leg.powerCut;
        leg.powerCut = true;
        leg.lastPowerCutDay = clock.totalDays;
        leg.disconnectNotice = `Disconnected — pay ${formatDelta(remaining)} + ∆${RECONNECT_FEE} fee`;
        if (!wasCut) {
          events.push(makeCityEvent(clock, `epowcut_${h.id}`, { type: 'power-cut', companyId: 'gjelectricity', citizenId: occ[0]?.id, citizenName: occ[0]?.name, title: 'Home Power Disconnected', detail: `${h.name} power cut after 3 unpaid months (${formatDelta(remaining)} due).` }));
        }
      }
    }
    leg.bills = [bill, ...leg.bills].slice(0, 24);
    leg.monthlyUnitsHistory = [...leg.monthlyUnitsHistory.slice(-23), { label: monthLabel, units: bill.units, amount: bill.totalDue }];
    for (const c of occ) { c.electricArrears = leg.arrearsBalance; c.electricUnpaidMonths = leg.unpaidMonths; c.electricPowerCut = leg.powerCut; }
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'electricity', subType: 'bill',
      subjectId: h.id, subjectKind: 'house', subjectName: h.name,
      summary: `${h.name} bill ${formatDelta(bill.totalDue)} (${bill.units}u, ${bill.status}, paid ${formatDelta(housePaid)})`,
      detail: { bill, paid: housePaid, reconnectFeeApplied: reconnectNeed, remainingArrears: remaining, unpaidMonths: leg.unpaidMonths },
    });
  }

  // 2. Company electricity bills
  for (const comp of companies) {
    if (comp.id === 'gjelectricity' || comp.bankrupt) continue;
    const cLeg = electricity.companyLedgers[comp.id];
    if (!cLeg) continue;
    const bill = calculateElectricBill({ id: `ceb_${clock.totalDays}_${comp.id}`, units: cLeg.monthUnits, tariff: electricity.tariff, days: 30, month: clock.month, year: clock.year, dateLabel, priorArrears: cLeg.arrearsBalance });
    const owed = Math.round((cLeg.arrearsBalance + bill.totalDue + (cLeg.powerCut ? RECONNECT_FEE : 0)) * 100) / 100;
    billedTotal += bill.totalDue;
    const paid = comp.cash >= owed ? owed : Math.max(0, Math.round(comp.cash * 100) / 100);
    if (paid > 0) {
      comp.cash = Math.round((comp.cash - paid) * 100) / 100;
      comp.monthlyOtherCost = Math.round((comp.monthlyOtherCost + paid) * 100) / 100;
      appendCompanyLedger(comp, clock, dateLabel, { kind: 'outflow', category: 'utility_bill', label: 'Electricity Utility Bill', detail: `${bill.units} units (${monthLabel})`, amount: paid, balanceAfter: comp.cash });
    }
    collectedTotal += paid;
    cLeg.arrearsBalance = Math.max(0, Math.round((owed - paid) * 100) / 100);
    if (cLeg.arrearsBalance <= 0.5) { bill.status = 'paid'; cLeg.unpaidMonths = 0; cLeg.powerCut = false; cLeg.arrearsBalance = 0; }
    else { cLeg.unpaidMonths += 1; bill.status = cLeg.unpaidMonths >= 3 ? 'disconnected' : 'unpaid'; if (cLeg.unpaidMonths >= 3) cLeg.powerCut = true; }
    bill.paidAmount = Math.min(bill.totalDue, paid);
    cLeg.bills = [bill, ...cLeg.bills].slice(0, 24);
    cLeg.monthlyUnitsHistory = [...cLeg.monthlyUnitsHistory.slice(-23), { label: monthLabel, units: bill.units, amount: bill.totalDue }];
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'electricity', subType: 'bill',
      subjectId: comp.id, subjectKind: 'company', subjectName: comp.name,
      summary: `${comp.name} electric bill ${formatDelta(bill.totalDue)} (${bill.units}u, ${bill.status})`,
      detail: { bill, paid, remainingArrears: cLeg.arrearsBalance },
    });
  }

  electricity.monthlyBilledTotal = Math.round(billedTotal * 100) / 100;
  electricity.monthlyCollectedTotal = Math.round(collectedTotal * 100) / 100;
  if (gj && !gj.bankrupt && collectedTotal > 0) {
    gj.cash = Math.round((gj.cash + collectedTotal) * 100) / 100;
    gj.monthlyRevenue = Math.round((gj.monthlyRevenue + collectedTotal) * 100) / 100;
    appendCompanyLedger(gj, clock, dateLabel, { kind: 'inflow', category: 'utility_bill', label: 'Monthly Power Bill Collections', detail: `Collected ${formatDelta(collectedTotal)} / ${formatDelta(billedTotal)} billed`, amount: collectedTotal, balanceAfter: gj.cash });
  }

  stepGJPlantsAndAIMonthEnd({ electricity, gj, citizensById: byId, clock, dateLabel, events });
}
