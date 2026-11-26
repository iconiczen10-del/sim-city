// citizenHealthSystem.ts — 4-part health (physical, mental, immunity, fitness), illness, and breakdown state

import { appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import type { HealthProfile } from './citizenRealTypes';
import { getStressHealthDrain } from './citizenStress';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { STANDARD_LABELS } from './formatters';
import { simRand, simRandInt } from './rng';
import type { Citizen, CitizenTraits, CityEvent } from './types';

function r1(n: number): number { return Math.round(n * 10) / 10; }

export function createSeedHealthProfile(age: number, traits: CitizenTraits, physical: number): HealthProfile {
  const agePenalty = Math.max(0, (age - 38) * 0.25);
  const mental = Math.round(clamp(70 + (traits.resilience + traits.optimism - 100) * 0.16 + simRandInt(-7, 10), 65, 95));
  const immunity = Math.round(clamp(62 + (traits.neatness + traits.discipline - 100) * 0.15 - agePenalty * 0.4 + simRandInt(-8, 12), 50, 85));
  const fitness = Math.round(clamp(60 - agePenalty + (traits.discipline - 50) * 0.16 + simRandInt(-10, 12), 40, 80));
  return { physical: r1(physical), mental, immunity, fitness };
}

export function stepCitizenHealthDaily(
  c: Citizen,
  foodStd: number,
  waterStd: number,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): void {
  const hp = c.healthProfile;
  const n = c.needs;
  const ageMult = c.age > 55 ? 1.2 : 1.0;

  // Immunity & Fitness drift
  const immTarget = clamp(
    42 + foodStd * 8.5 + (n.energy.value - 50) * 0.2 + (n.hygiene.value - 50) * 0.18 + (n.shelter.value - 50) * 0.15 + (c.traits.neatness - 50) * 0.12 - Math.max(0, c.age - 45) * 0.25,
    15, 96
  );
  hp.immunity = r1(clamp(hp.immunity + (immTarget - hp.immunity) * 0.12, 5, 100));

  const laborRole = (c.employerId === 'vijindustries' || c.employerId === 'vijmart') && (c.roleLevel === 'Entry' || c.roleLevel === 'Staff');
  const fitDelta = (laborRole ? 0.18 : c.roleLevel === 'CEO' || c.roleLevel === 'Executive' ? -0.1 : -0.04) - (c.age > 50 ? 0.08 : 0) + (c.traits.discipline > 65 ? 0.06 : 0);
  hp.fitness = r1(clamp(hp.fitness + fitDelta, 10, 100));

  // Physical health, illness, collapse
  const minQuality = Math.min(foodStd, waterStd) as 1 | 2 | 3 | 4 | 5;
  if (c.thirst <= 0) {
    c.health = clamp(c.health - 34 * ageMult, 0, 100);
  } else if (c.hunger <= 0) {
    c.health = clamp(c.health - 10 * ageMult, 0, 100);
  } else if (hp.illnessDaysLeft && hp.illnessDaysLeft > 0) {
    hp.illnessDaysLeft -= 1;
    const hit = (2.6 - (hp.fitness / 100) * 1.1) * ageMult;
    c.health = clamp(c.health - hit, 0, 100);
    if (hp.illnessDaysLeft <= 0) hp.illnessName = undefined;
  } else {
    const immFactor = Math.max(0, (78 - hp.immunity) * 0.00055);
    const hygFactor = n.hygiene.value < 30 ? 0.012 : 0;
    const energyFactor = n.energy.value < 20 ? 0.015 : 0;
    const houseFactor = n.shelter.value < 35 || n.safety.value < 45 ? 0.008 : 0;
    const baseIll = minQuality === 1 ? 0.018 : minQuality <= 3 ? 0.003 : 0.0008;
    const ageIllMult = c.age >= 56 ? 1.35 : 1.0;
    const housingIllMult = (c.housingSatisfaction?.total ?? 50) < 30 ? 1.2 : 1.0;
    if (simRand() < (baseIll + immFactor + hygFactor + energyFactor + houseFactor) * housingIllMult * ageIllMult) {
      const hit = (minQuality === 1 ? 8 : 5) * ageMult;
      c.health = clamp(c.health - hit, 0, 100);
      hp.illnessName = n.hygiene.value < 30 ? 'Hygiene Infection' : minQuality === 1 ? 'Dietary Illness' : 'Seasonal Fever';
      hp.illnessDaysLeft = simRandInt(2, 5);
      addCitizenMemory(c, clock, dateLabel, 'illness', `Fell ill (${hp.illnessName}).`, -24);
      appendLifeLog(c, clock.totalDays, dateLabel, 'health', `Caught ${hp.illnessName.toLowerCase()} (immunity ${Math.round(hp.immunity)}/100).`);
      events.push(makeCityEvent(clock, `ill_${c.id}`, {
        type: 'illness', citizenId: c.id, citizenName: c.name, title: 'Citizen Illness',
        detail: `${c.name} caught ${hp.illnessName} (${STANDARD_LABELS[minQuality]} diet, immunity ${Math.round(hp.immunity)}).`,
      }));
    } else {
      const rec = (minQuality === 1 ? 1.2 : minQuality <= 3 ? 3.2 : 5.2) * (0.8 + hp.fitness / 250) * (0.85 + c.traits.resilience / 300);
      c.health = clamp(c.health + rec, 0, 100);
    }
  }

  if (n.energy.value < 8 && simRand() < 0.25) {
    c.health = clamp(c.health - 4, 0, 100);
    n.energy.value = r1(clamp(n.energy.value + 25, 0, 100));
    appendLifeLog(c, clock.totalDays, dateLabel, 'health', 'Collapsed from exhaustion and had to rest.');
  }
  const stressDrain = getStressHealthDrain(c.stress);
  if (stressDrain > 0) c.health = clamp(c.health - stressDrain, 0, 100);
  hp.physical = r1(c.health);

  // Mental health & breakdown
  let mentalDelta = 0;
  if (c.stress >= 70) mentalDelta -= 1.8;
  else if (c.stress >= 55) mentalDelta -= 0.7;
  if (n.social.value < 32) mentalDelta -= 1.2;
  if (c.emotions.loneliness.value > 45) mentalDelta -= 0.9;
  if (c.roleLevel === 'Unemployed') mentalDelta -= 0.7;
  if (c.rentArrears > 0) mentalDelta -= 0.9;
  if ((c.cancelledUntilDay ?? 0) >= clock.totalDays) mentalDelta -= 1.1;
  if (c.mood >= 62 && c.stress < 42) mentalDelta += 1.1 + c.traits.resilience * 0.01;
  if (n.fun.value >= 60 && n.social.value >= 55) mentalDelta += 0.8;
  hp.mental = r1(clamp(hp.mental + mentalDelta, 0, 100));

  if (hp.mental <= 0 && (hp.breakdownUntilDay ?? 0) < clock.totalDays) {
    const days = simRandInt(7, 14);
    hp.breakdownUntilDay = clock.totalDays + days;
    hp.mental = 18;
    c.stress = r1(clamp(c.stress + 18, 0, 100));
    c.sharityBurnedUntilDay = Math.max(c.sharityBurnedUntilDay ?? 0, clock.totalDays + days);
    addCitizenMemory(c, clock, dateLabel, 'breakdown', `Suffered a mental breakdown (${days}d recovery).`, -40);
    appendLifeLog(c, clock.totalDays, dateLabel, 'health', `Mental breakdown: unable to work for ${days} days.`);
    events.push(makeCityEvent(clock, `brk_${c.id}`, {
      type: 'breakdown', citizenId: c.id, citizenName: c.name,
      title: 'Mental Breakdown', detail: `${c.name} suffered a mental breakdown and cannot work for ${days} days.`,
    }));
  }

  if (c.hunger <= 10 && !c.hungerAlerted) {
    c.hungerAlerted = true;
    events.push(makeCityEvent(clock, `hung_${c.id}`, { type: 'hunger', citizenId: c.id, citizenName: c.name, title: 'Severe Hunger', detail: `${c.name} ran out of food (hunger ${Math.round(c.hunger)}/100).` }));
  } else if (c.hunger > 30) c.hungerAlerted = false;

  if (c.thirst <= 10 && !c.thirstAlerted) {
    c.thirstAlerted = true;
    events.push(makeCityEvent(clock, `thirst_${c.id}`, { type: 'thirst', citizenId: c.id, citizenName: c.name, title: 'Severe Dehydration', detail: `${c.name} ran out of water (thirst ${Math.round(c.thirst)}/100).` }));
  } else if (c.thirst > 30) c.thirstAlerted = false;
}
