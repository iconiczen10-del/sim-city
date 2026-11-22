// MartManagerCard.tsx — Floor Manager NPC summary card with profile link and confirmed SimGod fire button

import { UserX } from 'lucide-react';
import { TIER_STYLES } from './formatters';
import type { Citizen } from './types';

interface MartManagerCardProps {
  manager: Citizen | null;
  performance: number;
  lowPerfMonths: number;
  panicFreezeDays: number;
  onSelectCitizen: (citizenId: string) => void;
  onFireManager: () => void;
}

export function MartManagerCard({
  manager,
  performance,
  lowPerfMonths,
  panicFreezeDays,
  onSelectCitizen,
  onFireManager,
}: MartManagerCardProps) {
  if (!manager) {
    return (
      <div className="bg-[#111827] border border-amber-500/30 rounded-lg p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-amber-300">Floor Manager Vacant — Fallback AI Active</div>
          <div className="text-xs text-slate-400 mt-0.5">
            No Team Lead is currently managing Vij Mart day-to-day. Baseline AI rules apply until the Job Market fills the seat.
          </div>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
          Baseline AI
        </span>
      </div>
    );
  }

  const perfColor = performance >= 60 ? 'text-emerald-300' : performance >= 30 ? 'text-amber-300' : 'text-rose-400';

  return (
    <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={() => onSelectCitizen(manager.id)}
        className="flex-1 text-left flex items-center gap-4 hover:bg-slate-800/30 p-2 -m-2 rounded-md transition-colors cursor-pointer min-w-0"
      >
        <div className={`w-11 h-11 rounded-md border flex items-center justify-center font-mono text-sm font-bold shrink-0 ${TIER_STYLES[manager.tier].badge}`}>
          {manager.tier}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-sm font-semibold text-slate-100">{manager.name}</span>
            <span className="font-mono text-[11px] text-teal-300">Floor Manager (Team Lead)</span>
            {panicFreezeDays > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Panic Freeze {panicFreezeDays}d
              </span>
            )}
            {lowPerfMonths > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Warning {lowPerfMonths}/2mo
              </span>
            )}
          </div>
          <div className="grid grid-cols-7 gap-2 mt-2 text-[11px] font-mono">
            <div><span className="text-slate-500">Skill</span> <span className="text-slate-200">{manager.skill}</span></div>
            <div><span className="text-slate-500">Disc</span> <span className="text-slate-200">{manager.traits.discipline}</span></div>
            <div><span className="text-slate-500">Greed</span> <span className="text-slate-200">{manager.traits.greed}</span></div>
            <div><span className="text-slate-500">Mood</span> <span className="text-slate-200">{Math.round(manager.mood)}</span></div>
            <div><span className="text-slate-500">Stress</span> <span className="text-slate-200">{Math.round(manager.stress)}</span></div>
            <div><span className="text-slate-500">Perf</span> <span className={perfColor}>{Math.round(performance)}</span></div>
            <div><span className="text-slate-500">Tenure</span> <span className="text-slate-200">{manager.tenureMonths}mo</span></div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={onFireManager}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-medium shrink-0 cursor-pointer"
      >
        <UserX className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Fire Manager</span>
      </button>
    </div>
  );
}
