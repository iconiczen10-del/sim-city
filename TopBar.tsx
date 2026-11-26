// TopBar.tsx — Responsive header: unchanged PC speed/stats layout (>= 640px) and compact phone bar (< 640px)

import { AlertTriangle, Clock, Pause, Play, Settings } from 'lucide-react';
import { formatDelta, formatSimDate } from './formatters';
import type { StorageQuotaStatus } from './recordTypes';
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
  runningBehind?: boolean;
  storageQuota?: StorageQuotaStatus | null;
  onOpenSettings?: () => void;
}

const PC_SPEEDS: { value: SimSpeed; label: string }[] = [
  { value: 0, label: 'Pause' }, { value: 1, label: '1x' }, { value: 2, label: '2x' },
  { value: 5, label: '5x' }, { value: 10, label: '10x' }, { value: 20, label: '20x' },
  { value: 30, label: '30x' }, { value: 40, label: '40x' }, { value: 50, label: '50x' },
];

const PHONE_SPEEDS: { value: SimSpeed; label: string }[] = [
  { value: 0, label: 'Pause' }, { value: 1, label: '1x' }, { value: 2, label: '2x' },
  { value: 5, label: '5x' }, { value: 10, label: '10x' }, { value: 20, label: '20x' },
  { value: 25, label: '25x' },
];

export function TopBar({
  cityName, seed, day, month, year, speed, onSpeedChange, treasury, population, runningBehind, storageQuota, onOpenSettings,
}: TopBarProps) {
  const dateStr = formatSimDate(day, month, year);
  return (
    <header className="shrink-0 border-b border-slate-800/90 bg-[#0d1320]">
      <div className="flex flex-col gap-2 px-3 py-2 sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <span className="font-display text-base font-semibold tracking-tight text-slate-50 truncate">{cityName}</span>
            <span className="font-mono text-[11px] text-slate-300 tabular-nums whitespace-nowrap">{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs font-semibold text-amber-300 tabular-nums whitespace-nowrap">{formatDelta(treasury)}</span>
            <span className="font-mono text-[11px] text-slate-300 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 whitespace-nowrap">
              {speed === 0 ? 'Pause' : `${speed}x`}
            </span>
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open settings"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-200 hover:text-amber-300 cursor-pointer"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex w-full items-center gap-1 overflow-x-auto rounded-md border border-slate-800 bg-[#090d16] p-1" role="group" aria-label="Simulation speed">
          {PHONE_SPEEDS.map((opt) => {
            const active = speed === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSpeedChange(opt.value)}
                className={`inline-flex min-h-[44px] min-w-[44px] flex-1 shrink-0 cursor-pointer items-center justify-center rounded px-1.5 text-xs font-medium whitespace-nowrap transition-colors ${active ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-slate-800/70'}`}
              >
                {opt.value === 0 ? <Pause className="w-3.5 h-3.5" aria-label="Pause" /> : <span>{opt.label}</span>}
              </button>
            );
          })}
        </div>
        {(runningBehind || storageQuota?.warning) && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {runningBehind && (
              <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-medium text-amber-200">
                <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />Running behind
              </span>
            )}
            {storageQuota?.warning && (
              <span className="inline-flex items-center gap-1 rounded border border-rose-500/50 bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-200">
                <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />Storage {storageQuota.usagePct}% full
              </span>
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:flex min-h-14 h-14 px-6 items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-display shrink-0 whitespace-nowrap text-lg font-semibold tracking-tight text-slate-50">{cityName}</span>
          <span className="h-4 w-px bg-slate-800 shrink-0" aria-hidden="true" />
          <div className="flex items-center gap-2 text-xs whitespace-nowrap shrink-0">
            <span className="text-slate-400">Date</span>
            <span className="font-mono font-medium text-slate-100 tabular-nums">{dateStr}</span>
          </div>
          <span className="h-4 w-px bg-slate-800 shrink-0" aria-hidden="true" />
          <span className="hidden shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-slate-400 xl:inline">
            City seed: <span className="text-slate-200">{seed}</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-md border border-slate-800 bg-[#090d16] p-1" role="group" aria-label="Simulation speed">
          {PC_SPEEDS.map((opt) => {
            const active = speed === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSpeedChange(opt.value)}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${active ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-slate-50 hover:bg-slate-800/70'}`}
              >
                {opt.value === 0 ? <Pause className="w-3 h-3" aria-hidden="true" /> : opt.value === 1 ? <Play className="w-3 h-3" aria-hidden="true" /> : null}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            <span className="text-slate-400">Treasury</span>
            <span className="font-mono font-semibold text-amber-300 tabular-nums">{formatDelta(treasury)}</span>
          </div>
          <span className="h-4 w-px bg-slate-800" aria-hidden="true" />
          <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            <span className="text-slate-400">Population</span>
            <span className="font-mono font-semibold text-slate-100 tabular-nums">{population}</span>
          </div>
          {runningBehind && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200 whitespace-nowrap">
              <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />Running behind
            </span>
          )}
          {storageQuota?.warning && (
            <span title="Browser storage quota is nearly full. No simulation records are ever deleted." className="inline-flex items-center gap-1 rounded border border-rose-500/50 bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-200 whitespace-nowrap">
              <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />Storage {storageQuota.usagePct}% full
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
