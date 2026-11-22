// EventLogView.tsx — Searchable and type-filterable full simulation event history

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EVENT_CATEGORY_OPTIONS, EVENT_TYPE_COLORS } from './eventFilters';
import type { CityEvent, EventCategory } from './types';

interface EventLogViewProps {
  events: CityEvent[];
  onSelectCitizen: (citizenId: string) => void;
}

export function EventLogView({ events, onSelectCitizen }: EventLogViewProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((evt) => {
      if (typeFilter !== 'all' && evt.type !== typeFilter) return false;
      if (q) {
        const hay = `${evt.title} ${evt.detail} ${evt.citizenName ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, query, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events or citizen names..."
            className="w-full bg-[#090d16] border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Filter events by type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EventCategory | 'all')}
            className="bg-[#090d16] border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
          >
            {EVENT_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-0.5 bg-[#090d16] border border-slate-800 rounded-md">
            {(['all', 'board', 'death', 'stock-out', 'delivery'] as const).map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setTypeFilter(quick)}
                className={`px-2.5 py-1 text-xs rounded capitalize transition-colors cursor-pointer ${
                  typeFilter === quick
                    ? 'bg-slate-800 text-amber-300 font-medium'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {quick}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-400">
        Showing {filtered.length} of {events.length} logged events
      </div>

      <div className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No matching events recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((evt, idx) => (
              <div
                key={`${evt.id}_${idx}`}
                className="px-5 py-3 flex items-center justify-between gap-6 hover:bg-slate-800/25 transition-colors"
              >
                <div className="flex items-baseline gap-4 min-w-0">
                  <span className="font-mono text-xs text-slate-500 w-28 shrink-0">
                    {evt.dateLabel}
                  </span>
                  <span className={`text-xs font-medium capitalize w-20 shrink-0 ${EVENT_TYPE_COLORS[evt.type]}`}>
                    {evt.type}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-100 mr-2">
                      {evt.title}
                    </span>
                    <span className="text-xs text-slate-400">{evt.detail}</span>
                  </div>
                </div>

                {evt.citizenId && (
                  <button
                    type="button"
                    onClick={() => onSelectCitizen(evt.citizenId!)}
                    className="text-xs text-amber-300 hover:text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Inspect
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
