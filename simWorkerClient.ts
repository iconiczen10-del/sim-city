// simWorkerClient.ts — Main-thread handle for simWorker lifecycle, state sync, and Records RPC promises

import type { BoardMeeting } from './boardTypes';
import {
  clearQueuedMainRecords,
  registerRecordsWorkerRpc,
  setSyncedRecordsIndex,
  type MainRecordInput,
} from './recordsWorkerBridge';
import type { RecordsFilter, RecordsIndex, RecordsPageResult, SimRecordEntry } from './recordTypes';
import type { CityState, SimSpeed } from './types';

export interface SimWorkerHandlers {
  onReady: (payload: { city: CityState; meetings: BoardMeeting[]; warning: string | null; index: RecordsIndex }) => void;
  onState: (payload: { city: CityState; newMeetings: BoardMeeting[]; index: RecordsIndex; runningBehind: boolean }) => void;
  onError: (message: string) => void;
}

export interface SimWorkerHandle {
  setSpeed: (speed: SimSpeed) => void;
  syncCity: (city: CityState, saveNow?: boolean) => void;
  flushSave: () => void;
  resetCity: (seed?: number) => Promise<{ city: CityState; meetings: BoardMeeting[] }>;
  importBundle: (imported: { city: CityState; meetings: BoardMeeting[]; records: SimRecordEntry[] }) => Promise<void>;
  terminate: () => void;
}

export function createSimWorkerClient(initialSpeed: SimSpeed, handlers: SimWorkerHandlers): SimWorkerHandle {
  const worker = new Worker(new URL('./simWorker.ts', import.meta.url), { type: 'module' });
  let nextReqId = 1;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  const callRpc = <T,>(msg: Record<string, unknown>): Promise<T> =>
    new Promise((resolve, reject) => {
      const reqId = nextReqId;
      nextReqId += 1;
      pending.set(reqId, { resolve: (v) => resolve(v as T), reject });
      worker.postMessage({ ...msg, reqId });
    });

  worker.onmessage = (ev: MessageEvent<Record<string, unknown>>) => {
    const m = ev.data;
    if (m.type === 'rpc_result') {
      const slot = pending.get(m.reqId as number);
      if (slot) {
        pending.delete(m.reqId as number);
        slot.resolve(m.data);
      }
      return;
    }
    if (m.type === 'index') {
      setSyncedRecordsIndex(m.index as RecordsIndex);
      return;
    }
    if (m.type === 'ready') {
      setSyncedRecordsIndex(m.index as RecordsIndex);
      handlers.onReady({
        city: m.city as CityState,
        meetings: m.meetings as BoardMeeting[],
        warning: (m.warning as string | null) ?? null,
        index: m.index as RecordsIndex,
      });
      return;
    }
    if (m.type === 'state') {
      setSyncedRecordsIndex(m.index as RecordsIndex);
      handlers.onState({
        city: m.city as CityState,
        newMeetings: (m.newMeetings as BoardMeeting[]) ?? [],
        index: m.index as RecordsIndex,
        runningBehind: Boolean(m.runningBehind),
      });
    }
  };

  worker.onerror = (err) => {
    handlers.onError(err.message || 'Simulation worker error');
  };

  registerRecordsWorkerRpc({
    queryPage: (filter: RecordsFilter, page: number, pageSize: number) =>
      callRpc<RecordsPageResult>({ type: 'query_records', filter, page, pageSize }),
    exportAll: () => callRpc<SimRecordEntry[]>({ type: 'export_records' }),
    appendRecords: (items: MainRecordInput[]) => worker.postMessage({ type: 'append_records', items }),
    resetRecords: async (items: SimRecordEntry[]) => {
      setSyncedRecordsIndex(null);
      void items;
    },
  });

  worker.postMessage({ type: 'init', speed: initialSpeed });

  return {
    setSpeed: (speed) => worker.postMessage({ type: 'set_speed', speed }),
    syncCity: (city, saveNow = false) => worker.postMessage({ type: 'sync_city', city, saveNow }),
    flushSave: () => worker.postMessage({ type: 'flush_save' }),
    resetCity: (seed) => callRpc<{ city: CityState; meetings: BoardMeeting[] }>({ type: 'reset_city', seed }),
    importBundle: async (imported) => {
      await callRpc({ type: 'reset_city', imported });
    },
    terminate: () => {
      registerRecordsWorkerRpc(null);
      setSyncedRecordsIndex(null);
      clearQueuedMainRecords();
      for (const slot of pending.values()) slot.reject(new Error('Worker terminated'));
      pending.clear();
      worker.terminate();
    },
  };
}
