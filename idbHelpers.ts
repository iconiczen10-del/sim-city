// idbHelpers.ts — Low-level IndexedDB wrapper for Vij city state and board meetings stores

import type { BoardMeeting } from './boardTypes';
import type { CityState } from './types';

const DB_NAME = 'vij_simulator_db';
const DB_VERSION = 1;
const CITY_STORE = 'city';
const MEETINGS_STORE = 'boardMeetings';
const CITY_RECORD_KEY = 'current';

function openVijDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser context.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CITY_STORE)) {
        db.createObjectStore(CITY_STORE);
      }
      if (!db.objectStoreNames.contains(MEETINGS_STORE)) {
        const store = db.createObjectStore(MEETINGS_STORE, { keyPath: 'id' });
        store.createIndex('totalDay', 'totalDay', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB.'));
  });
}

function runTx<T>(
  mode: IDBTransactionMode,
  storeName: string,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openVijDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        let result: T;
        req.onsuccess = () => { result = req.result; };
        req.onerror = () => reject(req.error ?? new Error(`IndexedDB request failed on ${storeName}.`));
        tx.oncomplete = () => { db.close(); resolve(result); };
        tx.onerror = () => { db.close(); reject(tx.error ?? new Error(`IndexedDB transaction failed on ${storeName}.`)); };
        tx.onabort = () => { db.close(); reject(tx.error ?? new Error(`IndexedDB transaction aborted on ${storeName}.`)); };
      })
  );
}

export function idbGetCity(): Promise<CityState | undefined> {
  return runTx('readonly', CITY_STORE, (s) => s.get(CITY_RECORD_KEY));
}

export function idbPutCity(city: CityState): Promise<IDBValidKey> {
  return runTx('readwrite', CITY_STORE, (s) => s.put(city, CITY_RECORD_KEY));
}

export function idbGetAllMeetings(): Promise<BoardMeeting[]> {
  return runTx('readonly', MEETINGS_STORE, (s) => s.getAll()).then((rows) =>
    (rows ?? []).sort((a, b) => b.totalDay - a.totalDay)
  );
}

export function idbPutMeeting(meeting: BoardMeeting): Promise<IDBValidKey> {
  return runTx('readwrite', MEETINGS_STORE, (s) => s.put(meeting));
}

export async function idbClearAll(): Promise<void> {
  const db = await openVijDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([CITY_STORE, MEETINGS_STORE], 'readwrite');
    tx.objectStore(CITY_STORE).clear();
    tx.objectStore(MEETINGS_STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Failed to clear IndexedDB stores.')); };
  });
}
