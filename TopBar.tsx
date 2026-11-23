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
    <header className="min-h-14 shrink-0 border-b border-slate-800/90 bg-[#0d1320] px-3 py-2 sm:h-14 sm:px-6 sm:py-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6">
      <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:justify-start sm:gap-4">
        <span className="font-display shrink-0 whitespace-nowrap text-base font-semibold tracking-tight text-slate-50 sm:text-lg">
          {cityName}
        </span>
        <span className="h-4 w-px bg-slate-800 shrink-0" aria-hidden="true" />
        <div className="flex items-center gap-2 text-xs whitespace-nowrap shrink-0">
          <span className="hidden text-slate-400 sm:inline">Date</span>
          <span className="font-mono font-medium text-slate-100 tabular-nums">
            {formatSimDate(day, month, year)}
          </span>
        </div>
        <span className="h-4 w-px bg-slate-800 shrink-0" aria-hidden="true" />
        <span className="hidden shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-slate-400 lg:inline">
          City seed: <span className="text-slate-200">{seed}</span>
        </span>
      </div>

      <div
        className="order-2 flex w-full shrink-0 items-center justify-between gap-0.5 rounded-md border border-slate-800 bg-[#090d16] p-0.5 sm:order-none sm:w-auto sm:justify-start sm:gap-1 sm:p-1"
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
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium whitespace-nowrap transition-colors sm:gap-1.5 sm:px-3 sm:text-xs ${
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

      <div className="order-3 flex w-full shrink-0 items-center justify-between gap-3 sm:order-none sm:w-auto sm:gap-5">
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          <span className="text-slate-400 sm:inline">Treasury</span>
          <span className="font-mono font-semibold text-amber-300 tabular-nums">
            {formatDelta(treasury)}
          </span>
        </div>
        <span className="h-4 w-px bg-slate-800" aria-hidden="true" />
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          <span className="text-slate-400 sm:inline">Population</span>
          <span className="font-mono font-semibold text-slate-100 tabular-nums">
            {population}
          </span>
        </div>
      </div>
    </header>
  );
}
