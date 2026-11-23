// CitizenNeedsTab.tsx — Display all 8 citizen needs, drain rates, last restored day, and survival priority ladder

import type { NeedId, SurvivalState } from './citizenRealTypes';
import type { Citizen } from './types';

interface CitizenNeedsTabProps {
  citizen: Citizen;
  currentDay: number;
}

const NEED_ORDER: NeedId[] = ['thirst', 'hunger', 'energy', 'hygiene', 'shelter', 'safety', 'social', 'fun'];

const STATE_TONE: Record<SurvivalState, string> = {
  Thriving: 'text-emerald-300',
  Stable: 'text-sky-300',
  Struggling: 'text-amber-300',
  Critical: 'text-orange-300',
  Desperate: 'text-rose-300',
};

function needBarClass(val: number): string {
  if (val >= 65) return 'bg-emerald-400';
  if (val >= 38) return 'bg-sky-400';
  if (val >= 20) return 'bg-amber-400';
  return 'bg-rose-500';
}

export function CitizenNeedsTab({ citizen, currentDay }: CitizenNeedsTabProps) {
  const needs = citizen.needs;
  const ladder = citizen.survivalPriority ?? [];
  const state = citizen.survivalState ?? 'Stable';

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-slate-400">Survival State: </span>
          <span className={`font-semibold ${STATE_TONE[state]}`}>{state}</span>
          <span className="text-slate-500 mx-2">·</span>
          <span className="text-slate-400">Survival Instinct: </span>
          <span className="font-mono tabular-nums text-slate-200">{Math.round(citizen.traits.survivalInstinct)} / 100</span>
        </div>
        <div className="text-slate-400 font-mono tabular-nums">
          Bath Water Debt: {(citizen.bathWaterDebt ?? 0).toFixed(2)} units
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {NEED_ORDER.map((id) => {
          const n = needs?.[id];
          if (!n) return null;
          const val = Math.round(n.value);
          const daysAgo = Math.max(0, currentDay - n.lastRestoredDay);
          return (
            <div key={id} className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-100">{n.name}</span>
                <span className={`font-mono tabular-nums font-semibold ${val < 25 ? 'text-rose-300' : 'text-slate-100'}`}>
                  {val} / 100
                </span>
              </div>
              <div className="h-2 bg-slate-900 rounded overflow-hidden border border-slate-800/70">
                <div className={`h-full transition-all ${needBarClass(val)}`} style={{ width: `${val}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                <span>Drain: -{n.drainRate.toFixed(1)}/day</span>
                <span>{daysAgo === 0 ? 'Restored today' : `Last restored ${daysAgo}d ago`}</span>
              </div>
            </div>
          );
        })}
      </div>

      {ladder.length > 0 && (
        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2.5">
          <div className="font-semibold text-slate-200">Current Survival Priority Ladder</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ladder.map((item, idx) => (
              <div key={item.needId} className="bg-[#090d16] border border-slate-800/80 rounded px-2.5 py-2 flex items-center justify-between">
                <span className="text-slate-300">
                  <span className="font-mono text-slate-500 mr-1.5">#{idx + 1}</span>
                  {item.name}
                </span>
                <span className="font-mono tabular-nums text-[11px] text-amber-300">{item.amplifiedUrgency}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
