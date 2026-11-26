// simWorker.ts — Background simulation runner, 2s records batch flush, 30s diff autosave, and Worker RPC

import type { BoardMeeting } from './boardTypes';
import { getAllRecordsForExport, queryRecordsPage } from './recordsQuery';
import { flushRecordsBatch, getRecordsIndex, initRecordsStore, recordSimEvent, resetRecordsStore } from './recordsStore';
import type { MainRecordInput } from './recordsWorkerBridge';
import type { RecordsFilter, SimRecordEntry } from './recordTypes';
import { createInitialCityState } from './seeder';
import { stepWorkerClock, type WorkerTickRuntime } from './simWorkerTick';
import { clearAllDbData, loadAppPersistence, saveBoardMeetingToDb, saveCityToDb } from './storage';
import type { CityState, SimSpeed } from './types';

const rt: WorkerTickRuntime = {
  city: null,
  latestMeeting: undefined,
  speed: 1,
  runningBehind: false,
  dirtyCity: false,
  accumulatedMs: 0,
  lastTickAt: performance.now(),
  lastRedrawAt: 0,
  daysSinceRedraw: 0,
};

function emitState(newMeetings: BoardMeeting[] = []): void {
  if (!rt.city) return;
  rt.daysSinceRedraw = 0;
  rt.lastRedrawAt = performance.now();
  self.postMessage({ type: 'state', city: rt.city, newMeetings, index: getRecordsIndex(), runningBehind: rt.runningBehind });
}

self.setInterval(() => {
  stepWorkerClock(rt, (m) => { void saveBoardMeetingToDb(m); }, emitState);
}, 50);

self.setInterval(() => { void flushRecordsBatch(); }, 2000);

self.setInterval(() => {
  if (!rt.city || !rt.dirtyCity) return;
  rt.dirtyCity = false;
  void saveCityToDb(rt.city);
}, 30000);

type WorkerInMsg =
  | { type: 'init'; speed: SimSpeed }
  | { type: 'set_speed'; speed: SimSpeed }
  | { type: 'sync_city'; city: CityState; saveNow?: boolean }
  | { type: 'append_records'; items: MainRecordInput[] }
  | { type: 'query_records'; reqId: number; filter: RecordsFilter; page: number; pageSize: number }
  | { type: 'export_records'; reqId: number }
  | { type: 'reset_city'; reqId: number; seed?: number; imported?: { city: CityState; meetings: BoardMeeting[]; records: SimRecordEntry[] } }
  | { type: 'flush_save'; reqId?: number };

self.onmessage = async (ev: MessageEvent<WorkerInMsg>) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    rt.speed = msg.speed;
    const [res] = await Promise.all([loadAppPersistence(), initRecordsStore()]);
    rt.city = res.city ?? createInitialCityState();
    const unread = res.meetings.filter((m) => !m.read).length;
    if (rt.city.boardState.unreadMeetingCount !== unread) {
      rt.city.boardState = { ...rt.city.boardState, unreadMeetingCount: unread };
    }
    rt.latestMeeting = res.meetings[0];
    if (!res.city) await saveCityToDb(rt.city);
    rt.lastTickAt = performance.now();
    self.postMessage({ type: 'ready', city: rt.city, meetings: res.meetings, warning: res.warning ?? null, index: getRecordsIndex() });
    return;
  }
  if (msg.type === 'set_speed') {
    rt.speed = msg.speed;
    rt.accumulatedMs = 0;
    rt.lastTickAt = performance.now();
    rt.runningBehind = false;
    emitState();
    return;
  }
  if (msg.type === 'sync_city') {
    rt.city = msg.city;
    rt.dirtyCity = true;
    if (msg.saveNow) { rt.dirtyCity = false; void saveCityToDb(rt.city); }
    return;
  }
  if (msg.type === 'append_records') {
    for (const item of msg.items) recordSimEvent(item);
    self.postMessage({ type: 'index', index: getRecordsIndex() });
    return;
  }
  if (msg.type === 'query_records') {
    const result = await queryRecordsPage(msg.filter, msg.page, msg.pageSize);
    self.postMessage({ type: 'rpc_result', reqId: msg.reqId, data: result });
    return;
  }
  if (msg.type === 'export_records') {
    await flushRecordsBatch();
    const records = await getAllRecordsForExport();
    self.postMessage({ type: 'rpc_result', reqId: msg.reqId, data: records });
    return;
  }
  if (msg.type === 'reset_city') {
    rt.accumulatedMs = 0;
    rt.runningBehind = false;
    await clearAllDbData();
    if (msg.imported) {
      rt.city = msg.imported.city;
      rt.latestMeeting = msg.imported.meetings[0];
      await saveCityToDb(rt.city);
      await Promise.all(msg.imported.meetings.map((m) => saveBoardMeetingToDb(m)));
      await resetRecordsStore(msg.imported.records);
    } else {
      rt.city = createInitialCityState(msg.seed);
      rt.latestMeeting = undefined;
      await resetRecordsStore([]);
      await saveCityToDb(rt.city);
    }
    rt.dirtyCity = false;
    emitState();
    self.postMessage({ type: 'rpc_result', reqId: msg.reqId, data: { city: rt.city, meetings: msg.imported?.meetings ?? [] } });
    return;
  }
  if (msg.type === 'flush_save') {
    await flushRecordsBatch();
    if (rt.city) { rt.dirtyCity = false; await saveCityToDb(rt.city); }
    if (msg.reqId !== undefined) self.postMessage({ type: 'rpc_result', reqId: msg.reqId, data: true });
  }
};
