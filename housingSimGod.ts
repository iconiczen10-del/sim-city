// housingSimGod.ts — SimGod Housing actions (move, evict, rent, condition, condemn, ownership, vacate, wave)

import { applyEmotionPulse } from './citizenEmotions';
import { clamp } from './economy';
import { makeCityEvent } from './eventFactory';
import { formatDelta, formatSimDate } from './formatters';
import { evictCitizenFromHouse, moveCitizenToHouse } from './housingEviction';
import { computeHouseScores, syncCitizenHousingLinks } from './housingScores';
import type { CityState } from './types';

function cloneHousingCity(city: CityState) {
  const next = structuredClone(city);
  const clock = { totalDays: next.totalDays, day: next.day, month: next.month, year: next.year };
  const dateLabel = formatSimDate(next.day, next.month, next.year);
  return { next, clock, dateLabel };
}

export function simGodMoveCitizen(city: CityState, citizenId: string, targetHouseId: string): CityState {
  const { next, clock, dateLabel } = cloneHousingCity(city);
  const cit = next.citizens.find((c) => c.id === citizenId && c.alive);
  const target = next.housing.houses.find((h) => h.id === targetHouseId && !h.condemned);
  if (!cit || !target) return city;
  moveCitizenToHouse({ citizen: cit, target, housing: next.housing, allCitizens: next.citizens, clock, dateLabel, reason: 'Relocated by housing notice', events: next.events, forced: true });
  applyEmotionPulse(cit.emotions, 'fear', 12, `Unexpected relocation to ${target.name}`, clock, dateLabel);
  next.events.unshift(makeCityEvent(clock, `sg_hmove_${cit.id}`, { type: 'simgod', citizenId: cit.id, citizenName: cit.name, title: 'SimGod Relocated Resident', detail: `${cit.name} moved to ${target.name}.` }));
  return next;
}

export function simGodEvictCitizen(city: CityState, citizenId: string): CityState {
  const { next, clock, dateLabel } = cloneHousingCity(city);
  const cit = next.citizens.find((c) => c.id === citizenId && c.alive);
  const house = cit?.homeId ? next.housing.houses.find((h) => h.id === cit.homeId) : undefined;
  if (!cit || !house) return city;
  evictCitizenFromHouse({ citizen: cit, house, housing: next.housing, allCitizens: next.citizens, clock, dateLabel, missedMonths: 0, reason: 'Immediate eviction order', events: next.events });
  next.events.unshift(makeCityEvent(clock, `sg_hevict_${cit.id}`, { type: 'simgod', citizenId: cit.id, citizenName: cit.name, title: 'SimGod Eviction', detail: `Evicted ${cit.name} from ${house.name}.` }));
  return next;
}

export function simGodChangeRent(city: CityState, houseId: string, newRent: number): CityState {
  const { next, clock } = cloneHousingCity(city);
  const house = next.housing.houses.find((h) => h.id === houseId);
  if (!house) return city;
  const old = house.rentPrice;
  house.rentPrice = Math.max(20, Math.round(newRent));
  next.events.unshift(makeCityEvent(clock, `sg_hrent_${house.id}`, { type: 'simgod', title: 'SimGod Rent Change', detail: `${house.name} monthly rent adjusted ${formatDelta(old)} → ${formatDelta(house.rentPrice)}.` }));
  return next;
}

export function simGodChangeCondition(city: CityState, houseId: string, newCond: number): CityState {
  const { next, clock } = cloneHousingCity(city);
  const house = next.housing.houses.find((h) => h.id === houseId);
  if (!house) return city;
  house.condition = Math.round(clamp(newCond, 1, 100));
  house.condemned = false;
  house.scores = computeHouseScores(house, next.citizens.filter((c) => house.occupantIds.includes(c.id)), next.sharity);
  next.events.unshift(makeCityEvent(clock, `sg_hcond_${house.id}`, { type: 'simgod', title: 'SimGod House Condition', detail: `${house.name} condition set to ${house.condition}/100.` }));
  return next;
}

export function simGodCondemnHouse(city: CityState, houseId: string): CityState {
  const { next, clock, dateLabel } = cloneHousingCity(city);
  const house = next.housing.houses.find((h) => h.id === houseId);
  if (!house) return city;
  house.condition = 0;
  house.condemned = true;
  house.forSale = false;
  for (const occId of [...house.occupantIds]) {
    const occ = next.citizens.find((c) => c.id === occId && c.alive);
    if (occ) evictCitizenFromHouse({ citizen: occ, house, housing: next.housing, allCitizens: next.citizens, clock, dateLabel, missedMonths: 0, reason: `${house.name} condemned as unsafe`, events: next.events });
  }
  syncCitizenHousingLinks(next.citizens, next.housing.houses, next.sharity);
  next.events.unshift(makeCityEvent(clock, `sg_hcondemn_${house.id}`, { type: 'simgod', title: 'SimGod Condemned House', detail: `${house.name} condemned and cleared.` }));
  return next;
}

export function simGodTransferOwner(city: CityState, houseId: string, newOwnerId: 'gov' | string): CityState {
  const { next, clock } = cloneHousingCity(city);
  const house = next.housing.houses.find((h) => h.id === houseId);
  if (!house) return city;
  house.ownerId = newOwnerId;
  house.forSale = newOwnerId === 'gov' && house.type !== 'shared_room';
  syncCitizenHousingLinks(next.citizens, next.housing.houses, next.sharity);
  const label = newOwnerId === 'gov' ? 'Government' : next.citizens.find((c) => c.id === newOwnerId)?.name ?? newOwnerId;
  next.events.unshift(makeCityEvent(clock, `sg_hown_${house.id}`, { type: 'simgod', title: 'SimGod Ownership Transfer', detail: `${house.name} transferred to ${label}.` }));
  return next;
}

export function simGodVacateHouse(city: CityState, houseId: string): CityState {
  const { next, clock, dateLabel } = cloneHousingCity(city);
  const house = next.housing.houses.find((h) => h.id === houseId);
  if (!house) return city;
  for (const occId of [...house.occupantIds]) {
    const occ = next.citizens.find((c) => c.id === occId && c.alive);
    if (occ) evictCitizenFromHouse({ citizen: occ, house, housing: next.housing, allCitizens: next.citizens, clock, dateLabel, missedMonths: 0, reason: 'Building cleared for vacancy', events: next.events });
  }
  syncCitizenHousingLinks(next.citizens, next.housing.houses, next.sharity);
  next.events.unshift(makeCityEvent(clock, `sg_hvac_${house.id}`, { type: 'simgod', title: 'SimGod Vacated House', detail: `Cleared all occupants from ${house.name}.` }));
  return next;
}

export function simGodHomelessnessWave(city: CityState, count: number): CityState {
  const { next, clock, dateLabel } = cloneHousingCity(city);
  const housed = next.citizens.filter((c) => c.alive && c.homeId);
  const picked = housed.slice(0, Math.max(1, Math.min(housed.length, count)));
  for (const cit of picked) {
    const house = next.housing.houses.find((h) => h.id === cit.homeId);
    if (house) evictCitizenFromHouse({ citizen: cit, house, housing: next.housing, allCitizens: next.citizens, clock, dateLabel, missedMonths: 0, reason: 'District displacement crisis', events: next.events });
  }
  syncCitizenHousingLinks(next.citizens, next.housing.houses, next.sharity);
  next.events.unshift(makeCityEvent(clock, `sg_hwave_${clock.totalDays}`, { type: 'simgod', title: 'SimGod Homelessness Wave', detail: `Evicted ${picked.length} citizen(s) across Vij.` }));
  return next;
}
