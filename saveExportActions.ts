// saveExportActions.ts — Offline file download, SimCity Saves tab launcher, and export event logging

import type { BoardMeeting } from './boardTypes';
import { makeCityEvent } from './eventFactory';
import { buildRecordsExportJson } from './recordsExport';
import type { SimRecordEntry } from './recordTypes';
import type { SaveNotice } from './SaveNoticeBanner';
import type { CityState } from './types';

export const SIMCITY_SAVES_UPLOAD_URL = 'https://gdrive063-ship-it.github.io/simcity-saves/upload.html';

export function formatExportFilename(simDay: number, now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `vij-records-day-${Math.floor(simDay)}-${yyyy}-${mm}-${dd}.json`;
}

export function triggerSaveDownload(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function appendSaveExportEvent(city: CityState, mode: 'download' | 'upload'): CityState {
  const simDay = Math.floor(city.totalDays);
  const clock = { totalDays: city.totalDays, day: city.day, month: city.month, year: city.year };
  const evt = makeCityEvent(clock, `save_${simDay}_${Date.now()}`, {
    type: 'system',
    title: `City saved to file (day ${simDay})`,
    detail: mode === 'upload'
      ? 'Downloaded save file and opened SimCity Saves in a new tab.'
      : 'Downloaded local city save JSON file.',
  });
  return { ...city, events: [evt, ...city.events].slice(0, 600) };
}

export function executeCityExport(
  city: CityState,
  meetings: BoardMeeting[],
  allRecords: SimRecordEntry[],
  mode: 'download' | 'upload'
): { ok: true; updatedCity: CityState; notice: SaveNotice | null } | { ok: false; notice: SaveNotice } {
  try {
    const json = buildRecordsExportJson(city, meetings, allRecords);
    triggerSaveDownload(json, formatExportFilename(city.totalDays));
  } catch {
    return { ok: false, notice: { kind: 'error', message: 'Could not create the save file. Try again.' } };
  }

  const updatedCity = appendSaveExportEvent(city, mode);
  if (mode === 'download') return { ok: true, updatedCity, notice: null };

  let opened: Window | null = null;
  try {
    opened = window.open(SIMCITY_SAVES_UPLOAD_URL, '_blank');
    if (opened) {
      try { opened.opener = null; } catch { /* ignore cross-origin opener guard */ }
    }
  } catch {
    opened = null;
  }

  if (!opened || opened.closed) {
    return {
      ok: true,
      updatedCity,
      notice: {
        kind: 'warning',
        message: 'Your browser blocked the new tab. Open this link yourself:',
        link: SIMCITY_SAVES_UPLOAD_URL,
      },
    };
  }

  return {
    ok: true,
    updatedCity,
    notice: { kind: 'info', message: 'Your save was downloaded. Drag it into the upload page in the new tab.' },
  };
}
