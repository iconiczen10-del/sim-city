// useCityExportImport.ts — City JSON export, import, and new-city reset actions for persistence hook

import { useCallback, type MutableRefObject } from 'react';
import type { BoardMeeting } from './boardTypes';
import { parseImportedBundleWithRecords, persistImportedBundleFile } from './recordsImport';
import { getAllRecordsForExport } from './recordsQuery';
import { flushRecordsBatch, resetRecordsStore } from './recordsStore';
import { executeCityExport } from './saveExportActions';
import type { SaveNotice } from './SaveNoticeBanner';
import { createInitialCityState } from './seeder';
import type { SimWorkerHandle } from './simWorkerClient';
import { clearAllDbData, saveCityToDb } from './storage';
import type { CityState } from './types';

interface ExportImportDeps {
  cityRef: MutableRefObject<CityState | null>;
  meetingsRef: MutableRefObject<BoardMeeting[]>;
  workerRef: MutableRefObject<SimWorkerHandle | null>;
  setCity: (city: CityState) => void;
  setMeetings: (meetings: BoardMeeting[]) => void;
  setRecordsCount: (count: number) => void;
  setRunningBehind: (behind: boolean) => void;
  setWarning: (msg: string | null) => void;
  setExportNotice: (notice: SaveNotice | null) => void;
  refreshQuota: () => void;
  reportDbError: (ctx: string, err: unknown) => void;
}

export function useCityExportImport(deps: ExportImportDeps) {
  const { cityRef, meetingsRef, workerRef, setCity, setMeetings, setRecordsCount, setRunningBehind, setWarning, setExportNotice, refreshQuota, reportDbError } = deps;

  const resetCity = useCallback(async (seedOpt?: number) => {
    setRunningBehind(false);
    if (workerRef.current) {
      const res = await workerRef.current.resetCity(seedOpt);
      setCity(res.city);
      setMeetings(res.meetings);
      setRecordsCount(0);
      refreshQuota();
      return;
    }
    const fresh = createInitialCityState(seedOpt);
    setCity(fresh);
    setMeetings([]);
    setRecordsCount(0);
    await clearAllDbData();
    await resetRecordsStore([]);
    await saveCityToDb(fresh);
    refreshQuota();
  }, [workerRef, setCity, setMeetings, setRecordsCount, setRunningBehind, refreshQuota]);

  const exportCity = useCallback(async (mode: 'download' | 'upload') => {
    if (!cityRef.current) return;
    if (!workerRef.current) await flushRecordsBatch();
    const allRecords = await getAllRecordsForExport();
    const res = executeCityExport(cityRef.current, meetingsRef.current, allRecords, mode);
    setExportNotice(res.notice);
    if (!res.ok) return;
    setCity(res.updatedCity);
    if (workerRef.current) workerRef.current.syncCity(res.updatedCity, true);
    else saveCityToDb(res.updatedCity).catch((e) => reportDbError('Save after export failed', e));
  }, [cityRef, meetingsRef, workerRef, setCity, setExportNotice, reportDbError]);

  const importJson = useCallback(async (file: File) => {
    try {
      const bundle = workerRef.current ? parseImportedBundleWithRecords(await file.text()) : await persistImportedBundleFile(file);
      if (workerRef.current) await workerRef.current.importBundle(bundle);
      setCity(bundle.city);
      setMeetings(bundle.meetings);
      setRecordsCount(bundle.records.length);
      setWarning(null);
      setExportNotice(null);
      refreshQuota();
    } catch (e) {
      reportDbError('Import JSON failed', e);
    }
  }, [workerRef, setCity, setMeetings, setRecordsCount, setWarning, setExportNotice, refreshQuota, reportDbError]);

  return { resetCity, exportCity, importJson };
}
