// saveExport.ts — Site-compatible Vij save bundle builder and live city summary generator

import type { BoardMeeting } from './boardTypes';
import { APP_VERSION } from './constants';
import type { CityState } from './types';

export interface VijCompanySummary {
  name: string;
  status: 'open' | 'bankrupt' | 'closed';
  cash: number;
}

export interface VijExportSummary {
  richest: { name: string; savings: number };
  companies: VijCompanySummary[];
  treasury: number;
  martStatus: 'open' | 'closed';
  gjPowerStatus: 'normal' | 'rationing' | 'blackout';
}

export interface VijSaveBundle {
  format: 'vij_city_export_v1';
  vijSave: true;
  gameVersion: string;
  version: string;
  exportedAt: string;
  simDay: number;
  citizensAlive: number;
  summary: VijExportSummary;
  city: CityState;
  boardMeetings: BoardMeeting[];
}

function getGJPowerStatus(city: CityState): 'normal' | 'rationing' | 'blackout' {
  const el = city.electricity;
  if (!el) return 'normal';
  const latestBlackout = el.blackouts[0];
  const blackoutToday = Boolean(latestBlackout && latestBlackout.totalDay === city.totalDays);
  if (el.todayCapacityPerHour <= 0 || el.manualCutDistricts.length >= 5) return 'blackout';
  if (blackoutToday && latestBlackout.shortfallPerHour >= el.todayPeakDemandPerHour * 0.5) return 'blackout';
  if (
    blackoutToday
    || el.todayPeakDemandPerHour > el.todayCapacityPerHour
    || el.manualCutDistricts.length > 0
    || el.manualCutCompanies.length > 0
  ) {
    return 'rationing';
  }
  return 'normal';
}

export function buildSaveSummary(city: CityState): VijExportSummary {
  const alive = city.citizens.filter((c) => c.alive);
  const richestCitizen = alive.reduce<(typeof alive)[number] | null>(
    (best, cur) => (!best || cur.savings > best.savings ? cur : best),
    null
  );
  const martClosed = city.mart.closedDaysLeft > 0 || city.mart.closedUntilFunded;
  const companies: VijCompanySummary[] = city.companies.map((comp) => ({
    name: comp.name,
    status: comp.bankrupt ? 'bankrupt' : comp.id === 'vijmart' && martClosed ? 'closed' : 'open',
    cash: Math.round(comp.cash * 100) / 100,
  }));

  return {
    richest: richestCitizen
      ? { name: richestCitizen.name, savings: Math.round(richestCitizen.savings * 100) / 100 }
      : { name: 'None', savings: 0 },
    companies,
    treasury: Math.round(city.treasury * 100) / 100,
    martStatus: martClosed ? 'closed' : 'open',
    gjPowerStatus: getGJPowerStatus(city),
  };
}

export function buildVijSaveBundle(city: CityState, meetings: BoardMeeting[]): VijSaveBundle {
  const simDay = Math.floor(city.totalDays);
  const citizensAlive = city.citizens.filter((c) => c.alive).length;
  return {
    format: 'vij_city_export_v1',
    vijSave: true,
    gameVersion: APP_VERSION,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    simDay,
    citizensAlive,
    summary: buildSaveSummary(city),
    city,
    boardMeetings: meetings,
  };
}
