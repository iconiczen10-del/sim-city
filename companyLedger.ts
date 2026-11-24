// companyLedger.ts — Real company financial ledger recording helpers

import type { Company, CompanyLedgerCategory } from './companyTypes';
import type { SimClock } from './eventFactory';
import { simIdSuffix } from './rng';

export const LEDGER_CATEGORY_LABELS: Record<CompanyLedgerCategory, string> = {
  retail: 'Retail Sales',
  wholesale: 'Wholesale',
  export: 'Export Revenue',
  client_revenue: 'Client Revenue',
  payroll: 'Staff Payroll',
  business_tax: 'Business Tax (5%)',
  capital_call: 'Board Capital',
  employee_investment: 'Staff Investment',
  investment_repayment: 'Debt Repayment',
  utility_bill: 'Electricity Bills',
  plant_fuel: 'Plant Fuel',
  plant_upkeep: 'Plant Upkeep',
  plant_capex: 'Plant Build / Repair',
  adjustment: 'Cash Adjustment',
};

export function appendCompanyLedger(
  comp: Company,
  clock: SimClock,
  dateLabel: string,
  opts: {
    kind: 'inflow' | 'outflow';
    category: CompanyLedgerCategory;
    label: string;
    detail: string;
    amount: number;
    balanceAfter?: number;
  }
): void {
  const cleanAmt = Math.round(opts.amount * 100) / 100;
  if (cleanAmt <= 0) return;
  if (!comp.ledger) comp.ledger = [];

  comp.ledger = [{
    id: `cleg_${comp.id}_${clock.totalDays}_${opts.category}_${simIdSuffix()}`,
    totalDay: clock.totalDays,
    day: clock.day,
    month: clock.month,
    year: clock.year,
    dateLabel,
    kind: opts.kind,
    category: opts.category,
    label: opts.label,
    detail: opts.detail,
    amount: cleanAmt,
    balanceAfter: Math.round((opts.balanceAfter ?? comp.cash) * 100) / 100,
  }, ...comp.ledger].slice(0, 600);
}

export function recordMartRetailLedger(
  vijMart: Company | undefined,
  todayRevenue: number,
  buyersCount: number,
  martCash: number,
  clock: SimClock,
  dateLabel: string
): void {
  if (!vijMart || todayRevenue <= 0) return;
  appendCompanyLedger(vijMart, clock, dateLabel, {
    kind: 'inflow',
    category: 'retail',
    label: 'Daily Retail Sales',
    detail: `${buyersCount} citizen buyer(s) at Vij Mart`,
    amount: todayRevenue,
    balanceAfter: martCash,
  });
}

export function recordWholesaleLedgers(params: {
  vijMart: Company | undefined;
  vijInd: Company | undefined;
  wholesaleDelta: number;
  martCash: number;
  outsideSupplierActive: boolean;
  clock: SimClock;
  dateLabel: string;
}): void {
  const { vijMart, vijInd, wholesaleDelta, martCash, outsideSupplierActive, clock, dateLabel } = params;
  if (wholesaleDelta <= 0) return;
  if (vijMart) {
    appendCompanyLedger(vijMart, clock, dateLabel, {
      kind: 'outflow',
      category: 'wholesale',
      label: 'Wholesale Stock Order',
      detail: `Supplied by ${outsideSupplierActive ? 'Outside Vij Wholesale' : 'Vij Industries'}`,
      amount: wholesaleDelta,
      balanceAfter: martCash,
    });
  }
  if (vijInd && !vijInd.bankrupt) {
    appendCompanyLedger(vijInd, clock, dateLabel, {
      kind: 'inflow',
      category: 'wholesale',
      label: 'Wholesale to Vij Mart',
      detail: 'Mart inventory replenishment order',
      amount: wholesaleDelta,
      balanceAfter: vijInd.cash,
    });
  }
}
