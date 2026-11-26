// recordsExport.ts — Ordered full-archive indented UTF-8 JSON export builder with SimCity Saves compatibility

import type { BoardMeeting } from './boardTypes';
import { APP_VERSION } from './constants';
import { formatSimDate } from './formatters';
import { getRecordsIndex } from './recordsStore';
import type { SimRecordEntry } from './recordTypes';
import { buildSaveSummary } from './saveExport';
import type { CityState } from './types';

function countBySubject(records: SimRecordEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of records) counts.set(r.subjectId, (counts.get(r.subjectId) ?? 0) + 1);
  return counts;
}

export function buildRecordsExportJson(
  city: CityState,
  meetings: BoardMeeting[],
  allRecords: SimRecordEntry[]
): string {
  const simDay = Math.floor(city.totalDays);
  const dateLabel = formatSimDate(city.day, city.month, city.year);
  const exportedAt = new Date().toISOString();
  const orderedRecords = [...allRecords].sort((a, b) => a.seq - b.seq);
  const bySubject = countBySubject(orderedRecords);
  const idx = getRecordsIndex();

  const aliveCitizens = city.citizens.filter((c) => c.alive);
  const ownedApps = city.citizens.flatMap((c) => c.inventory.electronics ?? []);
  const el = city.electricity;

  const payload = {
    format: 'vij_city_export_v1' as const,
    vijSave: true as const,
    gameVersion: APP_VERSION,
    version: APP_VERSION,
    exportedAt,
    simDay,
    citizensAlive: aliveCitizens.length,
    summary: buildSaveSummary(city),
    info: {
      cityName: city.cityName,
      seed: city.seed,
      simDay,
      dateLabel,
      gameVersion: APP_VERSION,
      exportedAt,
      totalRecords: orderedRecords.length,
    },
    index: {
      ...idx,
      totalCount: orderedRecords.length,
    },
    city,
    citizens: {
      alive: aliveCitizens.length,
      total: city.citizens.length,
      homeless: aliveCitizens.filter((c) => !c.homeId).length,
      items: city.citizens.map((c) => ({
        id: c.id,
        name: c.name,
        alive: c.alive,
        tier: c.tier,
        roleLevel: c.roleLevel,
        employerId: c.employerId,
        homeId: c.homeId,
        savings: Math.round(c.savings * 100) / 100,
        mood: Math.round(c.mood * 10) / 10,
        recordCount: bySubject.get(c.id) ?? 0,
      })),
    },
    companies: city.companies.map((comp) => ({
      id: comp.id,
      name: comp.name,
      cash: Math.round(comp.cash * 100) / 100,
      bankrupt: comp.bankrupt,
      reputation: comp.reputation,
      staffCount: aliveCitizens.filter((c) => c.employerId === comp.id).length,
      recordCount: bySubject.get(comp.id) ?? 0,
    })),
    houses: city.housing.houses.map((h) => ({
      id: h.id,
      name: h.name,
      district: h.district,
      type: h.type,
      ownerId: h.ownerId,
      occupantCount: h.occupantIds.length,
      rentPrice: h.rentPrice,
      condition: h.condition,
      recordCount: bySubject.get(h.id) ?? 0,
    })),
    mart: {
      cash: Math.round(city.mart.cash * 100) / 100,
      reputation: city.mart.reputation,
      rationingActive: city.mart.rationingActive,
      closed: city.mart.closedDaysLeft > 0 || city.mart.closedUntilFunded,
      stockSkus: city.mart.stock.length,
      recordCount: orderedRecords.filter((r) => r.category === 'mart' || r.subjectId === 'vijmart').length,
    },
    electricity: el ? {
      tariff: el.tariff,
      capacityPerHour: el.todayCapacityPerHour,
      peakDemandPerHour: el.todayPeakDemandPerHour,
      plantCount: el.plants.length,
      blackoutCount: el.blackouts.length,
      recordCount: orderedRecords.filter((r) => r.category === 'electricity' || r.category === 'gjelectricity').length,
    } : null,
    electronics: {
      ownedTotal: ownedApps.length,
      brokenTotal: ownedApps.filter((a) => a.broken).length,
      martSkus: (city.mart.electronicsStock ?? []).length,
      recordCount: orderedRecords.filter((r) => r.category === 'electronics').length,
    },
    simgod: {
      totalActions: orderedRecords.filter((r) => r.simgodMarked || r.category === 'simgod').length,
      entries: orderedRecords.filter((r) => r.simgodMarked || r.category === 'simgod'),
    },
    cityWide: {
      treasury: Math.round(city.treasury * 100) / 100,
      avgMood: aliveCitizens.length > 0 ? Math.round((aliveCitizens.reduce((s, c) => s + c.mood, 0) / aliveCitizens.length) * 10) / 10 : 0,
      entries: orderedRecords.filter((r) => r.category === 'city'),
    },
    records: orderedRecords,
    boardMeetings: meetings,
  };

  return JSON.stringify(payload, null, 2);
}
