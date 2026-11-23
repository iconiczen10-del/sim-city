// CitizenOverviewStats.tsx — Top KPI strip showing savings, mood + top emotions, stress driver, health, and survival state

import { topDrivingEmotions } from './citizenEmotions';
import type { SurvivalState } from './citizenRealTypes';
import { formatDelta } from './formatters';
import type { Citizen } from './types';

interface CitizenOverviewStatsProps {
  citizen: Citizen;
}

const SURVIVAL_TONES: Record<SurvivalState, string> = {
  Thriving: 'text-emerald-300',
  Stable: 'text-sky-300',
  Struggling: 'text-amber-300',
  Critical: 'text-orange-300',
  Desperate: 'text-rose-300',
};

export function CitizenOverviewStats({ citizen }: CitizenOverviewStatsProps) {
  const topEmotions = citizen.emotions ? topDrivingEmotions(citizen.emotions, 2) : [];
  const emotionSub = topEmotions.length > 0
    ? topEmotions.map((e) => `${e.label} ${e.value > 0 ? `+${Math.round(e.value)}` : Math.round(e.value)}`).join(' · ')
    : 'Steady baseline';

  const topStress = [...citizen.stressBreakdown]
    .filter((f) => f.value > 0)
    .sort((a, b) => b.value - a.value)[0];
  const stressSub = topStress ? `${topStress.label} (+${topStress.value.toFixed(0)})` : 'Low strain';

  const phys = Math.round(citizen.healthProfile?.physical ?? citizen.health);
  const mental = Math.round(citizen.healthProfile?.mental ?? 75);
  const worstHealth = Math.min(phys, mental);
  const healthSub = phys <= mental ? `Phys ${phys} · Mental ${mental}` : `Mental ${mental} · Phys ${phys}`;
  const state = citizen.survivalState ?? 'Stable';

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-3 py-2.5">
        <div className="text-[11px] text-slate-400">Savings</div>
        <div className="font-mono tabular-nums text-base font-semibold text-slate-100 mt-0.5">{formatDelta(citizen.savings)}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">Arrears {formatDelta(citizen.rentArrears)}</div>
      </div>

      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-3 py-2.5">
        <div className="text-[11px] text-slate-400">Mood</div>
        <div className="font-mono tabular-nums text-base font-semibold text-slate-100 mt-0.5">{Math.round(citizen.mood)} / 100</div>
        <div className="text-[11px] text-slate-400 truncate mt-0.5">{emotionSub}</div>
      </div>

      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-3 py-2.5">
        <div className="text-[11px] text-slate-400">Stress</div>
        <div className="font-mono tabular-nums text-base font-semibold text-slate-100 mt-0.5">{Math.round(citizen.stress)} / 100</div>
        <div className="text-[11px] text-slate-400 truncate mt-0.5">{stressSub}</div>
      </div>

      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-3 py-2.5">
        <div className="text-[11px] text-slate-400">Health (Worst)</div>
        <div className={`font-mono tabular-nums text-base font-semibold mt-0.5 ${worstHealth < 25 ? 'text-rose-300' : 'text-slate-100'}`}>
          {worstHealth} / 100
        </div>
        <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">{healthSub}</div>
      </div>

      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-3 py-2.5">
        <div className="text-[11px] text-slate-400">Survival State</div>
        <div className={`text-base font-semibold mt-0.5 ${SURVIVAL_TONES[state]}`}>{state}</div>
        <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">Instinct {Math.round(citizen.traits.survivalInstinct)}</div>
      </div>

      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-3 py-2.5">
        <div className="text-[11px] text-slate-400">Status / Respect</div>
        <div className="font-mono tabular-nums text-base font-semibold text-slate-100 mt-0.5">{citizen.statusScore.toFixed(1)}</div>
        <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">Respect {citizen.respect.toFixed(0)} / 100</div>
      </div>
    </div>
  );
}
