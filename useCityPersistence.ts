// useCityPersistence.ts — Worker-backed city state, 30s diff autosave, quota checks, and pagehide flush

import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceCityDay } from './advanceCityDay';
import type { BoardMeeting } from './boardTypes';
import { checkStorageQuotaStatus } from './recordsQuota';
import { flushRecordsBatch, getRecordsIndex, initRecordsStore } from './recordsStore';
import type { StorageQuotaStatus } from './recordTypes';
import type { SaveNotice } from './SaveNoticeBanner';
import { createInitialCityState } from './seeder';
import { createSimWorkerClient, type SimWorkerHandle } from './simWorkerClient';
import { loadAppPersistence, saveBoardMeetingToDb, saveCityToDb } from './storage';
import type { CityState, SimSpeed } from './types';
import { useCityExportImport } from './useCityExportImport';

export function useCityPersistence() {
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<CityState | null>(null);
  const [meetings, setMeetings] = useState<BoardMeeting[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<SaveNotice | null>(null);
  const [storageQuota, setStorageQuota] = useState<StorageQuotaStatus | null>(null);
  const [runningBehind, setRunningBehind] = useState(false);
  const [recordsCount, setRecordsCount] = useState(0);

  const cityRef = useRef<CityState | null>(null);
  const meetingsRef = useRef<BoardMeeting[]>([]);
  const workerRef = useRef<SimWorkerHandle | null>(null);
  const lastQuotaDayRef = useRef(0);
  cityRef.current = city;
  meetingsRef.current = meetings;

  const reportDbError = useCallback((ctx: string, err: unknown) => setWarning(`${ctx}: ${err instanceof Error ? err.message : String(err)}`), []);
  const refreshQuota = useCallback(() => { checkStorageQuotaStatus().then((q) => setStorageQuota(q)); }, []);

  useEffect(() => {
    let cancelled = false;
    if (typeof Worker !== 'undefined') {
      const handle = createSimWorkerClient(1, {
        onReady: ({ city: loadedCity, meetings: loadedMeetings, warning: w, index }) => {
          if (cancelled) return;
          setCity(loadedCity);
          setMeetings(loadedMeetings);
          setRecordsCount(index.totalCount);
          if (w) setWarning(w);
          refreshQuota();
          setLoading(false);
        },
        onState: ({ city: nextCity, newMeetings, index, runningBehind: behind }) => {
          if (cancelled) return;
          setCity(nextCity);
          setRecordsCount(index.totalCount);
          setRunningBehind(behind);
          if (newMeetings.length > 0) setMeetings((prev) => [...newMeetings, ...prev]);
          if (nextCity.totalDays - lastQuotaDayRef.current >= 10) {
            lastQuotaDayRef.current = nextCity.totalDays;
            refreshQuota();
          }
        },
        onError: (msg) => { if (!cancelled) setWarning(`Worker error: ${msg}`); },
      });
      workerRef.current = handle;
      return () => { cancelled = true; handle.terminate(); workerRef.current = null; };
    }
    Promise.all([loadAppPersistence(), initRecordsStore()]).then(([res, idx]) => {
      if (cancelled) return;
      const loadedCity = res.city ?? createInitialCityState();
      setCity(loadedCity);
      setMeetings(res.meetings);
      setRecordsCount(idx.totalCount);
      if (res.warning) setWarning(res.warning);
      if (!res.city) saveCityToDb(loadedCity).catch((e) => reportDbError('Initial IndexedDB save failed', e));
      refreshQuota();
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reportDbError, refreshQuota]);

  useEffect(() => {
    const onPageHide = () => {
      if (workerRef.current) { workerRef.current.flushSave(); return; }
      void flushRecordsBatch();
      if (cityRef.current) saveCityToDb(cityRef.current).catch((e) => reportDbError('Pagehide save failed', e));
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [reportDbError]);

  const setWorkerSpeed = useCallback((speed: SimSpeed) => {
    workerRef.current?.setSpeed(speed);
    if (speed === 0) setRunningBehind(false);
  }, []);

  const stepOneDayFallback = useCallback((speed: SimSpeed = 1) => {
    if (workerRef.current || !cityRef.current) return;
    const { state: next, newMeeting } = advanceCityDay(cityRef.current, meetingsRef.current[0], speed);
    setCity(next);
    setRecordsCount(getRecordsIndex().totalCount);
    if (newMeeting) {
      setMeetings((mPrev) => [newMeeting, ...mPrev]);
      saveBoardMeetingToDb(newMeeting).catch((e) => reportDbError('Failed to store board meeting', e));
    }
  }, [reportDbError]);

  const updateCity = useCallback((updater: (prev: CityState) => CityState) => {
    setCity((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (workerRef.current) workerRef.current.syncCity(next, true);
      else {
        void flushRecordsBatch();
        saveCityToDb(next).catch((e) => reportDbError('Save after edit failed', e));
      }
      return next;
    });
  }, [reportDbError]);

  const markMeetingRead = useCallback((meetingId: string) => {
    setMeetings((prev) => prev.map((m) => {
      if (m.id !== meetingId || m.read) return m;
      const updated = { ...m, read: true };
      saveBoardMeetingToDb(updated).catch((e) => reportDbError('Failed to mark meeting read', e));
      return updated;
    }));
    updateCity((prev) => {
      const unread = Math.max(0, meetingsRef.current.filter((m) => m.id !== meetingId && !m.read).length);
      return prev.boardState.unreadMeetingCount === unread ? prev : { ...prev, boardState: { ...prev.boardState, unreadMeetingCount: unread } };
    });
  }, [reportDbError, updateCity]);

  const { resetCity, exportCity, importJson } = useCityExportImport({
    cityRef, meetingsRef, workerRef, setCity, setMeetings, setRecordsCount,
    setRunningBehind, setWarning, setExportNotice, refreshQuota, reportDbError,
  });

  return { loading, city, meetings, warning, dismissWarning: () => setWarning(null), exportNotice, dismissExportNotice: () => setExportNotice(null), storageQuota, runningBehind, recordsCount, hasWorker: Boolean(workerRef.current), setWorkerSpeed, stepOneDayFallback, updateCity, markMeetingRead, resetCity, exportCity, importJson };
}
