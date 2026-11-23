// CitizenHealthTab.tsx — Display 4-part citizen health (Physical, Mental, Immunity, Fitness) and active conditions

import type { Citizen } from './types';

interface CitizenHealthTabProps {
  citizen: Citizen;
  currentDay: number;
}

function healthColor(val: number): string {
  if (val >= 70) return 'bg-emerald-400';
  if (val >= 45) return 'bg-sky-400';
  if (val >= 25) return 'bg-amber-400';
  return 'bg-rose-500';
}

export function CitizenHealthTab({ citizen, currentDay }: CitizenHealthTabProps) {
  const hp = citizen.healthProfile;
  const parts = [
    { label: 'Physical Health', value: hp?.physical ?? citizen.health, note: 'Driven by hydration, nutrition, shelter, and illness exposure' },
    { label: 'Mental Health', value: hp?.mental ?? 75, note: 'Drained by sustained stress, loneliness, layoffs, rent arrears, and social backlash' },
    { label: 'Immunity', value: hp?.immunity ?? 65, note: 'Lowers sickness risk; sustained by clean hygiene, shelter, and nutrition' },
    { label: 'Fitness', value: hp?.fitness ?? 55, note: 'Boosted by physical Entry/Staff labor; improves recovery speed' },
  ];

  const breakdownLeft = hp?.breakdownUntilDay && hp.breakdownUntilDay >= currentDay ? hp.breakdownUntilDay - currentDay + 1 : 0;
  const illnessLeft = hp?.illnessDaysLeft && hp.illnessDaysLeft > 0 ? hp.illnessDaysLeft : 0;

  return (
    <div className="space-y-4 text-xs">
      {(breakdownLeft > 0 || illnessLeft > 0) && (
        <div className="bg-[#0c1220] border border-rose-500/40 rounded-md p-4 space-y-1.5">
          <div className="font-semibold text-rose-300">Active Health Conditions</div>
          {breakdownLeft > 0 && (
            <div className="text-slate-200">
              Mental Breakdown — Unable to perform work effectively for <span className="font-mono tabular-nums text-rose-300">{breakdownLeft}d</span> more.
            </div>
          )}
          {illnessLeft > 0 && (
            <div className="text-slate-200">
              Illness: <span className="text-amber-300 font-medium">{hp?.illnessName ?? 'Seasonal Fever'}</span> —{' '}
              <span className="font-mono tabular-nums text-amber-300">{illnessLeft}d</span> remaining.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parts.map((part) => {
          const val = Math.round(part.value);
          return (
            <div key={part.label} className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100">{part.label}</span>
                <span className={`font-mono tabular-nums font-semibold ${val < 25 ? 'text-rose-300' : 'text-slate-100'}`}>
                  {val} / 100
                </span>
              </div>
              <div className="h-2.5 bg-slate-900 rounded overflow-hidden border border-slate-800/70">
                <div className={`h-full transition-all ${healthColor(val)}`} style={{ width: `${val}%` }} />
              </div>
              <div className="text-[11px] text-slate-400 leading-relaxed">{part.note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
