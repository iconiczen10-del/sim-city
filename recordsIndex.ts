// recordsIndex.ts — Lightweight in-memory RecordsIndex initialization and incremental entry indexing

import { ALL_RECORD_CATEGORIES, type RecordCategory, type RecordsIndex, type SimRecordEntry } from './recordTypes';

export function emptyRecordsIndex(): RecordsIndex {
  const byCategory = {} as Record<RecordCategory, number>;
  for (const cat of ALL_RECORD_CATEGORIES) byCategory[cat] = 0;
  return { totalCount: 0, nextSeq: 1, byCategory, bySubject: {}, byDay: {} };
}

export function indexRecordEntry(indexState: RecordsIndex, entry: SimRecordEntry): void {
  indexState.totalCount += 1;
  indexState.nextSeq = Math.max(indexState.nextSeq, entry.seq + 1);
  indexState.byCategory[entry.category] = (indexState.byCategory[entry.category] ?? 0) + 1;
  indexState.bySubject[entry.subjectId] = (indexState.bySubject[entry.subjectId] ?? 0) + 1;
  const day = indexState.byDay[entry.simDay];
  if (!day) {
    indexState.byDay[entry.simDay] = { minSeq: entry.seq, maxSeq: entry.seq, count: 1 };
    return;
  }
  day.minSeq = Math.min(day.minSeq, entry.seq);
  day.maxSeq = Math.max(day.maxSeq, entry.seq);
  day.count += 1;
}
