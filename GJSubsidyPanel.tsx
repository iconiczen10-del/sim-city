// GJSubsidyPanel.tsx — GJ Electricity subsidy budget absorption, CEO mood & SimGod controls, and assessment log

import { ShieldCheck } from 'lucide-react';
import { formatDelta } from './formatters';
import { setGJSubsidyMood, setSimGodSubsidyControls } from './gjSubsidyActions';
import { GJSubsidyLogView } from './GJSubsidyLogView';
import type { GJSubsidyMood, SimGodSubsidyLevel } from './gjSubsidyTypes';
import type { CityState } from './types';

interface GJSubsidyPanelProps {
  city: CityState;
  onUpdateCity: (updater: (prev: CityState) => CityState) => void;
}

const MOODS: GJSubsidyMood[] = ['strict', 'balanced', 'generous'];
const SIMGOD_LEVELS: SimGodSubsidyLevel[] = ['auto', 'none', 'low', 'medium', 'high', 'full'];

export function GJSubsidyPanel({ city, onUpdateCity }: GJSubsidyPanelProps) {
  const el = city.electricity;
  if (!el) return null;

  const mood = el.subsidyMood ?? 'balanced';
  const moodOverride = el.simgodMoodOverride ?? null;
  const levelOverride = el.simgodLevelOverride ?? 'auto';

  return (
    <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-300" aria-hidden="true" />
          <h3 className="font-display text-sm font-semibold text-slate-100">Household Subsidies &amp; Outreach</h3>
        </div>
        <div className="font-mono tabular-nums text-[11px] text-slate-300">
          Month: <span className="text-emerald-300">{formatDelta(el.monthlySubsidyAbsorbed ?? 0)}</span> · Total Absorbed:{' '}
          <span className="text-amber-300">{formatDelta(el.totalSubsidyAbsorbed ?? 0)}</span> · Helped:{' '}
          <span className="text-slate-100">{el.householdsHelpedCount ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3 space-y-2">
          <div className="text-slate-300 font-medium">GJ CEO Subsidy Mood (Paid From GJ Cash)</div>
          <div className="grid grid-cols-3 gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onUpdateCity((p) => setGJSubsidyMood(p, m))}
                className={`min-h-[44px] sm:min-h-[34px] px-2.5 py-1.5 rounded border capitalize font-medium cursor-pointer ${
                  mood === m ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold' : 'bg-[#090d16] text-slate-300 border-slate-800 hover:border-slate-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3 space-y-2">
          <div className="text-slate-300 font-medium">SimGod Subsidy Overrides</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] text-slate-400 block">Mood Override</span>
              <select
                value={moodOverride ?? 'auto'}
                onChange={(e) => onUpdateCity((p) => setSimGodSubsidyControls(p, { moodOverride: e.target.value === 'auto' ? null : (e.target.value as GJSubsidyMood) }))}
                className="w-full min-h-[44px] sm:min-h-[34px] bg-[#090d16] border border-slate-800 rounded px-2 text-slate-200"
              >
                <option value="auto">Auto (CEO AI)</option>
                {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-slate-400 block">Relief Level</span>
              <select
                value={levelOverride}
                onChange={(e) => onUpdateCity((p) => setSimGodSubsidyControls(p, { levelOverride: e.target.value as SimGodSubsidyLevel }))}
                className="w-full min-h-[44px] sm:min-h-[34px] bg-[#090d16] border border-slate-800 rounded px-2 text-slate-200 capitalize"
              >
                {SIMGOD_LEVELS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
              </select>
            </label>
          </div>
        </div>
      </div>

      <GJSubsidyLogView log={el.subsidyLog ?? []} />
    </section>
  );
}
