// BoardHistoryPanel.tsx — Filterable Vij Industries board meeting archive with unread indicators

import type { BoardMeeting } from './boardTypes';
import { formatDelta } from './formatters';

export type MeetingFilter = 'all' | 'regular' | 'emergency' | 'unread';

interface BoardHistoryPanelProps {
  meetings: BoardMeeting[];
  selectedId: string | null;
  filter: MeetingFilter;
  onFilterChange: (f: MeetingFilter) => void;
  onSelectMeeting: (meeting: BoardMeeting) => void;
}

export function BoardHistoryPanel({
  meetings,
  selectedId,
  filter,
  onFilterChange,
  onSelectMeeting,
}: BoardHistoryPanelProps) {
  const filtered = meetings.filter((m) => {
    if (filter === 'regular') return m.kind === 'regular';
    if (filter === 'emergency') return m.kind === 'emergency';
    if (filter === 'unread') return !m.read;
    return true;
  });

  return (
    <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-200">
          Past Board Meetings <span className="font-mono text-slate-400">({meetings.length})</span>
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-[#090d16] border border-slate-800 rounded-md">
          {(['all', 'regular', 'emergency', 'unread'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onFilterChange(opt)}
              className={`px-2.5 py-1 text-[11px] rounded capitalize cursor-pointer ${
                filter === opt ? 'bg-slate-800 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded">
          No board meetings match this filter yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/70 max-h-60 overflow-y-auto">
          {filtered.map((m) => {
            const active = m.id === selectedId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMeeting(m)}
                className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                  active ? 'bg-slate-800/70' : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${m.read ? 'bg-slate-700' : 'bg-amber-400'}`}
                    aria-label={m.read ? 'Read' : 'Unread'}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-100 truncate">
                      {m.chosenLabel}
                      <span className={`ml-2 font-mono text-[10px] uppercase ${m.kind === 'emergency' ? 'text-rose-300' : 'text-slate-400'}`}>
                        {m.kind}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{m.outcomeSummary}</div>
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] shrink-0 tabular-nums">
                  <div className="text-slate-300">{m.dateLabel}</div>
                  <div className={m.cashAtEnd < 0 ? 'text-rose-300' : 'text-slate-400'}>Cash {formatDelta(m.cashAtEnd)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
