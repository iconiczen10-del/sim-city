// CitizenMemoryTab.tsx — Displays citizen memories, weights, fade progress, and decision links

import { MEMORY_KIND_LABELS } from './citizenInspectorLabels';
import type { Citizen } from './types';

interface CitizenMemoryTabProps {
  citizen: Citizen;
  currentTotalDay: number;
  onJumpToDecision: (decisionId: string) => void;
}

export function CitizenMemoryTab({ citizen, currentTotalDay, onJumpToDecision }: CitizenMemoryTabProps) {
  const decMap = new Map(citizen.decisions.map((d) => [d.id, d]));

  if (citizen.memories.length === 0) {
    return (
      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md py-12 text-center text-xs text-slate-400">
        {citizen.name} has no strong lingering memories yet. Stock-outs, losses, gifts, price shocks, or hardships create lasting memories.
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between bg-[#0c1220] border border-slate-800/80 rounded-md px-4 py-2.5">
        <span className="text-slate-300">Active Memories: <span className="font-mono text-slate-100 font-semibold">{citizen.memories.length}</span></span>
        <span className="text-slate-400">
          Post-loss caution: <span className="font-mono text-amber-300">{citizen.stockoutMemoryDays}d</span> · Gift shield:{' '}
          <span className="font-mono text-emerald-300">{citizen.giftShieldDays}d</span>
        </span>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {citizen.memories.map((m) => {
          const absInit = Math.max(1, Math.abs(m.initialWeight));
          const remainingPct = Math.max(0, Math.min(100, Math.round((Math.abs(m.currentWeight) / absInit) * 100)));
          const fadedPct = 100 - remainingPct;
          const age = Math.max(0, currentTotalDay - m.totalDay);
          const positive = m.currentWeight >= 0;

          return (
            <div key={m.id} className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`font-mono font-semibold mr-2 ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {positive ? `+${m.currentWeight.toFixed(1)}` : m.currentWeight.toFixed(1)}
                  </span>
                  <span className="text-slate-100 font-medium">{m.summary}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 shrink-0">
                  {MEMORY_KIND_LABELS[m.kind]} · {m.dateLabel} ({age}d ago)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 shrink-0">Faded {fadedPct}% (was {m.initialWeight > 0 ? `+${m.initialWeight}` : m.initialWeight})</span>
                <div className="flex-1 h-1.5 bg-slate-900 rounded-sm overflow-hidden">
                  <div className={`h-full ${positive ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${remainingPct}%` }} />
                </div>
              </div>

              {m.linkedDecisionIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500">Influenced:</span>
                  {m.linkedDecisionIds.map((did) => {
                    const dec = decMap.get(did);
                    return (
                      <button
                        key={did}
                        type="button"
                        onClick={() => onJumpToDecision(did)}
                        className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 hover:bg-amber-500/20 cursor-pointer"
                      >
                        {dec ? `${dec.title} (${dec.dateLabel})` : 'View Decision'}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
