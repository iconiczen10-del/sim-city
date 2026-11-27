// familySimulationStep.ts — Orchestrates daily and monthly aging, relationships, pregnancies, births, youth support, and family achievements

import { runMonthlyAgingAndDeathRolls, stepCitizenBirthdayDaily } from './agingEngine';
import { processDuePregnanciesDaily } from './childBirth';
import { stepConceptionAndPregnancyDaily } from './childConception';
import { stepYouthAndAge25Monthly } from './childYouthStep';
import type { SimClock } from './eventFactory';
import { evaluateFamilyAchievements } from './familyAchievements';
import { applyFamilyEffectsOnDeath } from './familyDeathInheritance';
import { ensureFamilyState } from './familyTreeEngine';
import { syncFamilyTreeStats } from './familyTreeSync';
import { stepRelationshipsDaily } from './relationshipEngine';
import type { Citizen, CityEvent, CityState } from './types';

export function handleSurvivalDeathFamilyEffects(params: {
  deceased: Citizen;
  estate: number;
  city: CityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): number {
  const node = params.city.family?.nodes[params.deceased.id];
  if (node) node.alive = false;
  return applyFamilyEffectsOnDeath(params);
}

export function stepFamilyAndAgingDaily(params: {
  city: CityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { city, clock, dateLabel, events } = params;
  ensureFamilyState(city);
  for (const c of city.citizens) {
    if (c.alive) stepCitizenBirthdayDaily(c, city, clock, dateLabel, events);
  }
  stepRelationshipsDaily(city, clock, dateLabel, events);
  stepConceptionAndPregnancyDaily(city, clock, dateLabel, events);
  processDuePregnanciesDaily(city, clock, dateLabel, events);
  syncFamilyTreeStats(city);
  evaluateFamilyAchievements(city, clock, dateLabel, events);
}

export function stepFamilyAndAgingMonthEnd(params: {
  city: CityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): number {
  const { city, clock, dateLabel, events } = params;
  ensureFamilyState(city);
  const youthDelta = stepYouthAndAge25Monthly(city, clock, dateLabel, events);
  const treasuryDelta = runMonthlyAgingAndDeathRolls(city, clock, dateLabel, events) + youthDelta;
  syncFamilyTreeStats(city);
  evaluateFamilyAchievements(city, clock, dateLabel, events);
  return treasuryDelta;
}
