// idbHelpers.ts — IndexedDB wrapper for city state, board meetings, and append-only simulation records

import type { BoardMeeting } from './boardTypes';
import { reassembleCityFromSlices, resetCityDiffCache, type CitySliceRow } from './cityDiffSave';
import type { SimRecordEntry } from './recordTypes';
import type { CityState } from './types';

const DB_NAME = 'vij_simulator_db';
const DB_VERSION = 3;
const CITY_STORE = 'city';
export const CITY_SLICES_STORE = 'citySlices';
const MEETINGS_STORE = 'boardMeetings';
export const RECORDS_STORE = 'records';
const CITY_RECORD_KEY = 'current';

export function openVijDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser context.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CITY_STORE)) db.createObjectStore(CITY_STORE);
      if (!db.objectStoreNames.contains(CITY_SLICES_STORE)) {
        db.createObjectStore(CITY_SLICES_STORE, { keyPath: 'sliceKey' });
      }
      if (!db.objectStoreNames.contains(MEETINGS_STORE)) {
        const store = db.createObjectStore(MEETINGS_STORE, { keyPath: 'id' });
        store.createIndex('totalDay', 'totalDay', { unique: false });
      }
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        const rec = db.createObjectStore(RECORDS_STORE, { keyPath: 'seq' });
        rec.createIndex('simDay', 'simDay', { unique: false });
        rec.createIndex('category', 'category', { unique: false });
        rec.createIndex('subjectId', 'subjectId', { unique: false });
        rec.createIndex('subDay', ['subjectId', 'simDay'], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB.'));
  });
}

function runTx<T>(mode: IDBTransactionMode, storeName: string, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openVijDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    let result: T;
    req.onsuccess = () => { result = req.result; };
    req.onerror = () => reject(req.error ?? new Error(`IndexedDB request failed on ${storeName}.`));
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error(`IndexedDB transaction failed on ${storeName}.`)); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error(`IndexedDB transaction aborted on ${storeName}.`)); };
  }));
}

export async function idbGetCity(): Promise<CityState | undefined> {
  const slices = await runTx<CitySliceRow[]>('readonly', CITY_SLICES_STORE, (s) => s.getAll());
  const assembled = reassembleCityFromSlices(slices ?? []);
  if (assembled) return assembled;
  return runTx('readonly', CITY_STORE, (s) => s.get(CITY_RECORD_KEY));
}

export async function idbPutCitySlicesBatch(slices: CitySliceRow[]): Promise<void> {
  if (slices.length === 0) return;
  const db = await openVijDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CITY_SLICES_STORE, 'readwrite');
    const store = tx.objectStore(CITY_SLICES_STORE);
    for (const row of slices) store.put(row);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Failed to write city slices.')); };
  });
}

export function idbPutCity(city: CityState): Promise<IDBValidKey> {
  return runTx('readwrite', CITY_STORE, (s) => s.put(city, CITY_RECORD_KEY));
}

export function idbGetAllMeetings(): Promise<BoardMeeting[]> {
  return runTx('readonly', MEETINGS_STORE, (s) => s.getAll()).then((rows) => (rows ?? []).sort((a, b) => b.totalDay - a.totalDay));
}

export function idbPutMeeting(meeting: BoardMeeting): Promise<IDBValidKey> {
  return runTx('readwrite', MEETINGS_STORE, (s) => s.put(meeting));
}

export async function idbPutRecordsBatch(entries: SimRecordEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const db = await openVijDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const store = tx.objectStore(RECORDS_STORE);
    for (const entry of entries) store.put(entry);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Failed to write records batch.')); };
  });
}

export function idbGetAllRecords(): Promise<SimRecordEntry[]> {
  return runTx('readonly', RECORDS_STORE, (s) => s.getAll()).then((rows) => (rows ?? []).sort((a, b) => a.seq - b.seq));
}

export async function idbClearRecords(): Promise<void> {
  const db = await openVijDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    tx.objectStore(RECORDS_STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Failed to clear records store.')); };
  });
}

export async function idbClearAll(): Promise<void> {
  resetCityDiffCache();
  const db = await openVijDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([CITY_STORE, CITY_SLICES_STORE, MEETINGS_STORE, RECORDS_STORE], 'readwrite');
    tx.objectStore(CITY_STORE).clear();
    tx.objectStore(CITY_SLICES_STORE).clear();
    tx.objectStore(MEETINGS_STORE).clear();
    tx.objectStore(RECORDS_STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Failed to clear IndexedDB stores.')); };
  });
}
