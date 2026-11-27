// electricityBilling.ts — Day-30 subsidy assessment, household & company billing, GJ subsidy absorption, and reactions

import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { appendCompanyLedger } from './companyLedger';
import type { Company } from './companyTypes';
import { clamp } from './economy';
import { processCitizenBillingReactions } from './electricityAwarenessEngine';
import { calculateElectricBill, RECONNECT_FEE } from './electricityCatalog';
import { processCompanyElectricityBills, stepGJSubsidyMoodAI } from './electricityCompanyBilling';
import { stepGJPlantsAndAIMonthEnd } from './electricityPlantMonthly';
import { applySubsidyToHouseBill } from './electricitySubsidyApply';
import { assessHouseSubsidyPackage } from './electricitySubsidyScoring';
import type { ElectricityState } from './electricityTypes';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta, formatMonthYear } from './formatters';
import { getGJAssessorInfo } from './gjStaffEngine';
import type { HousingState } from './housingTypes';
import { recordSimEvent } from './recordsStore';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

function collectPayment(payer: Citizen, amount: number, clock: SimClock, dateLabel: string, label: string): number {
  const payable = Math.max(0, payer.savings - 15);
  const trust = payer.electricityAwareness?.trustInGJ ?? 60;
  if (trust < 22 && payable < amount * 1.4 && payer.traits.honesty < 60) return 0;
  const paid = Math.min(payable, amount);
  if (paid <= 0) return 0;
  payer.savings = Math.round((payer.savings - paid) * 100) / 100;
  appendLedgerEntry(payer, clock.totalDays, dateLabel, 'expense', 'Electricity', label, paid);
  return Math.round(paid * 100) / 100;
}

export function processElectricityMonthEnd(params: {
  electricity: ElectricityState; housing: HousingState; citizens: Citizen[]; companies: Company[];
  sharity?: SharityState; clock: SimClock; dateLabel: string; events: CityEvent[];
}): void {
  const { electricity, housing, citizens, companies, sharity, clock, dateLabel, events } = params;
  const gj = companies.find((c) => c.id === 'gjelectricity');
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const monthLabel = formatMonthYear(clock.month, clock.year);
  const assessor = getGJAssessorInfo(citizens, gj);
  const outreachLeft = { count: assessor.monthlyReach };
  let billedTotal = 0, collectedTotal = 0, totalAbsorbedMonth = 0, helpedCount = 0;

  for (const h of housing.houses) {
    const leg = h.electricLedger;
    const occ = h.occupantIds.map((id) => byId.get(id)).filter((c): c is Citizen => Boolean(c && c.alive));
    if (!leg || occ.length === 0) continue;

    const rawBill = calculateElectricBill({ id: `eb_${clock.totalDays}_${h.id}`, units: leg.monthUnits, tariff: electricity.tariff, days: 30, month: clock.month, year: clock.year, dateLabel, priorArrears: leg.arrearsBalance });
    const pkg = assessHouseSubsidyPackage({ house: h, occ, allCitizens: citizens, electricity, gj, month: clock.month, year: clock.year, dateLabel, totalDays: clock.totalDays, outreachLeft, assessor });
    const reconnectNeed = leg.powerCut ? RECONNECT_FEE : 0;
    const applied = applySubsidyToHouseBill({ rawBill, tariff: electricity.tariff, pkg, occ, ledger: leg, gj, reconnectNeed });
    const bill = applied.bill;
    billedTotal += bill.totalDue;

    if (applied.absorbed > 0 && gj) {
      gj.cash = Math.round((gj.cash - applied.absorbed) * 100) / 100;
      gj.monthlyOtherCost = Math.round((gj.monthlyOtherCost + applied.absorbed) * 100) / 100;
      totalAbsorbedMonth += applied.absorbed;
      helpedCount += 1;
      electricity.subsidyLog = [{ id: `slog_${clock.totalDays}_${h.id}`, day: clock.totalDays, dateLabel, houseId: h.id, houseName: h.name, status: pkg!.status, amountAbsorbed: applied.absorbed, assessor: pkg!.assessorTitle, reason: pkg!.reasonSummary }, ...(electricity.subsidyLog ?? [])].slice(0, 80);
    }
    if (pkg) {
      leg.currentSubsidy = pkg;
      leg.subsidyHistory = [pkg, ...(leg.subsidyHistory ?? [])].slice(0, 24);
    }

    const wasPowerCutBefore = leg.powerCut;
    let housePaid = 0;
    const paidByCitizen = new Map<string, number>();
    for (const c of occ) {
      const share = applied.shares.get(c.id) ?? 0;
      const p = collectPayment(c, share, clock, dateLabel, `${h.name} electric bill`);
      paidByCitizen.set(c.id, p);
      housePaid += p;
      c.lastElectricBill = Math.round(share * 100) / 100;
    }
    housePaid = Math.round(housePaid * 100) / 100;
    collectedTotal += housePaid;
    bill.paidAmount = Math.min(bill.totalDue, housePaid);
    const remaining = Math.round(Math.max(0, applied.totalOwedAfterSubsidy - housePaid) * 100) / 100;

    if (remaining <= 0.5) {
      bill.status = leg.powerCut ? 'reconnected' : 'paid';
      leg.arrearsBalance = 0; leg.unpaidMonths = 0; leg.powerCut = false; leg.disconnectNotice = null;
    } else {
      leg.arrearsBalance = remaining; leg.unpaidMonths += 1;
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
        leg.powerCut = true; leg.lastPowerCutDay = clock.totalDays;
        leg.disconnectNotice = `Disconnected — pay ${formatDelta(remaining)} + ∆${RECONNECT_FEE} fee`;
        if (!wasCut) events.push(makeCityEvent(clock, `epowcut_${h.id}`, { type: 'power-cut', companyId: 'gjelectricity', citizenId: occ[0]?.id, citizenName: occ[0]?.name, title: 'Home Power Disconnected', detail: `${h.name} power cut after 3 unpaid months (${formatDelta(remaining)} due).` }));
      }
    }
    leg.bills = [bill, ...leg.bills].slice(0, 24);
    leg.monthlyUnitsHistory = [...leg.monthlyUnitsHistory.slice(-23), { label: monthLabel, units: bill.units, amount: bill.totalDue }];
    for (const c of occ) { c.electricArrears = leg.arrearsBalance; c.electricUnpaidMonths = leg.unpaidMonths; c.electricPowerCut = leg.powerCut; }
    processCitizenBillingReactions({ house: h, occ, bill, rawBill, pkg, shares: applied.shares, paidByCitizen, wasPowerCutBefore, isPowerCutNow: leg.powerCut, clock, dateLabel, sharity });
    recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'electricity', subType: 'bill', subjectId: h.id, subjectKind: 'house', subjectName: h.name, summary: `${h.name} bill ${formatDelta(bill.totalDue)} (${bill.units}u, ${bill.status}, subsidy ${formatDelta(applied.absorbed)})`, detail: { bill, paid: housePaid, subsidy: pkg, remainingArrears: remaining } });
  }

  electricity.monthlySubsidyAbsorbed = Math.round(totalAbsorbedMonth * 100) / 100;
  electricity.totalSubsidyAbsorbed = Math.round(((electricity.totalSubsidyAbsorbed ?? 0) + totalAbsorbedMonth) * 100) / 100;
  electricity.householdsHelpedCount = helpedCount;
  if (gj && totalAbsorbedMonth > 0) {
    appendCompanyLedger(gj, clock, dateLabel, { kind: 'outflow', category: 'subsidy', label: 'Subsidy absorbed', detail: `${helpedCount} household(s) via ${assessor.assessorTitle}`, amount: totalAbsorbedMonth, balanceAfter: gj.cash });
    events.push(makeCityEvent(clock, `gjsub_${clock.totalDays}`, { type: 'subsidy', companyId: 'gjelectricity', title: 'GJ Power Subsidies Applied', detail: `GJ Electricity absorbed ${formatDelta(totalAbsorbedMonth)} across ${helpedCount} household(s) (${assessor.assessorTitle}).` }));
  }

  const compBills = processCompanyElectricityBills({ electricity, companies, clock, dateLabel });
  billedTotal += compBills.billedTotal; collectedTotal += compBills.collectedTotal;
  electricity.monthlyBilledTotal = Math.round(billedTotal * 100) / 100;
  electricity.monthlyCollectedTotal = Math.round(collectedTotal * 100) / 100;
  if (gj && !gj.bankrupt && collectedTotal > 0) {
    gj.cash = Math.round((gj.cash + collectedTotal) * 100) / 100;
    gj.monthlyRevenue = Math.round((gj.monthlyRevenue + collectedTotal) * 100) / 100;
    appendCompanyLedger(gj, clock, dateLabel, { kind: 'inflow', category: 'utility_bill', label: 'Monthly Power Bill Collections', detail: `Collected ${formatDelta(collectedTotal)} / ${formatDelta(billedTotal)} billed`, amount: collectedTotal, balanceAfter: gj.cash });
  }
  const ceo = gj?.ceoId ? byId.get(gj.ceoId) : undefined;
  stepGJSubsidyMoodAI(electricity, gj, ceo);
  stepGJPlantsAndAIMonthEnd({ electricity, gj, citizensById: byId, clock, dateLabel, events });
}
