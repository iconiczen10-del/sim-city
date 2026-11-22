// companyFinances.ts — Simulated non-retail revenue, profit streaks, and 3-month bankruptcy closure

import { addCitizenMemory } from './citizenMemory';
import type { Company, JobMarketEvent } from './companyTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta, formatMonthYear } from './formatters';
import type { MartState } from './martTypes';
import type { Citizen, CityEvent } from './types';

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function generateSimulatedRevenue(comp: Company): number {
  if (comp.bankrupt) return 0;
  const prev = comp.lastMonthRevenue;
  if (comp.id === 'vijtech') {
    const base = prev > 0 ? prev * randRange(0.75, 1.25) : randRange(7500, 13000);
    return Math.round(clamp(base, 5000, 15000));
  }
  if (comp.id === 'vijcapital') {
    const base = prev > 0 ? prev * randRange(0.85, 1.15) : randRange(2400, 4400);
    return Math.round(clamp(base, 2000, 5000));
  }
  if (comp.id === 'vijindustries') {
    const baseExport = randRange(3000, 7000) * randRange(0.8, 1.2);
    return Math.round(clamp(baseExport, 2400, 8400));
  }
  return 0;
}

export function applyCompanyStreaksAndBankruptcy(params: {
  comp: Company;
  employees: Citizen[];
  profit: number;
  payRatio: number;
  mart: MartState;
  jobEvents: JobMarketEvent[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { comp, employees, profit, payRatio, mart, jobEvents, clock, dateLabel, events } = params;

  if (profit >= 0) {
    comp.positiveProfitStreak += 1;
    comp.negativeProfitStreak = 0;
    comp.reputation = Math.round(clamp(comp.reputation + (payRatio >= 1 ? 0.8 : 0), 0, 100) * 10) / 10;
    if (comp.positiveProfitStreak === 3) {
      events.push(makeCityEvent(clock, `cmil_${comp.id}`, {
        type: 'company-milestone', companyId: comp.id,
        title: `${comp.name} 3-Month Profit Streak`,
        detail: `${comp.name} reached 3 straight profitable months (latest ${formatDelta(profit)}).`,
      }));
    }
  } else {
    comp.negativeProfitStreak += 1;
    comp.positiveProfitStreak = 0;
  }

  if (comp.cash < 0) {
    comp.negativeCashStreak += 1;
    if (comp.negativeCashStreak === 2) {
      events.push(makeCityEvent(clock, `bwarn_${comp.id}`, {
        type: 'bankruptcy', companyId: comp.id,
        title: `${comp.name} Bankruptcy Warning`,
        detail: `${comp.name} cash has been negative for 2 months (${formatDelta(comp.cash)}).`,
      }));
    } else if (comp.negativeCashStreak >= 3) {
      comp.bankrupt = true;
      for (const emp of employees) {
        emp.employerId = null;
        emp.bossId = null;
        emp.roleLevel = 'Unemployed';
        emp.lastGrossPay = 0;
        emp.lastTax = 0;
        emp.performanceScore = 0;
        addCitizenMemory(emp, clock, dateLabel, 'loss', `Lost job when ${comp.name} went bankrupt.`, -45);
        emp.workHistory = [{ id: `wh_bk_${clock.totalDays}_${emp.id}`, dateLabel, companyId: comp.id, companyName: comp.name, role: 'Unemployed' as const, kind: 'bankrupt' as const, note: `Bankruptcy layoff at ${comp.name}.` }, ...emp.workHistory].slice(0, 24);
        jobEvents.unshift({ id: `je_bk_${clock.totalDays}_${emp.id}`, dateLabel, kind: 'layoff', citizenId: emp.id, citizenName: emp.name, companyId: comp.id, companyName: comp.name, role: 'Unemployed', detail: `${emp.name} laid off by ${comp.name} bankruptcy.` });
      }
      events.push(makeCityEvent(clock, `bankrupt_${comp.id}`, {
        type: 'bankruptcy', companyId: comp.id,
        title: `${comp.name} Bankrupt`,
        detail: `${comp.name} stayed negative for 3 months and laid off all ${employees.length} staff.`,
      }));
    }
  } else {
    comp.negativeCashStreak = 0;
  }

  if (comp.id === 'vijmart') {
    mart.cash = Math.max(0, comp.cash);
    mart.lastMonthProfit = profit;
    mart.closedUntilFunded = comp.bankrupt;
  }

  comp.history = [...comp.history.slice(-59), { label: formatMonthYear(clock.month, clock.year), revenue: comp.lastMonthRevenue, costs: comp.lastMonthCosts, profit, cash: comp.cash }];
  comp.monthlyRevenue = 0;
  comp.monthlyOtherCost = 0;
}
