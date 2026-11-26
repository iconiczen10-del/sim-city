// recordsWorkerBridge.ts — Main-thread RPC bridge for Worker-hosted Simulation Records index, queries, and appends

import type { RecordsFilter, RecordsIndex, RecordsPageResult, SimRecordEntry } from './recordTypes';

export interface MainRecordInput {
  simDay: number;
  dateLabel: string;
  category: SimRecordEntry['category'];
  subType: string;
  subjectId: string;
  subjectKind: SimRecordEntry['subjectKind'];
  subjectName: string;
  summary: string;
  detail: Record<string, unknown>;
  simgodMarked?: boolean;
}

export interface RecordsWorkerRpc {
  queryPage: (filter: RecordsFilter, page: number, pageSize: number) => Promise<RecordsPageResult>;
  exportAll: () => Promise<SimRecordEntry[]>;
  appendRecords: (items: MainRecordInput[]) => void;
  resetRecords: (items: SimRecordEntry[]) => Promise<void>;
}

let activeRpc: RecordsWorkerRpc | null = null;
let syncedIndex: RecordsIndex | null = null;
let queuedMainRecords: MainRecordInput[] = [];

export function registerRecordsWorkerRpc(rpc: RecordsWorkerRpc | null): void {
  activeRpc = rpc;
  if (rpc && queuedMainRecords.length > 0) {
    const batch = queuedMainRecords.splice(0, queuedMainRecords.length);
    rpc.appendRecords(batch);
  }
}

export function getRecordsWorkerRpc(): RecordsWorkerRpc | null {
  return activeRpc;
}

export function setSyncedRecordsIndex(idx: RecordsIndex | null): void {
  syncedIndex = idx;
}

export function getSyncedRecordsIndex(): RecordsIndex | null {
  return syncedIndex;
}

export function forwardMainThreadRecord(item: MainRecordInput): void {
  if (activeRpc) {
    activeRpc.appendRecords([item]);
  } else {
    queuedMainRecords.push(item);
  }
}

export function clearQueuedMainRecords(): void {
  queuedMainRecords = [];
}
