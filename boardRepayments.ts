// boardRepayments.ts — Employee investment proportional principal repayments and bankruptcy loss handling

import type { CompanyBoardState } from './boardTypes';
import { appendLedgerEntry } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import type { Company } from './companyTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { Citizen, CityEvent } from './types';

export function repayEmployeeInvestmentsMonthly(params: {
  comp: Company;
  citizens: Citizen[];
  board: CompanyBoardState;
  reserveTarget: number;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): number {
  const { comp, citizens, board, reserveTarget, clock, dateLabel, events } = params;
  const active = board.employeeInvestments.filter((i) => i.status === 'active' && i.principal > i.repaid);
  if (active.length === 0 || comp.positiveProfitStreak < 2 || comp.lastMonthProfit <= 0 || comp.cash <= reserveTarget) {
    return 0;
  }

  const budget = Math.min(Math.max(0, comp.cash - reserveTarget), Math.round(comp.lastMonthProfit * 0.6));
  const totalOwed = active.reduce((s, i) => s + (i.principal - i.repaid), 0);
  if (budget < 10 || totalOwed <= 0) return 0;

  let paidTotal = 0;
  let fullCount = 0;
  const byId = new Map(citizens.map((c) => [c.id, c]));

  for (const inv of active) {
    const owed = inv.principal - inv.repaid;
    const pay = Math.min(owed, Math.round((budget * owed) / totalOwed));
    if (pay <= 0) continue;
    inv.repaid += pay;
    paidTotal += pay;
    const emp = byId.get(inv.citizenId);
    if (emp && emp.alive) {
      emp.savings += pay;
      appendLedgerEntry(emp, clock.totalDays, dateLabel, 'income', 'Investment Repaid', `${comp.name} principal repayment`, pay);
    }
    if (inv.repaid >= inv.principal) {
      inv.status = 'repaid';
      fullCount += 1;
      if (emp && emp.alive) {
        emp.mood = Math.round(clamp(emp.mood + 14, 0, 100) * 10) / 10;
        addCitizenMemory(emp, clock, dateLabel, 'investment_repaid', `${comp.name} repaid full ${formatDelta(inv.principal)} investment!`, 30);
      }
    }
  }

  if (paidTotal > 0) {
    comp.cash = Math.round((comp.cash - paidTotal) * 100) / 100;
    events.push(makeCityEvent(clock, `invrepay_${comp.id}`, {
      type: 'investment',
      companyId: comp.id,
      title: `${comp.name} Repaid Staff Investors`,
      detail: `Repaid ${formatDelta(paidTotal)} principal to staff (${fullCount} fully settled).`,
    }));
  }
  return paidTotal;
}

export function wipeEmployeeInvestmentsOnBankruptcy(
  comp: Company,
  citizens: Citizen[],
  board: CompanyBoardState,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): void {
  const active = board.employeeInvestments.filter((i) => i.status === 'active');
  if (active.length === 0) return;
  const byId = new Map(citizens.map((c) => [c.id, c]));
  let totalLost = 0;
  for (const inv of active) {
    const lost = inv.principal - inv.repaid;
    totalLost += lost;
    inv.status = 'lost';
    const emp = byId.get(inv.citizenId);
    if (emp && emp.alive) {
      emp.mood = Math.round(clamp(emp.mood - 16, 0, 100) * 10) / 10;
      emp.stress = Math.round(clamp(emp.stress + 18, 0, 100) * 10) / 10;
      emp.bossRelationship = Math.round(clamp(emp.bossRelationship - 25, -100, 100));
      addCitizenMemory(emp, clock, dateLabel, 'investment_lost', `Lost ${formatDelta(lost)} invested in ${comp.name} when it went bankrupt.`, -42);
    }
  }
  events.push(makeCityEvent(clock, `invlost_${comp.id}`, {
    type: 'investment',
    companyId: comp.id,
    title: 'Employee Investments Wiped Out',
    detail: `${active.length} employee(s) lost ${formatDelta(totalLost)} in ${comp.name} bankruptcy.`,
  }));
}
