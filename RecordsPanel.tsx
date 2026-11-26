// RecordsPanel.tsx — Cursor-paged simulation record viewer rendering only visible entries (2 or 3 per page)

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RecordRowCard } from './RecordRowCard';
import { RecordsFilterBar, type SubjectOption } from './RecordsFilterBar';
import { queryRecordsPage } from './recordsQuery';
import { getRecordsIndex } from './recordsStore';
import type { RecordsFilter, RecordsPageResult, SimRecordEntry } from './recordTypes';

interface RecordsPanelProps {
  pageSize: number;
  title?: string;
  fixedSubjectId?: string;
  hideSimGodTag?: boolean;
  showJumpToDay?: boolean;
  subjects?: SubjectOption[];
  refreshKey?: number;
  maxDay?: number;
  onSelectCitizen?: (id: string) => void;
}

export function RecordsPanel({
  pageSize,
  title,
  fixedSubjectId,
  hideSimGodTag,
  showJumpToDay,
  subjects,
  refreshKey,
  maxDay,
  onSelectCitizen,
}: RecordsPanelProps) {
  const [filter, setFilter] = useState<RecordsFilter>({ category: 'all', subjectId: fixedSubjectId, hideSimGodTag });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<RecordsPageResult>({ items: [], totalMatched: 0, page: 1, totalPages: 1 });
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null);

  useEffect(() => {
    setFilter((prev) => ({ ...prev, subjectId: fixedSubjectId ?? prev.subjectId, hideSimGodTag }));
    setPage(1);
  }, [fixedSubjectId, hideSimGodTag]);

  useEffect(() => {
    let active = true;
    const effectiveFilter: RecordsFilter = { ...filter, subjectId: fixedSubjectId ?? filter.subjectId, hideSimGodTag };
    queryRecordsPage(effectiveFilter, page, pageSize).then((res) => {
      if (active) setResult(res);
    });
    return () => { active = false; };
  }, [filter, fixedSubjectId, hideSimGodTag, page, pageSize, refreshKey]);

  function handleChangeFilter(next: RecordsFilter) {
    setFilter(next);
    setPage(1);
    setExpandedSeq(null);
  }

  function handleJumpToDay(targetDay: number) {
    const idx = getRecordsIndex();
    const isUnfiltered = (!filter.category || filter.category === 'all') && !filter.query && !filter.subjectId && !fixedSubjectId && !filter.dayFrom && !filter.dayTo && !hideSimGodTag;
    if (isUnfiltered) {
      let newer = 0;
      for (const [dayStr, stats] of Object.entries(idx.byDay)) {
        if (Number(dayStr) > targetDay) newer += stats.count;
      }
      setPage(Math.floor(newer / pageSize) + 1);
      return;
    }
    setFilter((prev) => ({ ...prev, dayTo: targetDay }));
    setPage(1);
  }

  return (
    <div className="space-y-3 text-xs">
      {title && <div className="font-display text-sm font-semibold text-slate-100">{title}</div>}

      <RecordsFilterBar
        filter={filter}
        onChangeFilter={handleChangeFilter}
        hideSimGodTag={hideSimGodTag}
        hideSubjectFilter={Boolean(fixedSubjectId)}
        subjects={subjects}
        showJumpToDay={showJumpToDay}
        onJumpToDay={handleJumpToDay}
        maxDay={maxDay}
      />

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>Showing {result.items.length} of {result.totalMatched.toLocaleString('en-IN')} matching records ({pageSize}/page)</span>
        <span className="font-mono tabular-nums">Page {result.page} / {result.totalPages}</span>
      </div>

      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md divide-y divide-slate-800/70 overflow-hidden">
        {result.items.length === 0 ? (
          <div className="py-10 text-center text-slate-500">No simulation records match the current filter.</div>
        ) : (
          result.items.map((entry: SimRecordEntry) => (
            <RecordRowCard
              key={entry.seq}
              entry={entry}
              isOpen={expandedSeq === entry.seq}
              hideSimGodTag={hideSimGodTag}
              onToggle={() => setExpandedSeq(expandedSeq === entry.seq ? null : entry.seq)}
              onSelectCitizen={onSelectCitizen}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          disabled={result.page <= 1}
          onClick={() => { setPage((p) => Math.max(1, p - 1)); setExpandedSeq(null); }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-800 bg-[#0c1220] text-slate-200 disabled:opacity-40 hover:border-slate-700 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /><span>Previous</span>
        </button>
        <span className="font-mono text-[11px] text-slate-400 tabular-nums">Page {result.page} of {result.totalPages}</span>
        <button
          type="button"
          disabled={result.page >= result.totalPages}
          onClick={() => { setPage((p) => Math.min(result.totalPages, p + 1)); setExpandedSeq(null); }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-800 bg-[#0c1220] text-slate-200 disabled:opacity-40 hover:border-slate-700 cursor-pointer disabled:cursor-not-allowed"
        >
          <span>Next</span><ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
