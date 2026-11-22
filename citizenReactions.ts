// citizenReactions.ts — Logical citizen reactions to losses, thefts, gifts, and added items

import { appendChangeExplanation, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { attemptReplacementShopping } from './citizenRebuy';
import { stepDailyStress } from './citizenStress';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { formatPrice } from './formatters';
import type { MartState, ShoppingCategory } from './martTypes';
import type { Citizen, CityEvent } from './types';

export function reactToItemLoss(params: {
  citizen: Citizen;
  mart: MartState;
  clock: SimClock;
  dateLabel: string;
  valueLost: number;
  causeLabel: string;
  category: ShoppingCategory | 'mixed';
  summaryText: string;
  events: CityEvent[];
}): void {
  const { citizen, mart, clock, dateLabel, valueLost, causeLabel, category, summaryText, events } = params;
  if (!citizen.alive || valueLost <= 0) return;

  const bufferScore = citizen.savings / 600 + citizen.traits.discipline / 100;
  const resilience = clamp(1 - bufferScore * 0.14, 0.42, 1.0);
  const relPain = valueLost / Math.max(40, citizen.savings * 0.25 + 60);

  const moodDrop = clamp((4 + relPain * 26) * resilience, 2, 28);
  const stressGain = clamp((5 + relPain * 30) * resilience, 3, 32);
  const prevMood = citizen.mood;
  citizen.mood = Math.round(clamp(citizen.mood - moodDrop, 0, 100) * 10) / 10;

  const stressStep = stepDailyStress(citizen, stressGain);
  citizen.stress = stressStep.stress;
  citizen.stressBreakdown = stressStep.breakdown;

  const memWeight = -Math.round(clamp(16 + relPain * 55, 14, 95));
  addCitizenMemory(
    citizen,
    clock,
    dateLabel,
    'loss',
    `Lost ${summaryText} (${formatPrice(valueLost)}) due to ${causeLabel.toLowerCase()}.`,
    memWeight
  );

  const traitDays = Math.round(45 + (citizen.traits.discipline + citizen.traits.greed) * 0.15);
  citizen.stockoutMemoryDays = Math.max(citizen.stockoutMemoryDays, clamp(traitDays, 45, 70));

  appendLifeLog(
    citizen,
    clock.totalDays,
    dateLabel,
    'loss',
    `Lost ${summaryText} (${formatPrice(valueLost)}) to ${causeLabel.toLowerCase()}; mood -${moodDrop.toFixed(1)}, stress +${stressGain.toFixed(1)}.`
  );

  if (prevMood - citizen.mood >= 8) {
    appendChangeExplanation(
      citizen,
      clock.totalDays,
      dateLabel,
      'mood_drop',
      `Mood dropped ${prevMood.toFixed(0)} → ${citizen.mood.toFixed(0)} after ${causeLabel.toLowerCase()} destroyed ${summaryText}.`
    );
  }

  if (category === 'food' || category === 'water') {
    const leftFood = citizen.inventory.food.reduce((s, b) => s + b.meals, 0);
    const leftWater = citizen.inventory.water.reduce((s, w) => s + w.days, 0);
    if ((category === 'food' && leftFood < 3) || (category === 'water' && leftWater < 2)) {
      attemptReplacementShopping(citizen, mart, category, clock, dateLabel, events);
    }
  }
}

export function reactToReceivedItems(params: {
  citizen: Citizen;
  clock: SimClock;
  dateLabel: string;
  mode: 'gift' | 'theft' | 'added';
  valueAdded: number;
  summaryText: string;
  sourceName?: string;
}): void {
  const { citizen, clock, dateLabel, mode, valueAdded, summaryText, sourceName } = params;
  if (!citizen.alive || valueAdded <= 0) return;

  const moodBoost = mode === 'theft' ? clamp(2 + valueAdded / 50, 2, 8) : clamp(4 + valueAdded / 30, 4, 18);
  citizen.mood = Math.round(clamp(citizen.mood + moodBoost, 0, 100) * 10) / 10;

  if (mode === 'gift') {
    citizen.giftShieldDays = Math.max(citizen.giftShieldDays, 14);
    const stressStep = stepDailyStress(citizen, -clamp(4 + valueAdded / 40, 3, 14));
    citizen.stress = stressStep.stress;
    citizen.stressBreakdown = stressStep.breakdown;
    addCitizenMemory(citizen, clock, dateLabel, 'gift', `Received a generous gift of ${summaryText} (${formatPrice(valueAdded)}).`, clamp(22 + valueAdded / 8, 20, 80));
    appendLifeLog(citizen, clock.totalDays, dateLabel, 'gift', `Received gift: ${summaryText} (${formatPrice(valueAdded)}). Felt relieved.`);
  } else if (mode === 'theft') {
    const thiefNote = sourceName ? ` from ${sourceName}` : '';
    addCitizenMemory(citizen, clock, dateLabel, 'theft_gain', `Acquired stolen goods (${summaryText})${thiefNote}.`, clamp(12 + valueAdded / 25, 10, 35));
    appendLifeLog(citizen, clock.totalDays, dateLabel, 'gift', `Quietly gained ${summaryText} (${formatPrice(valueAdded)}) from a theft.`);
  } else {
    appendLifeLog(citizen, clock.totalDays, dateLabel, 'gift', `Received unexpected supply of ${summaryText} (${formatPrice(valueAdded)}).`);
  }
}
