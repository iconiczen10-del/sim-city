// citizenConsumption.ts — Daily citizen consumption, wear, meal decisions, and contamination sickness

import { appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { applyContaminationPoisoning } from './citizenPoisoning';
import { recordMealDecision } from './citizenSurvivalDecisions';
import { FOOD_SPOIL_DAYS, OUTFIT_WEAR_DAYS } from './constants';
import { clamp } from './economy';
import { hasWorkingAppliance } from './electronicsCitizen';
import type { SimClock } from './eventFactory';
import { STANDARD_LABELS } from './formatters';
import type { LivingStandard, MartState } from './martTypes';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent } from './types';

export function consumeFoodAndWater(
  citizen: Citizen,
  mart: MartState,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): { foodStd: LivingStandard; waterStd: LivingStandard } {
  const keptFood = [];
  let spoiledTotal = 0;

  const ageStep = hasWorkingAppliance(citizen, 'fridge') ? 1 : 2;
  for (const batch of citizen.inventory.food) {
    const nextAge = batch.daysOld + ageStep;
    if (nextAge >= FOOD_SPOIL_DAYS) spoiledTotal += batch.meals;
    else if (batch.meals > 0) keptFood.push({ ...batch, daysOld: nextAge });
  }
  citizen.inventory.food = keptFood;

  if (spoiledTotal > 0) {
    mart.wasteLog.unshift({
      id: `waste_c_${clock.totalDays}_${citizen.id}`,
      dateLabel,
      source: 'citizen',
      ownerName: citizen.name,
      category: 'food',
      standard: 1,
      quantity: spoiledTotal,
      reason: 'spoiled',
    });
    appendLifeLog(citizen, clock.totalDays, dateLabel, 'loss', `${spoiledTotal} stored meal(s) spoiled at home.`);
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'shopping', subType: 'spoilage',
      subjectId: citizen.id, subjectKind: 'citizen', subjectName: citizen.name,
      summary: `${citizen.name} lost ${spoiledTotal} stored meal(s) to spoilage`,
      detail: { source: 'citizen', category: 'food', quantity: spoiledTotal, hasWorkingFridge: hasWorkingAppliance(citizen, 'fridge') },
    });
  }

  citizen.hunger = clamp(citizen.hunger - 36, 0, 100);
  citizen.thirst = clamp(citizen.thirst - 45, 0, 100);

  const availBefore = citizen.inventory.food.reduce((s, b) => s + b.meals, 0);
  let mealsToEat = 3;
  let foodStd: LivingStandard = citizen.standards.food;
  let ateContam = false;
  citizen.inventory.food.sort((a, b) => b.daysOld - a.daysOld);

  const hasCooker = hasWorkingAppliance(citizen, 'cooker');
  for (const batch of citizen.inventory.food) {
    if (mealsToEat <= 0) break;
    const take = Math.min(batch.meals, mealsToEat);
    batch.meals -= take;
    mealsToEat -= take;
    foodStd = (hasCooker ? batch.standard : Math.max(1, batch.standard - 1)) as LivingStandard;
    citizen.hunger = clamp(citizen.hunger + take * 13, 0, 100);
    if (batch.contaminated && batch.contaminated > 0) {
      batch.contaminated = Math.max(0, batch.contaminated - take);
      ateContam = true;
    }
  }
  const mealsEaten = 3 - mealsToEat;
  citizen.inventory.food = citizen.inventory.food.filter((b) => b.meals > 0);
  if (mealsEaten < 3 || availBefore <= 6 || clock.totalDays % 3 === 1) {
    recordMealDecision({ citizen, totalDay: clock.totalDays, dateLabel, mealsEaten, availableBefore: availBefore });
  }
  if (mealsEaten > 0) {
    appendLifeLog(citizen, clock.totalDays, dateLabel, 'meal', `Ate ${mealsEaten} ${STANDARD_LABELS[foodStd]} meal(s).`);
  } else {
    appendLifeLog(citizen, clock.totalDays, dateLabel, 'meal', 'Skipped meals (no food in inventory).');
    if (citizen.hunger < 25) addCitizenMemory(citizen, clock, dateLabel, 'hunger', 'Went hungry with empty kitchen.', -32);
  }
  if (ateContam) applyContaminationPoisoning(citizen, mart, clock, dateLabel, events, 'food');

  let waterStd: LivingStandard = citizen.standards.water;
  if (citizen.inventory.water.length > 0 && citizen.inventory.water[0].days > 0) {
    const wBatch = citizen.inventory.water[0];
    wBatch.days -= 1;
    waterStd = wBatch.standard;
    citizen.thirst = clamp(citizen.thirst + 47, 0, 100);
    if (wBatch.contaminated && wBatch.contaminated > 0) {
      wBatch.contaminated -= 1;
      applyContaminationPoisoning(citizen, mart, clock, dateLabel, events, 'water');
    }
    citizen.inventory.water = citizen.inventory.water.filter((w) => w.days > 0);
  } else if (citizen.thirst < 25) {
    addCitizenMemory(citizen, clock, dateLabel, 'thirst', 'Ran out of clean drinking water.', -42);
    appendLifeLog(citizen, clock.totalDays, dateLabel, 'health', 'No drinking water left today.');
  }

  return { foodStd, waterStd };
}

export function wearClothesAndHousehold(
  citizen: Citizen,
  mart: MartState,
  totalDays: number,
  dateLabel: string
): void {
  if (citizen.inventory.outfits.length > 0) {
    const outfit = citizen.inventory.outfits[0];
    outfit.condition = clamp(outfit.condition - 100 / OUTFIT_WEAR_DAYS, 0, 100);
    if (outfit.condition <= 0) {
      citizen.inventory.outfits.shift();
      mart.wasteLog.unshift({
        id: `wear_${totalDays}_${citizen.id}`,
        dateLabel,
        source: 'citizen',
        ownerName: citizen.name,
        category: 'clothes',
        standard: outfit.standard,
        quantity: 1,
        reason: 'worn_out',
      });
    }
  }

  if (citizen.inventory.household.length > 0) {
    citizen.inventory.household[0].daysLeft -= 1;
    if (citizen.inventory.household[0].daysLeft <= 0) {
      citizen.inventory.household.shift();
    }
  }
}
