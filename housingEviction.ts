// housingEviction.ts — Atomic citizen moves and evictions with 40% inventory loss, records, emotions, and history

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { applyEmotionPulse } from './citizenEmotions';
import { appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import { HOME_TYPE_ORDER } from './housingPreferences';
import { syncCitizenHousingLinks } from './housingScores';
import type { House, HousingState } from './housingTypes';
import { makeCityEvent, type SimClock } from './eventFactory';
import { moveDependentsWithCaregiver, releaseDependentsFromLostHouse } from './familyHousingMove';
import { formatDelta } from './formatters';
import { simRandInt } from './rng';
import type { Citizen, CityEvent } from './types';

function closeActiveHistory(c: Citizen, day: number, dateLabel: string, reason: string): void {
  const open = (c.housingHistory ?? []).find((h) => !h.endDay);
  if (open) { open.endDay = day; open.endDate = dateLabel; open.reason = reason; }
}

export function moveCitizenToHouse(params: {
  citizen: Citizen;
  target: House;
  housing: HousingState;
  allCitizens: Citizen[];
  clock: SimClock;
  dateLabel: string;
  reason: string;
  events: CityEvent[];
  forced?: boolean;
}): void {
  const { citizen, target, housing, allCitizens, clock, dateLabel, reason, events, forced } = params;
  const oldHouseId = citizen.homeId ?? null;
  let upgraded = false;
  if (oldHouseId) {
    const oldHouse = housing.houses.find((h) => h.id === oldHouseId);
    if (oldHouse) {
      oldHouse.occupantIds = oldHouse.occupantIds.filter((id) => id !== citizen.id);
      upgraded = HOME_TYPE_ORDER.indexOf(target.type) > HOME_TYPE_ORDER.indexOf(oldHouse.type);
    }
    closeActiveHistory(citizen, clock.totalDays, dateLabel, reason);
  }
  if (!target.occupantIds.includes(citizen.id)) target.occupantIds.push(citizen.id);
  if (target.occupantIds.length === 1) target.leaseStartDay = clock.totalDays;
  if (!reason.startsWith('Invited in by friend')) citizen.friendRentDiscount = 1;
  citizen.seekingHousing = false;
  citizen.homelessDays = 0;
  citizen.rentArrears = 0;
  citizen.rentArrearsMonths = 0;
  if (upgraded) applyEmotionPulse(citizen.emotions, 'joy', 20, `Moved up into ${target.name}`, clock, dateLabel);

  const ownership: 'owned' | 'rented' = target.ownerId === citizen.id ? 'owned' : 'rented';
  citizen.housingHistory = [
    { houseId: target.id, houseName: target.name, type: target.type, district: target.district, ownership, startDay: clock.totalDays, startDate: dateLabel, reason },
    ...(citizen.housingHistory ?? []),
  ].slice(0, 30);

  moveDependentsWithCaregiver({ caregiver: citizen, oldHouseId, target, housing, allCitizens, clock, dateLabel });
  syncCitizenHousingLinks(allCitizens, housing.houses);
  housing.transactions.unshift({
    id: `htx_move_${clock.totalDays}_${citizen.id}`,
    day: clock.totalDays, dateLabel, kind: 'moved', citizenId: citizen.id, citizenName: citizen.name,
    houseId: target.id, houseName: target.name, amount: target.rentPrice, note: reason,
  });
  housing.transactions = housing.transactions.slice(0, 80);

  events.push(makeCityEvent(clock, `move_${citizen.id}_${target.id}`, {
    type: 'moved', citizenId: citizen.id, citizenName: citizen.name,
    title: forced ? 'Forced Relocation' : 'Citizen Moved House',
    detail: `${citizen.name} moved into ${target.name} (${reason}).`,
  }));
  appendLifeLog(citizen, clock.totalDays, dateLabel, 'money', `Moved into ${target.name} (${reason}).`);
}

export function evictCitizenFromHouse(params: {
  citizen: Citizen;
  house: House;
  housing: HousingState;
  allCitizens: Citizen[];
  clock: SimClock;
  dateLabel: string;
  missedMonths: number;
  reason: string;
  events: CityEvent[];
}): void {
  const { citizen, house, housing, allCitizens, clock, dateLabel, missedMonths, reason, events } = params;
  house.occupantIds = house.occupantIds.filter((id) => id !== citizen.id);
  releaseDependentsFromLostHouse(citizen, house, allCitizens);
  closeActiveHistory(citizen, clock.totalDays, dateLabel, reason);

  // Lose 40% of household inventory randomly on eviction
  const hh = citizen.inventory.household;
  const dropCount = hh.length > 0 ? Math.max(1, Math.round(hh.length * 0.4)) : 0;
  for (let i = 0; i < dropCount && hh.length > 0; i += 1) {
    hh.splice(simRandInt(0, hh.length - 1), 1);
  }

  citizen.evictionRecords = [
    { day: clock.totalDays, dateLabel, houseId: house.id, houseName: house.name, landlordId: house.ownerId, reason },
    ...(citizen.evictionRecords ?? []),
  ].slice(0, 12);
  house.evictionHistory = [
    { day: clock.totalDays, dateLabel, citizenId: citizen.id, citizenName: citizen.name, missedMonths, reason },
    ...house.evictionHistory,
  ].slice(0, 20);

  citizen.homeId = null;
  citizen.landlordId = null;
  citizen.ownershipType = 'homeless';
  citizen.roommateIds = [];
  citizen.rentArrears = 0;
  citizen.rentArrearsMonths = 0;
  citizen.seekingHousing = citizen.youngAdultPhase !== 'dependent_youth';
  citizen.housingEvalUrgent = citizen.youngAdultPhase !== 'dependent_youth';
  citizen.friendRentDiscount = 1;
  citizen.homelessDays = Math.max(1, citizen.homelessDays ?? 0);

  applyEmotionPulse(citizen.emotions, 'shame', 28 + citizen.traits.pride * 0.15, `Evicted from ${house.name}`, clock, dateLabel);
  applyEmotionPulse(citizen.emotions, 'anger', 26, `Lost belongings during eviction from ${house.name}`, clock, dateLabel);
  applyEmotionPulse(citizen.emotions, 'fear', 22, 'Now without housing', clock, dateLabel);
  citizen.stress = Math.round(clamp(citizen.stress + 18, 0, 100) * 10) / 10;

  addCitizenMemory(citizen, clock, dateLabel, 'loss', `Evicted from ${house.name} (${reason}). Lost ${dropCount} household item(s).`, -42);
  appendLifeLog(citizen, clock.totalDays, dateLabel, 'loss', `Evicted from ${house.name}; lost belongings and entered housing search.`);
  recordConsequentialDecision({
    citizen, clock, dateLabel, kind: 'housing_move', category: 'housing',
    title: `Evicted from ${house.name}`, chosenOption: 'Vacate & Search Housing', altOption: `Pay ${formatDelta(house.rentPrice)} Rent`,
    chosenReason: reason, chosenFactors: [{ label: 'Eviction Notice', value: 40 }], altFactors: [{ label: 'Insufficient Cash', value: -35 }],
    diarySentence: `Forced out of ${house.name} (${reason}).`,
  });

  syncCitizenHousingLinks(allCitizens, housing.houses);
  housing.evictionsThisMonth += 1;
  housing.transactions.unshift({
    id: `htx_evict_${clock.totalDays}_${citizen.id}`,
    day: clock.totalDays, dateLabel, kind: 'evicted', citizenId: citizen.id, citizenName: citizen.name,
    houseId: house.id, houseName: house.name, note: reason,
  });
  housing.transactions = housing.transactions.slice(0, 80);

  events.push(makeCityEvent(clock, `evict_${citizen.id}_${house.id}`, {
    type: 'eviction', citizenId: citizen.id, citizenName: citizen.name,
    title: 'Citizen Evicted', detail: `${citizen.name} was evicted from ${house.name}: ${reason}.`,
  }));
}
