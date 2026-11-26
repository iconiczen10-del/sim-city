// RecordsFilterBar.tsx — Filter toolbar for Simulation Records (category, subject, day range, search, jump-to-day)

import { Search } from 'lucide-react';
import { useState } from 'react';
import { ALL_RECORD_CATEGORIES, RECORD_CATEGORY_LABELS, type RecordCategory, type RecordsFilter } from './recordTypes';

export interface SubjectOption {
  id: string;
  label: string;
}

interface RecordsFilterBarProps {
  filter: RecordsFilter;
  onChangeFilter: (next: RecordsFilter) => void;
  hideSimGodTag?: boolean;
  hideSubjectFilter?: boolean;
  subjects?: SubjectOption[];
  showJumpToDay?: boolean;
  onJumpToDay?: (day: number) => void;
  maxDay?: number;
}

export function RecordsFilterBar({
  filter,
  onChangeFilter,
  hideSimGodTag,
  hideSubjectFilter,
  subjects,
  showJumpToDay,
  onJumpToDay,
  maxDay,
}: RecordsFilterBarProps) {
  const [jumpInput, setJumpInput] = useState('');
  const categories = ALL_RECORD_CATEGORIES.filter((c) => !(hideSimGodTag && c === 'simgod'));

  function handleJumpSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseInt(jumpInput.trim(), 10);
    if (Number.isFinite(parsed) && parsed >= 1 && onJumpToDay) {
      onJumpToDay(maxDay ? Math.min(maxDay, parsed) : parsed);
    }
  }

  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3 space-y-2.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[190px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            value={filter.query ?? ''}
            onChange={(e) => onChangeFilter({ ...filter, query: e.target.value })}
            placeholder="Search records text or details..."
            className="w-full bg-[#090d16] border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <select
          aria-label="Filter records by category"
          value={filter.category ?? 'all'}
          onChange={(e) => onChangeFilter({ ...filter, category: e.target.value as RecordCategory | 'all' })}
          className="bg-[#090d16] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500/60"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{RECORD_CATEGORY_LABELS[c]}</option>
          ))}
        </select>

        {!hideSubjectFilter && subjects && subjects.length > 0 && (
          <select
            aria-label="Filter records by subject"
            value={filter.subjectId ?? ''}
            onChange={(e) => onChangeFilter({ ...filter, subjectId: e.target.value || undefined })}
            className="bg-[#090d16] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 max-w-[190px] focus:outline-none focus:border-amber-500/60"
          >
            <option value="">All Citizens / Co / Houses</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>Day range:</span>
          <input
            type="number"
            min={1}
            placeholder="From"
            value={filter.dayFrom ?? ''}
            onChange={(e) => onChangeFilter({ ...filter, dayFrom: e.target.value ? Math.max(1, Number.parseInt(e.target.value, 10)) : undefined })}
            className="w-20 bg-[#090d16] border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono tabular-nums"
          />
          <span>–</span>
          <input
            type="number"
            min={1}
            placeholder="To"
            value={filter.dayTo ?? ''}
            onChange={(e) => onChangeFilter({ ...filter, dayTo: e.target.value ? Math.max(1, Number.parseInt(e.target.value, 10)) : undefined })}
            className="w-20 bg-[#090d16] border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono tabular-nums"
          />
          {(filter.query || (filter.category && filter.category !== 'all') || (!hideSubjectFilter && filter.subjectId) || filter.dayFrom || filter.dayTo) && (
            <button
              type="button"
              onClick={() => onChangeFilter({ hideSimGodTag: filter.hideSimGodTag, subjectId: hideSubjectFilter ? filter.subjectId : undefined, category: 'all' })}
              className="px-2 py-1 rounded border border-slate-700 text-slate-300 hover:text-amber-300 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {showJumpToDay && onJumpToDay && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={maxDay}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder={maxDay ? `Day (1–${maxDay})` : 'Day #'}
              aria-label="Jump to simulation day"
              className="w-28 bg-[#090d16] border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-100 font-mono tabular-nums"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] font-medium text-amber-300 hover:bg-slate-700 cursor-pointer"
            >
              Jump to Day
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
