// recordsQuery.ts — Index-cursor pagination (2 or 3 visible rows), filtering, and full export reader

import { idbGetAllRecords, openVijDb, RECORDS_STORE } from './idbHelpers';
import {
  awaitPendingFlush,
  getMemoryFallbackRecords,
  getPendingQueue,
  hasIndexedDb,
} from './recordsStore';
import { getRecordsWorkerRpc } from './recordsWorkerBridge';
import type { RecordsFilter, RecordsPageResult, SimRecordEntry } from './recordTypes';

function matchesFilter(entry: SimRecordEntry, filter: RecordsFilter, queryLower: string): boolean {
  if (filter.category && filter.category !== 'all' && entry.category !== filter.category) return false;
  if (filter.subType && entry.subType !== filter.subType) return false;
  if (filter.hideSimGodTag && (entry.simgodMarked || entry.category === 'simgod')) return false;
  if (filter.subjectId && entry.subjectId !== filter.subjectId) return false;
  if (filter.dayFrom !== undefined && entry.simDay < filter.dayFrom) return false;
  if (filter.dayTo !== undefined && entry.simDay > filter.dayTo) return false;
  if (queryLower) {
    const hay = `${entry.summary} ${entry.subjectName} ${entry.subType} ${entry.category} ${entry.dateLabel} ${JSON.stringify(entry.detail)}`.toLowerCase();
    if (!hay.includes(queryLower)) return false;
  }
  return true;
}

function selectCursorSource(store: IDBObjectStore, filter: RecordsFilter): IDBRequest<IDBCursorWithValue | null> {
  const hasFrom = filter.dayFrom !== undefined;
  const hasTo = filter.dayTo !== undefined;
  if (filter.subjectId && (hasFrom || hasTo)) {
    const low = [filter.subjectId, filter.dayFrom ?? 0];
    const high = [filter.subjectId, filter.dayTo ?? 9999999];
    return store.index('subDay').openCursor(IDBKeyRange.bound(low, high), 'prev');
  }
  if (filter.subjectId) return store.index('subjectId').openCursor(IDBKeyRange.only(filter.subjectId), 'prev');
  if (hasFrom || hasTo) return store.index('simDay').openCursor(IDBKeyRange.bound(filter.dayFrom ?? 0, filter.dayTo ?? 9999999), 'prev');
  if (filter.category && filter.category !== 'all') return store.index('category').openCursor(IDBKeyRange.only(filter.category), 'prev');
  return store.openCursor(null, 'prev');
}

export async function queryRecordsPage(
  filter: RecordsFilter,
  requestedPage: number,
  pageSize: number
): Promise<RecordsPageResult> {
  const rpc = getRecordsWorkerRpc();
  if (rpc) return rpc.queryPage(filter, requestedPage, pageSize);
  await awaitPendingFlush();
  const q = (filter.query ?? '').trim().toLowerCase();
  const safeSize = Math.max(1, pageSize);
  const page = Math.max(1, requestedPage);
  const pendingMatches = getPendingQueue().filter((e) => matchesFilter(e, filter, q)).sort((a, b) => b.seq - a.seq);

  if (!hasIndexedDb()) {
    const all = [...pendingMatches, ...getMemoryFallbackRecords().filter((e) => matchesFilter(e, filter, q)).sort((a, b) => b.seq - a.seq)];
    const totalMatched = all.length;
    const totalPages = Math.max(1, Math.ceil(totalMatched / safeSize));
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * safeSize;
    return { items: all.slice(start, start + safeSize), totalMatched, page: clampedPage, totalPages };
  }

  const offset = (page - 1) * safeSize;
  const items: SimRecordEntry[] = [];
  for (let i = offset; i < pendingMatches.length && items.length < safeSize; i += 1) {
    items.push(pendingMatches[i]);
  }
  let storedMatched = 0;
  const skipInStore = Math.max(0, offset - pendingMatches.length);
  const needFromStore = safeSize - items.length;

  try {
    const db = await openVijDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RECORDS_STORE, 'readonly');
      const req = selectCursorSource(tx.objectStore(RECORDS_STORE), filter);
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const entry = cursor.value as SimRecordEntry;
        if (matchesFilter(entry, filter, q)) {
          if (storedMatched >= skipInStore && items.length < safeSize && needFromStore > 0) items.push(entry);
          storedMatched += 1;
        }
        cursor.continue();
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Cursor query failed')); };
    });
  } catch {
    const mem = getMemoryFallbackRecords().filter((e) => matchesFilter(e, filter, q)).sort((a, b) => b.seq - a.seq);
    storedMatched = mem.length;
    for (let i = skipInStore; i < mem.length && items.length < safeSize; i += 1) items.push(mem[i]);
  }

  const totalMatched = pendingMatches.length + storedMatched;
  const totalPages = Math.max(1, Math.ceil(totalMatched / safeSize));
  if (page > totalPages && totalMatched > 0) return queryRecordsPage(filter, totalPages, safeSize);
  return { items, totalMatched, page: Math.min(page, totalPages), totalPages };
}

export async function getAllRecordsForExport(): Promise<SimRecordEntry[]> {
  const rpc = getRecordsWorkerRpc();
  if (rpc) return rpc.exportAll();
  await awaitPendingFlush();
  const pending = [...getPendingQueue()];
  if (!hasIndexedDb()) return [...getMemoryFallbackRecords(), ...pending].sort((a, b) => a.seq - b.seq);
  try {
    const stored = await idbGetAllRecords();
    const map = new Map<number, SimRecordEntry>();
    for (const r of stored) map.set(r.seq, r);
    for (const r of pending) map.set(r.seq, r);
    return [...map.values()].sort((a, b) => a.seq - b.seq);
  } catch {
    return [...getMemoryFallbackRecords(), ...pending].sort((a, b) => a.seq - b.seq);
  }
}
