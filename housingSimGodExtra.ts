// housingSimGodExtra.ts — Part 3 SimGod housing powers: rent raise, boom/bust, force sell-back, shortage, force roommates

import { applyEmotionPulse } from './citizenEmotions';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { makeCityEvent } from './eventFactory';
import { formatDelta } from './formatters';
import { HOUSE_SPECS } from './housingCatalog';
import { evictCitizenFromHouse, moveCitizenToHouse } from './housingEviction';
import { syncCitizenHousingLinks } from './housingScores';
import type { DistrictId } from './housingTypes';
import type { CityState } from './types';

function cloneState(city: CityState) {
  const next = structuredClone(city);
  const clock = { totalDays: next.totalDays, day: next.day, month: next.month, year: next.year };
  const dateLabel = `${next.day}/${next.month}/Y${next.year}`;
  return { next, clock, dateLabel };
}

export function simGodRaiseHouseRent(city: CityState, houseId: string, pct = 25): CityState {
  const { next, clock, dateLabel } = cloneState(city);
  const h = next.housing.houses.find((x) => x.id === houseId);
  if (!h) return city;
  const old = h.rentPrice;
  h.rentPrice = Math.max(40, Math.round(old * (1 + pct / 100)));
  for (const occId of h.occupantIds) {
    const occ = next.citizens.find((c) => c.id === occId && c.alive);
    if (!occ) continue;
    occ.seekingHousing = true;
    occ.housingEvalUrgent = true;
    applyEmotionPulse(occ.emotions, 'anger', 20, `${h.name} forced rent raise`, clock, dateLabel);
  }
  next.events.unshift(makeCityEvent(clock, `sg_hraise_${h.id}`, { type: 'rent-raise', title: 'SimGod Forced Rent Raise', detail: `${h.name} rent raised ${formatDelta(old)} → ${formatDelta(h.rentPrice)} (+${pct}%).` }));
  return next;
}

export function simGodDistrictMarketShift(city: CityState, district: DistrictId, mode: 'boom' | 'bust'): CityState {
  const { next, clock } = cloneState(city);
  const mult = mode === 'boom' ? 1.2 : 0.8;
  for (const h of next.housing.houses) {
    if (h.district !== district || h.condemned) continue;
    h.baseRent = Math.max(40, Math.round(h.baseRent * mult));
    h.rentPrice = Math.max(40, Math.round(h.rentPrice * mult));
    if (h.buyPrice !== null) h.buyPrice = Math.max(4000, Math.round(h.buyPrice * mult));
  }
  if (next.housing.districtMetrics?.[district]) {
    const m = next.housing.districtMetrics[district];
    m.rentTrend = mode === 'boom' ? 'up' : 'down';
    m.lastDriftPct = mode === 'boom' ? 20 : -20;
  }
  next.events.unshift(makeCityEvent(clock, `sg_hmkt_${district}`, { type: 'simgod', title: `SimGod District ${mode === 'boom' ? 'Boom' : 'Bust'}`, detail: `${district} rents shifted ${mode === 'boom' ? '+20%' : '-20%'}.` }));
  return next;
}

export function simGodForceSellBack(city: CityState, houseId: string): CityState {
  const { next, clock, dateLabel } = cloneState(city);
  const h = next.housing.houses.find((x) => x.id === houseId);
  if (!h || h.ownerId === 'gov') return city;
  const owner = next.citizens.find((c) => c.id === h.ownerId);
  const orig = h.originalBuyPrice ?? h.buyPrice ?? HOUSE_SPECS[h.type].baseBuyPrice ?? 15000;
  const payout = Math.round(orig * 0.85);
  if (owner) {
    owner.savings = Math.round((owner.savings + payout) * 100) / 100;
    appendLedgerEntry(owner, clock.totalDays, dateLabel, 'income', 'Property Sale', `Sold ${h.name} to Gov`, payout);
    appendLifeLog(owner, clock.totalDays, dateLabel, 'money', `Sold ${h.name} back to government for ${formatDelta(payout)}.`);
    applyEmotionPulse(owner.emotions, 'sadness', 20, `Forced sale of ${h.name}`, clock, dateLabel);
  }
  next.treasury = Math.round((next.treasury - payout) * 100) / 100;
  h.ownerId = 'gov';
  h.forSale = h.type !== 'shared_room' && !h.condemned;
  next.housing.transactions.unshift({ id: `htx_sgsell_${clock.totalDays}_${h.id}`, day: clock.totalDays, dateLabel, kind: 'sold', citizenId: owner?.id ?? '', citizenName: owner?.name ?? 'Owner', houseId: h.id, houseName: h.name, amount: payout, note: 'Forced sale back to government' });
  syncCitizenHousingLinks(next.citizens, next.housing.houses, next.sharity);
  next.events.unshift(makeCityEvent(clock, `sg_hsell_${h.id}`, { type: 'sold-house', citizenId: owner?.id, citizenName: owner?.name, title: 'SimGod Forced Sell-Back', detail: `${h.name} sold back to government for ${formatDelta(payout)}.` }));
  return next;
}

export function simGodHousingShortage(city: CityState, houseCount: number, days: number): CityState {
  const { next, clock, dateLabel } = cloneState(city);
  const active = next.housing.houses.filter((h) => !h.condemned && !h.maintenanceUntilDay).slice(0, Math.max(1, Math.min(20, houseCount)));
  for (const h of active) {
    h.maintenanceUntilDay = clock.totalDays + Math.max(1, days);
    for (const occId of [...h.occupantIds]) {
      const occ = next.citizens.find((c) => c.id === occId && c.alive);
      if (occ) evictCitizenFromHouse({ citizen: occ, house: h, housing: next.housing, allCitizens: next.citizens, clock, dateLabel, missedMonths: 0, reason: `Emergency maintenance (${days}d shortage)`, events: next.events });
    }
  }
  syncCitizenHousingLinks(next.citizens, next.housing.houses, next.sharity);
  next.events.unshift(makeCityEvent(clock, `sg_hshort_${clock.totalDays}`, { type: 'simgod', title: 'SimGod Housing Shortage', detail: `Closed ${active.length} residences for ${days} days of urgent maintenance.` }));
  return next;
}

export function simGodForceRoommates(city: CityState, citizenAId: string, citizenBId: string, houseId: string): CityState {
  const { next, clock, dateLabel } = cloneState(city);
  const a = next.citizens.find((c) => c.id === citizenAId && c.alive);
  const b = next.citizens.find((c) => c.id === citizenBId && c.alive);
  const h = next.housing.houses.find((x) => x.id === houseId && !x.condemned);
  if (!a || !b || !h || a.id === b.id) return city;
  moveCitizenToHouse({ citizen: a, target: h, housing: next.housing, allCitizens: next.citizens, clock, dateLabel, reason: 'Assigned shared residence', events: next.events, forced: true });
  moveCitizenToHouse({ citizen: b, target: h, housing: next.housing, allCitizens: next.citizens, clock, dateLabel, reason: 'Assigned shared residence', events: next.events, forced: true });
  syncCitizenHousingLinks(next.citizens, next.housing.houses, next.sharity);
  next.events.unshift(makeCityEvent(clock, `sg_hroom_${h.id}`, { type: 'simgod', title: 'SimGod Forced Roommates', detail: `Paired ${a.name} and ${b.name} inside ${h.name}.` }));
  return next;
}
