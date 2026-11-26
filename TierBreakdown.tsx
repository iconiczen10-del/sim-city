// TierBreakdown.tsx — Stacked horizontal bar and tabular counts for tiers T1 to T5

import { TIER_ORDER } from './constants';
import { TIER_STYLES } from './formatters';
import type { Citizen, TierId } from './types';

interface TierBreakdownProps {
  citizens: Citizen[];
}

export function TierBreakdown({ citizens }: TierBreakdownProps) {
  const total = citizens.length || 1;
  const counts: Record<TierId, number> = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
  for (const c of citizens) {
    counts[c.tier] += 1;
  }

  return (
    <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-sm font-semibold text-slate-100">
          Tier Distribution
        </h2>
        <span className="text-xs text-slate-400">
          Status label only · 50 citizens
        </span>
      </div>

      <div className="h-4 w-full rounded bg-slate-900 overflow-hidden flex border border-slate-800 mb-5">
        {TIER_ORDER.map((tier) => {
          const pct = (counts[tier] / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={tier}
              style={{ width: `${pct}%` }}
              className={`${TIER_STYLES[tier].bar} h-full border-r border-[#090d16] last:border-r-0 transition-all duration-300`}
              title={`${tier}: ${counts[tier]} citizens (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {TIER_ORDER.map((tier) => {
          const count = counts[tier];
          const pct = Math.round((count / total) * 100);
          const style = TIER_STYLES[tier];
          return (
            <div
              key={tier}
              className="py-2.5 px-3 rounded bg-[#0c1220] border border-slate-800/80"
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-mono text-xs font-semibold ${style.text}`}>
                  {tier}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {pct}%
                </span>
              </div>
              <div className="font-mono text-lg font-semibold text-slate-100">
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
