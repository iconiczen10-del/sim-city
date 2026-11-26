// MobileTierMovementView.tsx — Uncapped newest-first tier movement log paged cleanly for mobile screens

import { ArrowDownRight, ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { queryRecordsPage } from './recordsQuery';
import type { RecordsPageResult, SimRecordEntry } from './recordTypes';
import type { CityState } from './types';

interface MobileTierMovementViewProps {
  city: CityState;
  onBack: () => void;
  onSelectCitizen: (citizenId: string) => void;
}

const PAGE_SIZE = 12;

export function MobileTierMovementView({ city, onBack, onSelectCitizen }: MobileTierMovementViewProps) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<RecordsPageResult>({ items: [], totalMatched: 0, page: 1, totalPages: 1 });

  useEffect(() => {
    let active = true;
    queryRecordsPage({ category: 'citizens', subType: 'tier_movement' }, page, PAGE_SIZE).then((res) => {
      if (active) setResult(res);
    });
    return () => { active = false; };
  }, [page, city.totalDays]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-800 bg-[#111827] px-3 text-xs font-medium text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Settings</span>
        </button>
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          {result.totalMatched.toLocaleString('en-IN')} total shifts
        </span>
      </div>

      <div>
        <h2 className="font-display text-base font-semibold text-slate-50">Tier Movement History</h2>
        <p className="text-xs text-slate-400 mt-0.5">Every citizen tier promotion and demotion, newest first.</p>
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-[#111827] px-4 py-10 text-center text-xs text-slate-400">
          No tier changes recorded yet. Tier reviews happen at each month end.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-[#111827]">
          {result.items.map((entry: SimRecordEntry) => {
            const d = entry.detail as {
              citizenId?: string;
              citizenName?: string;
              fromTier?: string;
              toTier?: string;
              direction?: string;
              reason?: string;
              day?: number;
            };
            const citizenId = d.citizenId ?? entry.subjectId;
            const citizenName = d.citizenName ?? entry.subjectName;
            const isUp = d.direction === 'up';
            return (
              <button
                key={entry.seq}
                type="button"
                onClick={() => onSelectCitizen(citizenId)}
                className="w-full min-h-[56px] px-4 py-3 text-left hover:bg-slate-800/40 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100 truncate">{citizenName}</div>
                    <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                      Day {d.day ?? entry.simDay} · {entry.dateLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs shrink-0">
                    <span className="text-slate-400">{d.fromTier ?? '—'}</span>
                    {isUp ? (
                      <ArrowUpRight className="size-3.5 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="size-3.5 text-rose-400" aria-hidden="true" />
                    )}
                    <span className={isUp ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                      {d.toTier ?? '—'}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">{d.reason ?? entry.summary}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          type="button"
          disabled={result.page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-slate-800 bg-[#111827] px-3 text-slate-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span>Previous</span>
        </button>
        <span className="font-mono text-slate-400 tabular-nums">
          Page {result.page} / {result.totalPages}
        </span>
        <button
          type="button"
          disabled={result.page >= result.totalPages}
          onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-slate-800 bg-[#111827] px-3 text-slate-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <span>Next</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
