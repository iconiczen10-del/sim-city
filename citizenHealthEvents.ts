// citizenHealthEvents.ts — Daily hunger/thirst/stress health impact, illness memories, and death handling

import { appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { getStressHealthDrain } from './citizenStress';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { DEATH_CAUSE_LABELS, formatDelta, STANDARD_LABELS } from './formatters';
import type { Citizen, CityEvent, DeathCause } from './types';

export function applyDailyHealthAndAlerts(
  citizen: Citizen,
  foodStd: number,
  waterStd: number,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): void {
  const agePenalty = citizen.age > 55 ? 1.2 : 1.0;
  if (citizen.thirst <= 0) {
    citizen.health = clamp(citizen.health - 34 * agePenalty, 0, 100);
  } else if (citizen.hunger <= 0) {
    citizen.health = clamp(citizen.health - 10 * agePenalty, 0, 100);
  } else {
    const minQuality = Math.min(foodStd, waterStd) as 1 | 2 | 3 | 4 | 5;
    const illnessChance = minQuality === 1 ? 0.025 : minQuality <= 3 ? 0.004 : 0.001;
    if (Math.random() < illnessChance) {
      const hit = minQuality === 1 ? 10 : 6;
      citizen.health = clamp(citizen.health - hit * agePenalty, 0, 100);
      addCitizenMemory(citizen, clock, dateLabel, 'illness', `Fell ill (${STANDARD_LABELS[minQuality]} food/water).`, -26);
      appendLifeLog(citizen, clock.totalDays, dateLabel, 'health', `Fell ill (${STANDARD_LABELS[minQuality]} diet); health -${Math.round(hit * agePenalty)}.`);
      events.push(makeCityEvent(clock, `ill_${citizen.id}`, {
        type: 'illness',
        citizenId: citizen.id,
        citizenName: citizen.name,
        title: 'Citizen Illness',
        detail: `${citizen.name} fell ill (${STANDARD_LABELS[minQuality]} food/water quality).`,
      }));
    } else {
      const recovery = minQuality === 1 ? 1.4 : minQuality <= 3 ? 3.5 : 6;
      citizen.health = clamp(citizen.health + recovery, 0, 100);
    }
  }

  const stressDrain = getStressHealthDrain(citizen.stress);
  if (stressDrain > 0) citizen.health = clamp(citizen.health - stressDrain, 0, 100);

  if (citizen.hunger <= 10 && !citizen.hungerAlerted) {
    citizen.hungerAlerted = true;
    events.push(makeCityEvent(clock, `hung_${citizen.id}`, {
      type: 'hunger', citizenId: citizen.id, citizenName: citizen.name,
      title: 'Severe Hunger', detail: `${citizen.name} has run out of food (hunger ${Math.round(citizen.hunger)}/100).`,
    }));
  } else if (citizen.hunger > 30) citizen.hungerAlerted = false;

  if (citizen.thirst <= 10 && !citizen.thirstAlerted) {
    citizen.thirstAlerted = true;
    events.push(makeCityEvent(clock, `thirst_${citizen.id}`, {
      type: 'thirst', citizenId: citizen.id, citizenName: citizen.name,
      title: 'Severe Dehydration', detail: `${citizen.name} has run out of water (thirst ${Math.round(citizen.thirst)}/100).`,
    }));
  } else if (citizen.thirst > 30) citizen.thirstAlerted = false;
}

export function finalizeCitizenDeath(
  citizen: Citizen,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): number {
  const cause: DeathCause = citizen.thirst <= 0 ? 'dehydration' : citizen.hunger <= 0 ? 'starvation' : 'illness';
  const estate = Math.round(citizen.savings);
  citizen.alive = false;
  citizen.deathDate = dateLabel;
  citizen.deathCause = cause;
  citizen.previousRole = citizen.roleLevel;
  citizen.roleLevel = 'Unemployed';
  citizen.savings = 0;
  citizen.inventory = { food: [], water: [], outfits: [], household: [] };
  appendLifeLog(citizen, clock.totalDays, dateLabel, 'health', `Passed away from ${DEATH_CAUSE_LABELS[cause].toLowerCase()}.`);

  events.push(makeCityEvent(clock, `death_${citizen.id}`, {
    type: 'death', citizenId: citizen.id, citizenName: citizen.name,
    title: `Citizen Deceased (${DEATH_CAUSE_LABELS[cause]})`,
    detail: `${citizen.name} died from ${DEATH_CAUSE_LABELS[cause].toLowerCase()}. ${formatDelta(estate)} went to treasury.`,
  }));
  return estate;
}
