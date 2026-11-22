// companyLedgerAggregate.ts — Day, week, and month aggregation for real company ledger entries

import type { CompanyLedgerCategory, CompanyLedgerEntry } from './companyTypes';
import { formatMonthYear } from './formatters';

const OPERATING_INFLOW_CATS = new Set<CompanyLedgerCategory>([
  'retail', 'wholesale', 'export', 'client_revenue',
]);
const OPERATING_OUTFLOW_CATS = new Set<CompanyLedgerCategory>([
  'wholesale', 'payroll', 'business_tax',
]);

export type LedgerPeriod = 'day' | 'week' | 'month';

export interface LedgerPeriodRow {
  key: string;
  sortDay: number;
  periodLabel: string;
  subLabel: string;
  inflows: number;
  outflows: number;
  operatingIn: number;
  operatingOut: number;
  netCash: number;
  endingBalance: number;
  entries: CompanyLedgerEntry[];
}

function getPeriodMeta(e: CompanyLedgerEntry, period: LedgerPeriod): { key: string; label: string; sub: string } {
  const my = formatMonthYear(e.month, e.year);
  if (period === 'day') {
    return { key: `d_${e.totalDay}`, label: e.dateLabel, sub: `Sim Day ${e.totalDay}` };
  }
  if (period === 'week') {
    const wk = Math.ceil(e.day / 7);
    const startD = (wk - 1) * 7 + 1;
    const endD = Math.min(30, wk * 7);
    return { key: `w_${e.year}_${e.month}_${wk}`, label: `${my} · Week ${wk}`, sub: `Days ${startD}–${endD}` };
  }
  return { key: `m_${e.year}_${e.month}`, label: my, sub: `Month ${e.month}, Year ${e.year}` };
}

export function aggregateCompanyLedger(
  entries: CompanyLedgerEntry[],
  period: LedgerPeriod
): LedgerPeriodRow[] {
  const map = new Map<string, LedgerPeriodRow>();
  for (const e of entries) {
    const meta = getPeriodMeta(e, period);
    let row = map.get(meta.key);
    if (!row) {
      row = {
        key: meta.key,
        sortDay: e.totalDay,
        periodLabel: meta.label,
        subLabel: meta.sub,
        inflows: 0,
        outflows: 0,
        operatingIn: 0,
        operatingOut: 0,
        netCash: 0,
        endingBalance: e.balanceAfter,
        entries: [],
      };
      map.set(meta.key, row);
    }
    if (e.totalDay > row.sortDay) {
      row.sortDay = e.totalDay;
      row.endingBalance = e.balanceAfter;
    }
    if (e.kind === 'inflow') {
      row.inflows = Math.round((row.inflows + e.amount) * 100) / 100;
      if (OPERATING_INFLOW_CATS.has(e.category)) row.operatingIn = Math.round((row.operatingIn + e.amount) * 100) / 100;
    } else {
      row.outflows = Math.round((row.outflows + e.amount) * 100) / 100;
      if (OPERATING_OUTFLOW_CATS.has(e.category)) row.operatingOut = Math.round((row.operatingOut + e.amount) * 100) / 100;
    }
    row.netCash = Math.round((row.inflows - row.outflows) * 100) / 100;
    row.entries.push(e);
  }
  return Array.from(map.values()).sort((a, b) => b.sortDay - a.sortDay);
}
