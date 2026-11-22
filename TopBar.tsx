// TopBar.tsx — Control-room header with city name, seed, date, speed controls, treasury, and population

import { Pause, Play } from 'lucide-react';
import { formatDelta, formatSimDate } from './formatters';
import type { SimSpeed } from './types';

interface TopBarProps {
  cityName: string;
  seed: number;
  day: number;
  month: number;
  year: number;
  speed: SimSpeed;
  onSpeedChange: (speed: SimSpeed) => void;
  treasury: number;
  population: number;
}

const SPEED_OPTIONS: { value: SimSpeed; label: string }[] = [
  { value: 0, label: 'Pause' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 5, label: '5x' },
  { value: 10, label: '10x' },
  { value: 20, label: '20x' },
];

export function TopBar({
  cityName,
  seed,
  day,
  month,
  year,
  speed,
  onSpeedChange,
  treasury,
  population,
}: TopBarProps) {
  return (
    <header className="h-14 shrink-0 border-b border-slate-800/90 bg-[#0d1320] px-6 flex items-center justify-between gap-6">
      <div className="flex items-center gap-4 min-w-0">
        <span className="font-display text-lg font-semibold tracking-tight text-slate-50 whitespace-nowrap shrink-0">
          {cityName}
        </span>
        <span className="h-4 w-px bg-slate-800 shrink-0" aria-hidden="true" />
        <div className="flex items-center gap-2 text-xs whitespace-nowrap shrink-0">
          <span className="text-slate-400">Date</span>
          <span className="font-mono font-medium text-slate-100 tabular-nums">
            {formatSimDate(day, month, year)}
          </span>
        </div>
        <span className="h-4 w-px bg-slate-800 shrink-0" aria-hidden="true" />
        <span className="font-mono text-xs text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
          City seed: <span className="text-slate-200">{seed}</span>
        </span>
      </div>

      <div
        className="flex items-center gap-1 p-1 bg-[#090d16] border border-slate-800 rounded-md shrink-0"
        role="group"
        aria-label="Simulation speed"
      >
        {SPEED_OPTIONS.map((opt) => {
          const active = speed === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSpeedChange(opt.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-slate-50 hover:bg-slate-800/70'
              }`}
            >
              {opt.value === 0 ? (
                <Pause className="w-3 h-3" aria-hidden="true" />
              ) : opt.value === 1 ? (
                <Play className="w-3 h-3" aria-hidden="true" />
              ) : null}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-5 shrink-0">
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          <span className="text-slate-400">Treasury</span>
          <span className="font-mono font-semibold text-amber-300 tabular-nums">
            {formatDelta(treasury)}
          </span>
        </div>
        <span className="h-4 w-px bg-slate-800" aria-hidden="true" />
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          <span className="text-slate-400">Population</span>
          <span className="font-mono font-semibold text-slate-100 tabular-nums">
            {population}
          </span>
        </div>
      </div>
    </header>
  );
}
