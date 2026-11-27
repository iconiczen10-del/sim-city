// CitizenDebtMindAndLog.tsx — Citizen debt mindset (perceived vs actual, shame, strategy) and Why/What/How log

import { formatDelta } from './formatters';
import type { CitizenDebtProfile } from './vijBankTypes';

interface CitizenDebtMindAndLogProps {
  profile: CitizenDebtProfile;
  inheritedNote?: string;
}

const STRATEGY_LABEL: Record<string, string> = {
  full: 'Pay Full + Extra',
  minimum: 'Minimum Due',
  smallest_first: 'Smallest First',
  skip: 'Skip / Defer',
  borrow_to_repay: 'Borrow to Repay',
};

export function CitizenDebtMindAndLog({ profile, inheritedNote }: CitizenDebtMindAndLogProps) {
  const gap = Math.round((profile.totalDebt - profile.perceivedDebt) * 100) / 100;

  return (
    <div className="space-y-4 text-xs">
      <section className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Debt Mindset &amp; Behavior</h3>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-sky-300">
            Strategy: {STRATEGY_LABEL[profile.repaymentStrategy] ?? profile.repaymentStrategy}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-[#111827] border border-slate-800 rounded p-2.5">
            <div className="text-slate-400">Perceived Debt</div>
            <div className="font-mono tabular-nums text-sm font-semibold text-slate-100 mt-0.5">{formatDelta(profile.perceivedDebt)}</div>
            {gap > 5 && <div className="text-[10px] text-amber-300 mt-0.5">Underestimates by {formatDelta(gap)}</div>}
          </div>
          <div className="bg-[#111827] border border-slate-800 rounded p-2.5">
            <div className="text-slate-400">Bank Trust</div>
            <div className="font-mono tabular-nums text-sm font-semibold text-cyan-300 mt-0.5">{Math.round(profile.trustInBank)}/100</div>
          </div>
          <div className="bg-[#111827] border border-slate-800 rounded p-2.5">
            <div className="text-slate-400">Debt Shame</div>
            <div className={`font-mono tabular-nums text-sm font-semibold mt-0.5 ${profile.shame >= 45 ? 'text-rose-300' : 'text-slate-200'}`}>
              {Math.round(profile.shame)}/100
            </div>
          </div>
          <div className="bg-[#111827] border border-slate-800 rounded p-2.5">
            <div className="text-slate-400">Wage Garnishment</div>
            <div className={`font-mono tabular-nums text-sm font-semibold mt-0.5 ${profile.garnishmentPct > 0 ? 'text-rose-400' : 'text-emerald-300'}`}>
              {profile.garnishmentPct > 0 ? `${profile.garnishmentPct}%` : 'None'}
            </div>
          </div>
        </div>

        {profile.copingNote && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2 text-amber-200">
            Coping action: {profile.copingNote}
          </div>
        )}
        {inheritedNote && (
          <div className="bg-sky-500/10 border border-sky-500/30 rounded px-3 py-2 text-sky-200">
            Estate inheritance: {inheritedNote}
          </div>
        )}
        {profile.warnings.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded px-3 py-2 space-y-1 text-rose-200">
            <div className="font-semibold text-[11px] uppercase tracking-wider text-rose-300">Active Notices &amp; Warnings</div>
            {profile.warnings.map((w, idx) => <div key={idx}>• {w}</div>)}
          </div>
        )}
      </section>

      <section className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2">
        <h3 className="font-display text-sm font-semibold text-slate-100">Credit &amp; Borrowing Decisions ({profile.decisionHistory.length})</h3>
        {profile.decisionHistory.length === 0 ? (
          <div className="text-slate-500 py-2">No loan applications or debt events recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/70 max-h-64 overflow-y-auto">
            {profile.decisionHistory.map((d) => (
              <div key={d.id} className="py-2.5 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100 capitalize">{d.action.replace(/_/g, ' ')}: {d.what}</span>
                  <span className="font-mono text-[11px] text-slate-400">{d.dateLabel}</span>
                </div>
                <div className="text-slate-300">Why: {d.why}</div>
                <div className="text-slate-400">How: {d.how}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
