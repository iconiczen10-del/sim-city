// CitizenCard.tsx — Citizen card showing active survival/stress icons, savings, mood, or memorial

import { Droplets, Flame, HeartPulse, UtensilsCrossed } from 'lucide-react';
import { DEATH_CAUSE_LABELS, formatDelta, TIER_STYLES } from './formatters';
import type { Citizen } from './types';

interface CitizenCardProps {
  citizen: Citizen;
  onSelect: (citizenId: string) => void;
}

export function CitizenCard({ citizen, onSelect }: CitizenCardProps) {
  const tierStyle = TIER_STYLES[citizen.tier];
  const moodRounded = Math.round(citizen.mood);
  const moodBarColor = moodRounded >= 65 ? 'bg-emerald-500' : moodRounded >= 35 ? 'bg-amber-500' : 'bg-rose-500';

  if (!citizen.alive) {
    return (
      <button type="button" onClick={() => onSelect(citizen.id)} className="text-left bg-[#0e1421] border border-slate-800/70 hover:border-slate-600 rounded-lg p-4 transition-colors cursor-pointer flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-300 truncate">{citizen.name}</div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">Former {citizen.previousRole ?? citizen.roleLevel}</div>
          </div>
          <span className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${tierStyle.badge}`}>{citizen.tier}</span>
        </div>
        <div className="pt-2 border-t border-slate-800/60 text-xs text-slate-400 space-y-1">
          <div className="text-rose-300 font-medium">{citizen.deathCause ? DEATH_CAUSE_LABELS[citizen.deathCause] : 'Deceased'}</div>
          <div className="font-mono text-[11px] text-slate-500">{citizen.deathDate ?? 'Recorded'}</div>
        </div>
      </button>
    );
  }

  const isHungry = citizen.hunger < 35;
  const isThirsty = citizen.thirst < 35;
  const isStressed = citizen.stress >= 60;
  const isSick = citizen.health < 65;

  return (
    <button type="button" onClick={() => onSelect(citizen.id)} className="text-left bg-[#111827] border border-slate-800/90 hover:border-slate-600 rounded-lg p-4 transition-colors cursor-pointer flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-100 truncate">{citizen.name}</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">{citizen.roleLevel}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isHungry && <span title="Hungry"><UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" aria-label="Hungry" /></span>}
          {isThirsty && <span title="Thirsty"><Droplets className="w-3.5 h-3.5 text-sky-400" aria-label="Thirsty" /></span>}
          {isStressed && <span title="Stressed"><Flame className="w-3.5 h-3.5 text-orange-400" aria-label="Stressed" /></span>}
          {isSick && <span title="Sick"><HeartPulse className="w-3.5 h-3.5 text-rose-400" aria-label="Sick" /></span>}
          <span className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border ${tierStyle.badge}`}>{citizen.tier}</span>
        </div>
      </div>

      <div className="space-y-2 pt-1 border-t border-slate-800/70">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Savings</span>
          <span className="font-mono font-semibold text-slate-100">{formatDelta(citizen.savings)}</span>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400">Mood · Stress</span>
            <span className="font-mono text-slate-300">{moodRounded} · {Math.round(citizen.stress)}</span>
          </div>
          <div className="h-1.5 w-full rounded-sm bg-slate-900 overflow-hidden">
            <div className={`h-full ${moodBarColor} transition-all duration-300`} style={{ width: `${moodRounded}%` }} />
          </div>
        </div>
      </div>
    </button>
  );
}
