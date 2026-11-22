// storage.ts — Local browser persistence for auto-saving and resuming Vij

import { APP_VERSION, STORAGE_KEY } from './constants';
import type { CityState } from './types';

export function loadSavedCity(): CityState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CityState;
    if (
      !parsed ||
      parsed.version !== APP_VERSION ||
      !Array.isArray(parsed.citizens) ||
      parsed.citizens.length !== 50 ||
      !Array.isArray(parsed.companies) ||
      parsed.companies.length !== 4 ||
      !parsed.mart ||
      !parsed.mart.categoryMoods ||
      !parsed.mart.schedules
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCityState(state: CityState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function clearSavedCity(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
