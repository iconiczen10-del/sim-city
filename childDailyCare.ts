// childDailyCare.ts — Parent-paid daily food & water for dependent children with in-kind sharing backup

import { appendLifeLog } from './citizenLedger';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import type { HousingState } from './housingTypes';
import { purchaseFromMart } from './martShopping';
import type { MartState } from './martTypes';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent } from './types';

function shareFoodInKind(child: Citizen, providers: Citizen[], needed: number, clock: SimClock, dateLabel: string): number {
  const donor = providers.find((p) => p.inventory.food.reduce((s, b) => s + b.meals, 0) >= 4);
  if (!donor) return 0;
  let rem = needed;
  for (const batch of donor.inventory.food) {
    if (rem <= 0) break;
    const give = Math.min(rem, Math.max(0, batch.meals - 1));
    if (give > 0) {
      batch.meals -= give;
      rem -= give;
      child.inventory.food.push({ ...batch, meals: give });
    }
  }
  donor.inventory.food = donor.inventory.food.filter((b) => b.meals > 0);
  const gave = needed - rem;
  if (gave > 0 && clock.totalDays % 5 === 1) {
    appendLifeLog(child, clock.totalDays, dateLabel, 'meal', `Received ${gave} home-shared meal(s) from ${donor.name}.`);
  }
  return gave;
}

function shareWaterInKind(child: Citizen, providers: Citizen[]): number {
  const donor = providers.find((p) => p.inventory.water.reduce((s, w) => s + w.days, 0) >= 2);
  if (!donor || !donor.inventory.water[0]) return 0;
  donor.inventory.water[0].days -= 1;
  child.inventory.water.push({ ...donor.inventory.water[0], days: 1 });
  donor.inventory.water = donor.inventory.water.filter((w) => w.days > 0);
  return 1;
}

export function supplyDependentChildrenDailyCare(
  citizens: Citizen[],
  mart: MartState,
  housing: HousingState,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): void {
  const byId = new Map(citizens.map((c) => [c.id, c]));

  for (const child of citizens) {
    if (!child.alive || child.age >= 25 || child.youngAdultPhase !== 'dependent_youth') continue;
    const providerIds = [...(child.parentIds ?? []), ...(child.guardianId && child.guardianId !== 'treasury' ? [child.guardianId] : [])];
    const providers = providerIds
      .map((id) => byId.get(id))
      .filter((p): p is Citizen => Boolean(p && p.alive))
      .sort((a, b) => b.savings - a.savings);
    if (providers.length === 0) continue;

    let childMeals = child.inventory.food.reduce((s, b) => s + b.meals, 0);
    let shortfall = false;
    if (childMeals < 3) {
      const needed = 3 - childMeals;
      for (const payer of providers) {
        if (childMeals >= 3) break;
        purchaseFromMart(child, mart, 'food', child.standards.food, 3 - childMeals, clock, dateLabel, events, { payer, housing, ledgerCategory: 'Child Food/Water' });
        childMeals = child.inventory.food.reduce((s, b) => s + b.meals, 0);
      }
      if (childMeals < 3) {
        shareFoodInKind(child, providers, 3 - childMeals, clock, dateLabel);
        childMeals = child.inventory.food.reduce((s, b) => s + b.meals, 0);
      }
      if (childMeals < 3 && needed > 0) shortfall = true;
    }

    let childWater = child.inventory.water.reduce((s, w) => s + w.days, 0);
    if (childWater < 1) {
      for (const payer of providers) {
        if (childWater >= 1) break;
        purchaseFromMart(child, mart, 'water', child.standards.water, 1, clock, dateLabel, events, { payer, housing, ledgerCategory: 'Child Food/Water' });
        childWater = child.inventory.water.reduce((s, w) => s + w.days, 0);
      }
      if (childWater < 1) {
        shareWaterInKind(child, providers);
        childWater = child.inventory.water.reduce((s, w) => s + w.days, 0);
      }
      if (childWater < 1) shortfall = true;
    }

    if (shortfall) {
      const bond = child.parentBond ?? { love: 70, financialTension: 15, independenceTension: 15, gratitude: 60 };
      bond.financialTension = Math.round(clamp(bond.financialTension + 1.5, 0, 100));
      child.parentBond = bond;
      child.mood = Math.round(clamp(child.mood - 2, 0, 100) * 10) / 10;
      if (childMeals === 0 || childWater === 0 || clock.totalDays % 5 === 1) {
        recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'child_care_shortfall', subjectId: child.id, subjectKind: 'citizen', subjectName: child.name, summary: `${child.name}: Parents could not afford full daily food/water`, detail: { childMeals, childWater, tension: bond.financialTension } });
      }
    }
  }
}
