// recordsImport.ts — Safe import parser extracting city state, board meetings, and optional Simulation Records archive

import type { BoardMeeting } from './boardTypes';
import { resetRecordsStore } from './recordsStore';
import { ALL_RECORD_CATEGORIES, type RecordCategory, type SimRecordEntry } from './recordTypes';
import { clearAllDbData, parseImportedCityBundle, saveBoardMeetingToDb, saveCityToDb } from './storage';
import type { CityState } from './types';

const VALID_CATEGORIES = new Set<string>(ALL_RECORD_CATEGORIES);

function normalizeImportedRecord(raw: unknown, fallbackSeq: number): SimRecordEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SimRecordEntry>;
  if (typeof r.summary !== 'string' || typeof r.subjectId !== 'string') return null;
  const category: RecordCategory = typeof r.category === 'string' && VALID_CATEGORIES.has(r.category)
    ? (r.category as RecordCategory)
    : 'city';
  const seq = typeof r.seq === 'number' && Number.isFinite(r.seq) && r.seq > 0 ? Math.floor(r.seq) : fallbackSeq;
  const simDay = typeof r.simDay === 'number' && Number.isFinite(r.simDay) ? Math.floor(r.simDay) : 1;
  return {
    seq,
    id: typeof r.id === 'string' && r.id ? r.id : `rec_${seq}_${simDay}`,
    simDay,
    dateLabel: typeof r.dateLabel === 'string' ? r.dateLabel : `Day ${simDay}`,
    category,
    subType: typeof r.subType === 'string' ? r.subType : 'imported',
    subjectId: r.subjectId,
    subjectKind: r.subjectKind ?? 'city',
    subjectName: typeof r.subjectName === 'string' ? r.subjectName : r.subjectId,
    summary: r.summary,
    detail: r.detail && typeof r.detail === 'object' ? (r.detail as Record<string, unknown>) : {},
    ...(r.simgodMarked ? { simgodMarked: true } : {}),
  };
}

export function parseImportedBundleWithRecords(rawJson: string): {
  city: CityState;
  meetings: BoardMeeting[];
  records: SimRecordEntry[];
} {
  const { city, meetings } = parseImportedCityBundle(rawJson);
  const parsed = JSON.parse(rawJson) as { records?: unknown };
  if (!Array.isArray(parsed?.records)) {
    return { city, meetings, records: [] };
  }
  const records: SimRecordEntry[] = [];
  for (let i = 0; i < parsed.records.length; i += 1) {
    const norm = normalizeImportedRecord(parsed.records[i], i + 1);
    if (norm) records.push(norm);
  }
  records.sort((a, b) => a.seq - b.seq);
  return { city, meetings, records };
}

export async function persistImportedBundleFile(file: File): Promise<{
  city: CityState;
  meetings: BoardMeeting[];
  records: SimRecordEntry[];
}> {
  const bundle = parseImportedBundleWithRecords(await file.text());
  await clearAllDbData();
  await saveCityToDb(bundle.city);
  await Promise.all(bundle.meetings.map((m) => saveBoardMeetingToDb(m)));
  await resetRecordsStore(bundle.records);
  return bundle;
}
