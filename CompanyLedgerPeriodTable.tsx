// CompanyLedgerPeriodTable.tsx — Per-day, per-week, and per-month real financial rollup table

import type { LedgerPeriod, LedgerPeriodRow } from './companyLedgerAggregate';
import { formatDelta, formatPrice, formatSignedDelta } from './formatters';

interface CompanyLedgerPeriodTableProps {
  period: LedgerPeriod;
  rows: LedgerPeriodRow[];
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
}

export function CompanyLedgerPeriodTable({
  period,
  rows,
  selectedKey,
  onSelectKey,
}: CompanyLedgerPeriodTableProps) {
  const label = period === 'day' ? 'Day' : period === 'week' ? 'Week' : 'Month';

  return (
    <div className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-100">
          {label}ly Summary Ledger <span className="font-mono text-slate-400">({rows.length} {label.toLowerCase()}{rows.length === 1 ? '' : 's'})</span>
        </span>
        {selectedKey && (
          <button
            type="button"
            onClick={() => onSelectKey(null)}
            className="text-amber-300 hover:text-amber-200 cursor-pointer"
          >
            Show all entries
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-500">
          No financial transactions logged yet for this company. Advance the simulation to record daily sales, wholesale orders, and month-end payroll.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1220] text-[11px] text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="px-4 py-2 font-medium">{label}</th>
                <th className="px-3 py-2 font-medium text-right">Operating Rev</th>
                <th className="px-3 py-2 font-medium text-right">Operating Out</th>
                <th className="px-3 py-2 font-medium text-right">Total Inflows</th>
                <th className="px-3 py-2 font-medium text-right">Total Outflows</th>
                <th className="px-3 py-2 font-medium text-right">Net Cash Flow</th>
                <th className="px-3 py-2 font-medium text-right">End Balance</th>
                <th className="px-4 py-2 font-medium text-right">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
              {rows.map((r) => {
                const active = selectedKey === r.key;
                return (
                  <tr
                    key={r.key}
                    onClick={() => onSelectKey(active ? null : r.key)}
                    className={`cursor-pointer transition-colors ${active ? 'bg-amber-500/10' : 'hover:bg-slate-800/35'}`}
                  >
                    <td className="px-4 py-2 font-sans">
                      <div className="font-medium text-slate-100">{r.periodLabel}</div>
                      <div className="text-[11px] text-slate-500">{r.subLabel}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-300">+{formatPrice(r.operatingIn)}</td>
                    <td className="px-3 py-2 text-right text-rose-300">-{formatPrice(r.operatingOut)}</td>
                    <td className="px-3 py-2 text-right text-slate-200">+{formatPrice(r.inflows)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">-{formatPrice(r.outflows)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${r.netCash >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {formatSignedDelta(r.netCash)}
                    </td>
                    <td className={`px-3 py-2 text-right ${r.endingBalance < 0 ? 'text-rose-300' : 'text-amber-300'}`}>
                      {formatDelta(r.endingBalance)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-400">{r.entries.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
