// cityDiffSave.ts — Slice-level diff serialization and reassembly for 30s IndexedDB autosave

import type { CityState } from './types';

export interface CitySliceRow {
  sliceKey: string;
  data: unknown;
}

const REQUIRED_SLICES = ['meta', 'citizens', 'companies', 'housing', 'mart', 'sharity', 'chatGroups', 'events'] as const;
let lastSliceSigs: Record<string, string> = {};

function quickSig(raw: string): string {
  let h1 = 2166136261;
  let h2 = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 16777619);
    h2 = ((h2 << 5) + h2) ^ ch;
  }
  return `${raw.length}:${h1 >>> 0}:${h2 >>> 0}`;
}

export function splitCityIntoSlices(city: CityState): CitySliceRow[] {
  return [
    {
      sliceKey: 'meta',
      data: {
        version: city.version,
        seed: city.seed,
        rngState: city.rngState,
        cityName: city.cityName,
        day: city.day,
        month: city.month,
        year: city.year,
        totalDays: city.totalDays,
        treasury: city.treasury,
        tierMovementsThisMonth: city.tierMovementsThisMonth,
        lastMonthTaxCollected: city.lastMonthTaxCollected,
        lastTotalPayroll: city.lastTotalPayroll,
        lastBusinessTaxCollected: city.lastBusinessTaxCollected,
        boardState: city.boardState,
      },
    },
    { sliceKey: 'citizens', data: city.citizens },
    { sliceKey: 'companies', data: { companies: city.companies, vacancies: city.vacancies, jobEvents: city.jobEvents } },
    { sliceKey: 'housing', data: city.housing },
    { sliceKey: 'mart', data: city.mart },
    { sliceKey: 'electricity', data: city.electricity ?? null },
    { sliceKey: 'family', data: city.family ?? null },
    { sliceKey: 'sharity', data: city.sharity },
    { sliceKey: 'chatGroups', data: city.chatGroups },
    { sliceKey: 'events', data: city.events },
  ];
}

export function collectChangedCitySlices(city: CityState): { changed: CitySliceRow[]; pendingSigs: Record<string, string> } {
  const all = splitCityIntoSlices(city);
  const changed: CitySliceRow[] = [];
  const pendingSigs: Record<string, string> = {};
  for (const row of all) {
    const sig = quickSig(JSON.stringify(row.data) ?? 'null');
    if (lastSliceSigs[row.sliceKey] !== sig) {
      changed.push(row);
      pendingSigs[row.sliceKey] = sig;
    }
  }
  return { changed, pendingSigs };
}

export function commitCitySliceSigs(pendingSigs: Record<string, string>): void {
  lastSliceSigs = { ...lastSliceSigs, ...pendingSigs };
}

export function resetCityDiffCache(): void {
  lastSliceSigs = {};
}

export function reassembleCityFromSlices(rows: CitySliceRow[]): CityState | undefined {
  if (!rows || rows.length === 0) return undefined;
  const map = new Map<string, unknown>();
  for (const r of rows) map.set(r.sliceKey, r.data);
  for (const req of REQUIRED_SLICES) {
    if (!map.has(req)) return undefined;
  }
  const meta = map.get('meta') as Record<string, unknown>;
  const compBundle = map.get('companies') as {
    companies: CityState['companies'];
    vacancies: CityState['vacancies'];
    jobEvents: CityState['jobEvents'];
  };
  const electricity = map.get('electricity') as CityState['electricity'] | null | undefined;
  const family = map.get('family') as CityState['family'] | null | undefined;
  return {
    ...(meta as unknown as CityState),
    citizens: map.get('citizens') as CityState['citizens'],
    companies: compBundle.companies,
    vacancies: compBundle.vacancies,
    jobEvents: compBundle.jobEvents,
    housing: map.get('housing') as CityState['housing'],
    mart: map.get('mart') as CityState['mart'],
    ...(electricity ? { electricity } : {}),
    ...(family ? { family } : {}),
    sharity: map.get('sharity') as CityState['sharity'],
    chatGroups: map.get('chatGroups') as CityState['chatGroups'],
    events: map.get('events') as CityState['events'],
  };
}
