// companyPayroll.ts — Monthly company payroll payouts, cash fallback, and 5% business tax

import type { CompanyBoardState } from './boardTypes';
import { addCitizenMemory } from './citizenMemory';
import { applyCompanyStreaksAndBankruptcy, generateSimulatedRevenue } from './companyFinances';
import { appendCompanyLedger } from './companyLedger';
import { getCompanyHealthMultiplier } from './companyRules';
import type { Company, JobMarketEvent } from './companyTypes';
import { BUSINESS_TAX_RATE } from './constants';
import { calculateMarginalTax, calculateMonthlyPay, clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { MartState } from './martTypes';
import type { Citizen, CityEvent } from './types';

export interface MonthlyPayrollSummary {
  totalPayroll: number;
  businessTaxCollected: number;
  citizenPayMap: Map<string, { grossPay: number; tax: number; payRatio: number }>;
}

export function runCompanyMonthEndFinances(params: {
  companies: Company[];
  citizens: Citizen[];
  mart: MartState;
  jobEvents: JobMarketEvent[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
  boardState?: CompanyBoardState;
}): MonthlyPayrollSummary {
  const { companies, citizens, mart, jobEvents, clock, dateLabel, events, boardState } = params;
  const citizenPayMap = new Map<string, { grossPay: number; tax: number; payRatio: number }>();
  let totalPayroll = 0;
  let businessTaxCollected = 0;

  for (const comp of companies) {
    if (comp.id === 'vijmart') {
      comp.cash = mart.cash;
      comp.monthlyRevenue = mart.monthlyRevenue;
      comp.monthlyOtherCost = mart.monthlyWholesaleSpend;
    }

    if (comp.bankrupt) {
      comp.lastMonthRevenue = 0;
      comp.lastMonthCosts = 0;
      comp.lastMonthProfit = 0;
      continue;
    }

    const simRev = generateSimulatedRevenue(comp);
    if (simRev > 0) {
      comp.monthlyRevenue = Math.round((comp.monthlyRevenue + simRev) * 100) / 100;
      comp.cash = Math.round((comp.cash + simRev) * 100) / 100;
      const isExport = comp.id === 'vijindustries';
      appendCompanyLedger(comp, clock, dateLabel, {
        kind: 'inflow',
        category: isExport ? 'export' : 'client_revenue',
        label: isExport ? 'Export Sales Revenue' : comp.id === 'vijtech' ? 'Client & IT Revenue' : 'Banking & Advisory Revenue',
        detail: isExport ? `Rep ${comp.reputation.toFixed(0)}/100 export settlement` : `${comp.sector} monthly receipts`,
        amount: simRev,
        balanceAfter: comp.cash,
      });
    }

    const employees = citizens.filter((c) => c.alive && c.employerId === comp.id);
    const healthMult = getCompanyHealthMultiplier(comp);
    const freezeMult = comp.payFreeze ? 0.92 : 1.0;

    const planned = employees.map((emp) => {
      let cutMult = 1;
      if (comp.id === 'vijindustries' && boardState) {
        const cutPct = emp.roleLevel === 'CEO' || emp.roleLevel === 'Executive' ? boardState.executivePayCutPct : boardState.companyPayCutPct;
        cutMult = Math.max(0.5, 1 - cutPct / 100);
      }
      return { emp, gross: Math.round(calculateMonthlyPay(emp, healthMult * freezeMult * cutMult, comp.industryMultiplier)) };
    });
    const fullPayroll = planned.reduce((s, p) => s + p.gross, 0);
    const payRatio = fullPayroll > 0 && comp.cash < fullPayroll ? clamp(Math.max(0, comp.cash) / fullPayroll, 0, 1) : 1;

    let actualPayroll = 0;
    for (const { emp, gross } of planned) {
      const paidGross = Math.round(gross * payRatio);
      const tax = calculateMarginalTax(paidGross);
      actualPayroll += paidGross;
      citizenPayMap.set(emp.id, { grossPay: paidGross, tax, payRatio });

      if (payRatio < 0.99) {
        emp.mood = Math.round(clamp(emp.mood - 8, 0, 100) * 10) / 10;
        addCitizenMemory(emp, clock, dateLabel, 'broke', `${comp.name} cut pay (${Math.round(payRatio * 100)}%) due to low cash.`, -28);
      }
    }

    if (payRatio < 0.99 && employees.length > 0) {
      comp.reputation = Math.round(clamp(comp.reputation - 8, 0, 100) * 10) / 10;
      events.push(makeCityEvent(clock, `latepay_${comp.id}`, {
        type: 'late-pay', companyId: comp.id,
        title: `${comp.name} Partial Payroll`,
        detail: `${comp.name} paid only ${Math.round(payRatio * 100)}% of ${formatDelta(fullPayroll)} payroll due to low cash.`,
      }));
    }

    const bizTax = Math.round(comp.monthlyRevenue * BUSINESS_TAX_RATE);
    comp.monthlyPayrollCost = actualPayroll;
    comp.monthlyBusinessTax = bizTax;
    const afterPayroll = Math.round((comp.cash - actualPayroll) * 100) / 100;
    comp.cash = Math.round((afterPayroll - bizTax) * 100) / 100;
    if (actualPayroll > 0) {
      appendCompanyLedger(comp, clock, dateLabel, { kind: 'outflow', category: 'payroll', label: 'Monthly Staff Payroll', detail: `${employees.length} employee(s) · ${Math.round(payRatio * 100)}% paid`, amount: actualPayroll, balanceAfter: afterPayroll });
    }
    if (bizTax > 0) {
      appendCompanyLedger(comp, clock, dateLabel, { kind: 'outflow', category: 'business_tax', label: 'Business Revenue Tax (5%)', detail: `5% on ${formatDelta(comp.monthlyRevenue)} revenue`, amount: bizTax, balanceAfter: comp.cash });
    }

    const totalCosts = Math.round((actualPayroll + comp.monthlyOtherCost + bizTax) * 100) / 100;
    const profit = Math.round((comp.monthlyRevenue - totalCosts) * 100) / 100;
    comp.lastMonthRevenue = Math.round(comp.monthlyRevenue * 100) / 100;
    comp.lastMonthCosts = totalCosts;
    comp.lastMonthProfit = profit;
    totalPayroll += actualPayroll;
    businessTaxCollected += bizTax;

    applyCompanyStreaksAndBankruptcy({ comp, employees, profit, payRatio, mart, jobEvents, clock, dateLabel, events, boardState });
  }

  return { totalPayroll, businessTaxCollected, citizenPayMap };
}
