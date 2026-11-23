// storage.ts — IndexedDB persistence, legacy localStorage migration, and JSON export/import

import { validateAndMigrateCity } from './cityMigration';
import type { BoardMeeting } from './boardTypes';
import { APP_VERSION, LEGACY_STORAGE_KEYS, STORAGE_KEY } from './constants';
import {
  idbClearAll,
  idbGetAllMeetings,
  idbGetCity,
  idbPutCity,
  idbPutMeeting,
} from './idbHelpers';
import type { CityState } from './types';


function readLegacyLocalStorage(): { city: CityState; key: string } | null {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const migrated = validateAndMigrateCity(JSON.parse(raw));
      if (migrated) return { city: migrated, key };
    } catch {
      // Ignore corrupt legacy localStorage entry and continue checking
    }
  }
  return null;
}

export async function loadAppPersistence(): Promise<{
  city: CityState | null;
  meetings: BoardMeeting[];
  warning?: string;
}> {
  try {
    const [storedCity, meetings] = await Promise.all([idbGetCity(), idbGetAllMeetings()]);
    if (storedCity) {
      return { city: validateAndMigrateCity(storedCity), meetings };
    }
    const legacy = readLegacyLocalStorage();
    if (legacy) {
      await idbPutCity(legacy.city);
      try {
        window.localStorage.removeItem(legacy.key);
        for (const k of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(k);
      } catch {
        // Ignore removal errors once imported
      }
      return { city: legacy.city, meetings };
    }
    return { city: null, meetings };
  } catch (err) {
    const legacy = readLegacyLocalStorage();
    const msg = err instanceof Error ? err.message : 'IndexedDB load failed';
    return {
      city: legacy?.city ?? null,
      meetings: [],
      warning: `Storage warning: ${msg}. Changes may not persist until IndexedDB is available.`,
    };
  }
}

export async function saveCityToDb(state: CityState): Promise<void> {
  await idbPutCity(state);
}

export async function saveBoardMeetingToDb(meeting: BoardMeeting): Promise<void> {
  await idbPutMeeting(meeting);
}

export async function clearAllDbData(): Promise<void> {
  await idbClearAll();
}

export function exportCityBundleJson(city: CityState, meetings: BoardMeeting[]): string {
  return JSON.stringify({ format: 'vij_city_export_v1', version: APP_VERSION, exportedAt: new Date().toISOString(), city, boardMeetings: meetings }, null, 2);
}

export function parseImportedCityBundle(rawJson: string): { city: CityState; meetings: BoardMeeting[] } {
  const parsed = JSON.parse(rawJson) as { city?: unknown; boardMeetings?: unknown };
  const rawCity = parsed && typeof parsed === 'object' && 'city' in parsed ? parsed.city : parsed;
  const city = validateAndMigrateCity(rawCity);
  if (!city) {
    throw new Error('Invalid Vij city JSON file: expected 50 citizens, 4 companies, and Mart state.');
  }
  const meetings = Array.isArray(parsed?.boardMeetings) ? (parsed.boardMeetings as BoardMeeting[]) : [];
  return { city, meetings: meetings.sort((a, b) => b.totalDay - a.totalDay) };
}
