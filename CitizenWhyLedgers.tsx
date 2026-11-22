// CitizenWhyLedgers.tsx — Monthly citizen money ledger and status score breakdown for the Why? tab

import { computeStatusBreakdown } from './citizenBreakdowns';
import { formatDelta, formatPrice } from './formatters';
import type { Citizen } from './types';

interface CitizenWhyLedgersProps {
  citizen: Citizen;
}

export function CitizenWhyLedgers({ citizen }: CitizenWhyLedgersProps) {
  const status = computeStatusBreakdown(citizen);
  const incomeTotal = citizen.monthlyLedger.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const expenseTotal = citizen.monthlyLedger.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="grid grid-cols-2 gap-4 text-xs">
      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-semibold text-slate-200">This Month Money Ledger</span>
          <span className="font-mono text-slate-300">
            In <span className="text-emerald-300">{formatDelta(incomeTotal)}</span> · Out{' '}
            <span className="text-rose-300">{formatPrice(expenseTotal)}</span>
          </span>
        </div>
        {citizen.monthlyLedger.length === 0 ? (
          <div className="text-slate-500 py-6 text-center">No income or purchases logged this month yet.</div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {citizen.monthlyLedger.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-slate-800/50 pb-1">
                <div className="min-w-0 truncate">
                  <span className="text-slate-300">{e.label}</span>
                  <span className="text-slate-500 ml-1.5">· {e.dateLabel}</span>
                </div>
                <span className={`font-mono shrink-0 ml-2 ${e.kind === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {e.kind === 'income' ? `+${formatPrice(e.amount)}` : `-${formatPrice(e.amount)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-semibold text-slate-200">Status Score Breakdown</span>
          <span className="font-mono font-semibold text-sky-300">
            {citizen.statusScore.toFixed(1)} (target {status.weightedTarget.toFixed(1)})
          </span>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Savings (40% weight)', score: status.savingsScore, contrib: status.savingsScore * 0.4 },
            { label: 'Gross Pay (25% weight)', score: status.incomeScore, contrib: status.incomeScore * 0.25 },
            { label: `Role (${citizen.roleLevel}, 20%)`, score: status.roleScore, contrib: status.roleScore * 0.2 },
            { label: 'Respect (15% weight)', score: status.respectScore, contrib: status.respectScore * 0.15 },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-slate-400">{row.label}</span>
              <span className="font-mono text-slate-200">
                {row.score.toFixed(1)}/100 → <span className="text-amber-300">+{row.contrib.toFixed(1)}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-slate-800/70 text-[11px] text-slate-400">
          Current tier <span className="font-mono text-slate-200">{citizen.tier}</span> moves toward target by max ±2 pts/month with ±3 tier hysteresis.
        </div>
      </div>
    </div>
  );
}
