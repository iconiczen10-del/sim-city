// CompanyFullLedgerView.tsx — Real financial ledger with Per Day, Per Week, Per Month sub-tabs

import { useMemo, useState } from 'react';
import { LEDGER_CATEGORY_LABELS } from './companyLedger';
import { aggregateCompanyLedger, type LedgerPeriod } from './companyLedgerAggregate';
import { CompanyLedgerPeriodTable } from './CompanyLedgerPeriodTable';
import type { CompanyId, CompanyLedgerCategory } from './companyTypes';
import { formatDelta, formatPrice, formatSignedDelta } from './formatters';
import type { CityState } from './types';

interface CompanyFullLedgerViewProps {
  city: CityState;
}

const PERIOD_TABS: { id: LedgerPeriod; label: string }[] = [
  { id: 'day', label: 'Per Day' },
  { id: 'week', label: 'Per Week' },
  { id: 'month', label: 'Per Month' },
];

export function CompanyFullLedgerView({ city }: CompanyFullLedgerViewProps) {
  const [companyId, setCompanyId] = useState<CompanyId>('vijindustries');
  const [period, setPeriod] = useState<LedgerPeriod>('day');
  const [catFilter, setCatFilter] = useState<CompanyLedgerCategory | 'all'>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const comp = city.companies.find((c) => c.id === companyId) ?? city.companies[0];
  const entries = useMemo(() => {
    const raw = comp?.ledger ?? [];
    return catFilter === 'all' ? raw : raw.filter((e) => e.category === catFilter);
  }, [comp, catFilter]);

  const rows = useMemo(() => aggregateCompanyLedger(entries, period), [entries, period]);

  const journalEntries = useMemo(() => {
    if (!selectedKey) return entries.slice(0, 120);
    return rows.find((r) => r.key === selectedKey)?.entries ?? entries.slice(0, 120);
  }, [entries, rows, selectedKey]);

  const totals = useMemo(() => {
    let inflows = 0, outflows = 0;
    for (const e of entries) {
      if (e.kind === 'inflow') inflows += e.amount;
      else outflows += e.amount;
    }
    return { inflows, outflows, net: inflows - outflows };
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {city.companies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setCompanyId(c.id); setSelectedKey(null); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                c.id === companyId ? 'bg-slate-800 text-amber-300 border border-amber-500/40' : 'bg-[#0c1220] text-slate-300 border border-slate-800 hover:text-slate-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-[#090d16] border border-slate-800 rounded-md">
            {PERIOD_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setPeriod(t.id); setSelectedKey(null); }}
                className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                  period === t.id ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter ledger by category"
            value={catFilter}
            onChange={(e) => { setCatFilter(e.target.value as CompanyLedgerCategory | 'all'); setSelectedKey(null); }}
            className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
          >
            <option value="all">All Categories</option>
            {(Object.keys(LEDGER_CATEGORY_LABELS) as CompanyLedgerCategory[]).map((k) => (
              <option key={k} value={k}>{LEDGER_CATEGORY_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-xs">
        {[
          { label: `${comp.name} Cash`, val: formatDelta(comp.cash), cls: comp.cash < 0 ? 'text-rose-300' : 'text-amber-300' },
          { label: 'Recorded Inflows', val: `+${formatPrice(totals.inflows)}`, cls: 'text-emerald-300' },
          { label: 'Recorded Outflows', val: `-${formatPrice(totals.outflows)}`, cls: 'text-rose-300' },
          { label: 'Net Recorded Flow', val: formatSignedDelta(totals.net), cls: totals.net >= 0 ? 'text-emerald-300' : 'text-rose-300' },
        ].map((k) => (
          <div key={k.label} className="bg-[#111827] border border-slate-800/90 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">{k.label}</div>
            <div className={`font-mono text-base font-semibold mt-0.5 tabular-nums ${k.cls}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <CompanyLedgerPeriodTable period={period} rows={rows} selectedKey={selectedKey} onSelectKey={setSelectedKey} />

      <div className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-100">
            Transaction Journal <span className="font-mono text-slate-400">({journalEntries.length} shown)</span>
          </span>
          <span className="text-[11px] text-slate-400">Click any period row above to filter transactions</span>
        </div>

        {journalEntries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No matching transactions recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/70 max-h-80 overflow-y-auto text-xs">
            {journalEntries.map((e) => (
              <div key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-4 hover:bg-slate-800/25">
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="font-mono text-[11px] text-slate-500 w-28 shrink-0">{e.dateLabel}</span>
                  <span className="font-mono text-[11px] text-slate-400 w-32 shrink-0">{LEDGER_CATEGORY_LABELS[e.category]}</span>
                  <div className="min-w-0 truncate">
                    <span className="font-medium text-slate-100 mr-2">{e.label}</span>
                    <span className="text-slate-400">{e.detail}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 font-mono shrink-0 tabular-nums">
                  <span className={e.kind === 'inflow' ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                    {e.kind === 'inflow' ? `+${formatPrice(e.amount)}` : `-${formatPrice(e.amount)}`}
                  </span>
                  <span className="text-slate-400 w-24 text-right">{formatDelta(e.balanceAfter)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
