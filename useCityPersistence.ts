// useCityPersistence.ts — Async IndexedDB loading, debounced saving, JSON export/import, and pagehide flush

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardMeeting } from './boardTypes';
import { DAYS_PER_MONTH } from './constants';
import { createInitialCityState } from './seeder';
import { advanceCityDay } from './advanceCityDay';
import { executeCityExport } from './saveExportActions';
import type { SaveNotice } from './SaveNoticeBanner';
import {
  clearAllDbData,
  loadAppPersistence,
  parseImportedCityBundle,
  saveBoardMeetingToDb,
  saveCityToDb,
} from './storage';
import type { CityState, SimSpeed } from './types';

export function useCityPersistence() {
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<CityState | null>(null);
  const [meetings, setMeetings] = useState<BoardMeeting[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<SaveNotice | null>(null);

  const cityRef = useRef<CityState | null>(null);
  const meetingsRef = useRef<BoardMeeting[]>([]);
  cityRef.current = city;
  meetingsRef.current = meetings;

  const reportDbError = useCallback((ctx: string, err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    setWarning(`${ctx}: ${msg}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadAppPersistence().then((res) => {
      if (cancelled) return;
      const loadedCity = res.city ?? createInitialCityState();
      const unread = res.meetings.filter((m) => !m.read).length;
      if (loadedCity.boardState.unreadMeetingCount !== unread) {
        loadedCity.boardState = { ...loadedCity.boardState, unreadMeetingCount: unread };
      }
      setCity(loadedCity);
      setMeetings(res.meetings);
      if (res.warning) setWarning(res.warning);
      if (!res.city) saveCityToDb(loadedCity).catch((e) => reportDbError('Initial IndexedDB save failed', e));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reportDbError]);

  useEffect(() => {
    const onPageHide = () => {
      if (cityRef.current) saveCityToDb(cityRef.current).catch((e) => reportDbError('Pagehide save failed', e));
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [reportDbError]);

  const stepOneDay = useCallback((speed: SimSpeed = 1) => {
    const prev = cityRef.current;
    if (!prev) return;
    const { state: next, newMeeting } = advanceCityDay(prev, meetingsRef.current[0], speed);
    setCity(next);
    if (newMeeting) {
      setMeetings((mPrev) => [newMeeting, ...mPrev]);
      saveBoardMeetingToDb(newMeeting).catch((e) => reportDbError('Failed to store board meeting', e));
    }
    if (next.day === DAYS_PER_MONTH || next.totalDays % 5 === 0) {
      saveCityToDb(next).catch((e) => reportDbError('Auto-save failed', e));
    }
  }, [reportDbError]);

  const updateCity = useCallback((updater: (prev: CityState) => CityState) => {
    setCity((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveCityToDb(next).catch((e) => reportDbError('Save after edit failed', e));
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
    setCity((prev) => {
      if (!prev) return prev;
      const unread = Math.max(0, meetingsRef.current.filter((m) => m.id !== meetingId && !m.read).length);
      if (prev.boardState.unreadMeetingCount === unread) return prev;
      const next = { ...prev, boardState: { ...prev.boardState, unreadMeetingCount: unread } };
      saveCityToDb(next).catch((e) => reportDbError('Failed to sync unread counter', e));
      return next;
    });
  }, [reportDbError]);

  const resetCity = useCallback(async (seedOpt?: number) => {
    const fresh = createInitialCityState(seedOpt);
    setCity(fresh);
    setMeetings([]);
    try {
      await clearAllDbData();
      await saveCityToDb(fresh);
    } catch (e) {
      reportDbError('Failed to reset IndexedDB', e);
    }
  }, [reportDbError]);

  const exportCity = useCallback((mode: 'download' | 'upload') => {
    if (!cityRef.current) return;
    const res = executeCityExport(cityRef.current, meetingsRef.current, mode);
    if (!res.ok) {
      setExportNotice(res.notice);
      return;
    }
    setCity(res.updatedCity);
    saveCityToDb(res.updatedCity).catch((e) => reportDbError('Save after export failed', e));
    setExportNotice(res.notice);
  }, [reportDbError]);

  const importJson = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const { city: importedCity, meetings: importedMeetings } = parseImportedCityBundle(text);
      await clearAllDbData();
      await saveCityToDb(importedCity);
      await Promise.all(importedMeetings.map((m) => saveBoardMeetingToDb(m)));
      setCity(importedCity);
      setMeetings(importedMeetings);
      setWarning(null);
      setExportNotice(null);
    } catch (e) {
      reportDbError('Import JSON failed', e);
    }
  }, [reportDbError]);

  return { loading, city, meetings, warning, dismissWarning: () => setWarning(null), exportNotice, dismissExportNotice: () => setExportNotice(null), stepOneDay, updateCity, markMeetingRead, resetCity, exportCity, importJson };
}
