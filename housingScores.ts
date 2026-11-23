// housingScores.ts — Compute house scores (comfort, space, noise, privacy, safety), landlord rents, and citizen sync

import { clamp } from './economy';
import { DISTRICTS, HOUSE_SPECS } from './housingCatalog';
import type { House, HouseScores } from './housingTypes';
import { getAffinity } from './sharityAffinity';
import type { SharityState } from './sharityTypes';
import type { Citizen } from './types';

function r1(n: number): number {
  return Math.round(clamp(n, 0, 100) * 10) / 10;
}

export function computeHouseScores(
  house: House,
  occupants: Citizen[] = [],
  sharity?: SharityState
): HouseScores {
  if (house.condemned || house.condition <= 0) {
    return { comfort: 0, space: 0, noise: 95, privacy: 0, safety: 0 };
  }
  const spec = HOUSE_SPECS[house.type];
  const dist = DISTRICTS[house.district];
  const count = house.occupantIds.length;

  let comfort = spec.baseComfort * (house.condition / 100);
  if (house.condition < 40) comfort -= (40 - house.condition) * 0.45;

  let space = 100;
  if (count > 0) {
    const ratio = count / house.capacity;
    space = ratio > 1 ? Math.max(10, 40 - (ratio - 1) * 35) : 100 - ratio * 35;
  }

  let conflictNoise = 0;
  if (sharity && occupants.length > 1) {
    for (let i = 0; i < occupants.length; i += 1) {
      for (let j = i + 1; j < occupants.length; j += 1) {
        if (getAffinity(sharity, occupants[i].id, occupants[j].id) < 0) conflictNoise += 7;
      }
    }
  }
  const crowdNoise = Math.max(0, count - 1) * (house.type === 'shared_room' ? 10 : 4);
  const noise = r1(dist.noiseBase + crowdNoise + conflictNoise);

  let privacy = 100;
  if (count <= 1) privacy = 100;
  else if (house.type === 'shared_room') privacy = Math.max(15, 34 - (count - 2) * 10);
  else privacy = Math.max(25, 100 - (count - 1) * 26);

  let safety = dist.safetyBase;
  if (house.condition < 40) safety -= (40 - house.condition) * 0.55;
  if (count > house.capacity) safety -= 12;

  return { comfort: r1(comfort), space: r1(space), noise, privacy: r1(privacy), safety: r1(safety) };
}

export function computeLandlordRent(baseRent: number, landlord: Citizen | undefined): number {
  if (!landlord) return baseRent;
  const bias = (landlord.traits.greed - landlord.traits.kindness) / 100;
  const mult = clamp(1.08 + bias * 0.38, 0.8, 1.5);
  return Math.max(40, Math.round(baseRent * mult));
}

export function getHouseMonthlyMaintenance(house: House): number {
  const spec = HOUSE_SPECS[house.type];
  if (house.ownerId === 'gov') {
    return Math.round((spec.govMaint[0] + spec.govMaint[1]) / 2);
  }
  return spec.citMaint;
}

export function getTenantMonthlyRent(house: House): number {
  const count = Math.max(1, house.occupantIds.length);
  if (house.type === 'shared_room') return house.rentPrice;
  return Math.round(house.rentPrice / count);
}

export function syncCitizenHousingLinks(citizens: Citizen[], houses: House[], sharity?: SharityState): void {
  const byCit = new Map(citizens.map((c) => [c.id, c]));
  for (const h of houses) {
    h.occupantIds = h.occupantIds.filter((id) => byCit.get(id)?.alive);
    const occ = h.occupantIds.map((id) => byCit.get(id)!).filter(Boolean);
    h.scores = computeHouseScores(h, occ, sharity);
  }

  for (const c of citizens) {
    const ownedIds = houses.filter((h) => h.ownerId === c.id).map((h) => h.id);
    c.ownedHouseIds = ownedIds;
    if (!c.alive) {
      c.homeId = null;
      c.roommateIds = [];
      continue;
    }
    const home = houses.find((h) => h.occupantIds.includes(c.id)) ?? null;
    if (!home) {
      c.homeId = null;
      c.landlordId = null;
      c.ownershipType = 'homeless';
      c.roommateIds = [];
    } else {
      c.homeId = home.id;
      c.homeType = home.type;
      c.landlordId = home.ownerId === 'gov' || home.ownerId === c.id ? null : home.ownerId;
      c.ownershipType = home.ownerId === c.id ? 'owned' : 'rented';
      c.roommateIds = home.occupantIds.filter((id) => id !== c.id);
    }
  }
}
