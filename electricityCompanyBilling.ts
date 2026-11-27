// electricityCompanyBilling.ts — Monthly company electricity billing and GJ CEO subsidy mood adjustment

import { appendCompanyLedger } from './companyLedger';
import type { Company } from './companyTypes';
import { calculateElectricBill, RECONNECT_FEE } from './electricityCatalog';
import type { ElectricityState } from './electricityTypes';
import { type SimClock } from './eventFactory';
import { formatDelta, formatMonthYear } from './formatters';
import type { GJSubsidyMood } from './gjSubsidyTypes';
import { recordSimEvent } from './recordsStore';
import type { Citizen } from './types';

export function stepGJSubsidyMoodAI(electricity: ElectricityState, gj: Company | undefined, ceo: Citizen | undefined): void {
  if (!gj || gj.bankrupt || electricity.simgodMoodOverride) return;
  const kindnessBias = ceo ? (ceo.traits.kindness - ceo.traits.greed) / 100 : 0;
  let nextMood: GJSubsidyMood = 'balanced';
  if (gj.cash < 10000 || gj.negativeCashStreak > 0) nextMood = 'strict';
  else if (gj.cash >= 26000 && gj.lastMonthProfit >= 0 && kindnessBias >= -0.1) nextMood = 'generous';
  else if (gj.cash < 16000 && kindnessBias < 0.15) nextMood = 'strict';
  electricity.subsidyMood = nextMood;
}

export function processCompanyElectricityBills(params: {
  electricity: ElectricityState;
  companies: Company[];
  clock: SimClock;
  dateLabel: string;
}): { billedTotal: number; collectedTotal: number } {
  const { electricity, companies, clock, dateLabel } = params;
  const monthLabel = formatMonthYear(clock.month, clock.year);
  let billedTotal = 0;
  let collectedTotal = 0;

  for (const comp of companies) {
    if (comp.id === 'gjelectricity' || comp.bankrupt) continue;
    const cLeg = electricity.companyLedgers[comp.id];
    if (!cLeg) continue;
    const bill = calculateElectricBill({
      id: `ceb_${clock.totalDays}_${comp.id}`,
      units: cLeg.monthUnits,
      tariff: electricity.tariff,
      days: 30,
      month: clock.month,
      year: clock.year,
      dateLabel,
      priorArrears: cLeg.arrearsBalance,
    });
    const owed = Math.round((cLeg.arrearsBalance + bill.totalDue + (cLeg.powerCut ? RECONNECT_FEE : 0)) * 100) / 100;
    billedTotal += bill.totalDue;
    const paid = comp.cash >= owed ? owed : Math.max(0, Math.round(comp.cash * 100) / 100);
    if (paid > 0) {
      comp.cash = Math.round((comp.cash - paid) * 100) / 100;
      comp.monthlyOtherCost = Math.round((comp.monthlyOtherCost + paid) * 100) / 100;
      appendCompanyLedger(comp, clock, dateLabel, {
        kind: 'outflow',
        category: 'utility_bill',
        label: 'Electricity Utility Bill',
        detail: `${bill.units} units (${monthLabel})`,
        amount: paid,
        balanceAfter: comp.cash,
      });
    }
    collectedTotal += paid;
    cLeg.arrearsBalance = Math.max(0, Math.round((owed - paid) * 100) / 100);
    if (cLeg.arrearsBalance <= 0.5) {
      bill.status = 'paid';
      cLeg.unpaidMonths = 0;
      cLeg.powerCut = false;
      cLeg.arrearsBalance = 0;
    } else {
      cLeg.unpaidMonths += 1;
      bill.status = cLeg.unpaidMonths >= 3 ? 'disconnected' : 'unpaid';
      if (cLeg.unpaidMonths >= 3) cLeg.powerCut = true;
    }
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

  return { billedTotal, collectedTotal };
}
