// recordsStore.ts — Append-only batch buffer, lightweight index tracker, and non-IDB fallback store

import { idbClearRecords, idbPutRecordsBatch, openVijDb, RECORDS_STORE } from './idbHelpers';
import { emptyRecordsIndex, indexRecordEntry } from './recordsIndex';
import {
  forwardMainThreadRecord,
  getRecordsWorkerRpc,
  getSyncedRecordsIndex,
  setSyncedRecordsIndex,
} from './recordsWorkerBridge';
import type { RecordCategory, RecordsIndex, RecordSubjectKind, SimRecordEntry } from './recordTypes';

export const RECORDS_BATCH_SIZE = 50;

let indexState: RecordsIndex = emptyRecordsIndex();
let pendingQueue: SimRecordEntry[] = [];
let memoryFallback: SimRecordEntry[] = [];
let inFlightFlush: Promise<void> = Promise.resolve();
let initialized = false;

export const getRecordsIndex = (): RecordsIndex => getSyncedRecordsIndex() ?? indexState;
export const getPendingQueue = (): SimRecordEntry[] => pendingQueue;
export const getMemoryFallbackRecords = (): SimRecordEntry[] => memoryFallback;
export const awaitPendingFlush = (): Promise<void> => inFlightFlush;
export const hasIndexedDb = (): boolean => typeof indexedDB !== 'undefined';

export async function initRecordsStore(): Promise<RecordsIndex> {
  if (initialized) return indexState;
  indexState = emptyRecordsIndex();
  if (!hasIndexedDb()) {
    for (const e of memoryFallback) indexRecordEntry(indexState, e);
    initialized = true;
    return indexState;
  }
  try {
    const db = await openVijDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RECORDS_STORE, 'readonly');
      const req = tx.objectStore(RECORDS_STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        indexRecordEntry(indexState, cursor.value as SimRecordEntry);
        cursor.continue();
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Failed to index records')); };
    });
  } catch {
    for (const e of memoryFallback) indexRecordEntry(indexState, e);
  }
  initialized = true;
  return indexState;
}

export function flushRecordsBatch(): Promise<void> {
  if (pendingQueue.length === 0) return inFlightFlush;
  const batch = pendingQueue.splice(0, pendingQueue.length);
  if (!hasIndexedDb()) {
    memoryFallback.push(...batch);
    return inFlightFlush;
  }
  inFlightFlush = inFlightFlush
    .then(() => idbPutRecordsBatch(batch))
    .catch(() => { memoryFallback.push(...batch); });
  return inFlightFlush;
}

export function recordSimEvent(params: {
  simDay: number;
  dateLabel: string;
  category: RecordCategory;
  subType: string;
  subjectId: string;
  subjectKind: RecordSubjectKind;
  subjectName: string;
  summary: string;
  detail: Record<string, unknown>;
  simgodMarked?: boolean;
}): SimRecordEntry {
  if (getRecordsWorkerRpc()) {
    forwardMainThreadRecord(params);
    return { seq: 0, id: `fwd_${params.simDay}_${params.subType}`, ...params };
  }
  const seq = indexState.nextSeq;
  const entry: SimRecordEntry = {
    seq,
    id: `rec_${seq}_${params.simDay}_${params.subType}`,
    simDay: params.simDay,
    dateLabel: params.dateLabel,
    category: params.category,
    subType: params.subType,
    subjectId: params.subjectId,
    subjectKind: params.subjectKind,
    subjectName: params.subjectName,
    summary: params.summary,
    detail: params.detail,
    ...(params.simgodMarked ? { simgodMarked: true } : {}),
  };
  pendingQueue.push(entry);
  indexRecordEntry(indexState, entry);
  if (pendingQueue.length >= RECORDS_BATCH_SIZE) void flushRecordsBatch();
  return entry;
}

export async function resetRecordsStore(importedRecords: SimRecordEntry[] = []): Promise<void> {
  const rpc = getRecordsWorkerRpc();
  if (rpc) {
    await rpc.resetRecords(importedRecords);
    return;
  }
  await inFlightFlush;
  pendingQueue = [];
  memoryFallback = [];
  indexState = emptyRecordsIndex();
  setSyncedRecordsIndex(null);
  const normalized = [...importedRecords]
    .sort((a, b) => a.seq - b.seq)
    .map((r, i) => ({ ...r, seq: r.seq > 0 ? r.seq : i + 1 }));
  for (const r of normalized) indexRecordEntry(indexState, r);
  if (!hasIndexedDb()) {
    memoryFallback = normalized;
    initialized = true;
    return;
  }
  await idbClearRecords();
  for (let i = 0; i < normalized.length; i += 250) {
    await idbPutRecordsBatch(normalized.slice(i, i + 250));
  }
  initialized = true;
}
