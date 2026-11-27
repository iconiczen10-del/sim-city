// childDailyCare.ts — Daily in-kind food and water sharing from parents or guardians to dependent children

import { appendLifeLog } from './citizenLedger';
import type { SimClock } from './eventFactory';
import type { Citizen } from './types';

export function supplyDependentChildrenDailyCare(citizens: Citizen[], clock: SimClock, dateLabel: string): void {
  const byId = new Map(citizens.map((c) => [c.id, c]));

  for (const child of citizens) {
    if (!child.alive || child.age >= 25 || child.youngAdultPhase !== 'dependent_youth') continue;
    const providerIds = [...(child.parentIds ?? []), ...(child.guardianId && child.guardianId !== 'treasury' ? [child.guardianId] : [])];
    const providers = providerIds.map((id) => byId.get(id)).filter((p): p is Citizen => Boolean(p && p.alive));
    if (providers.length === 0) continue;

    const childMeals = child.inventory.food.reduce((s, b) => s + b.meals, 0);
    const childWater = child.inventory.water.reduce((s, w) => s + w.days, 0);

    if (childMeals < 3) {
      const donor = providers.find((p) => p.inventory.food.reduce((s, b) => s + b.meals, 0) >= 4);
      if (donor) {
        let needed = 3 - childMeals;
        for (const batch of donor.inventory.food) {
          if (needed <= 0) break;
          const donorAvail = Math.max(0, batch.meals - 1);
          const give = Math.min(needed, donorAvail);
          if (give > 0) {
            batch.meals -= give;
            needed -= give;
            child.inventory.food.push({ ...batch, meals: give });
          }
        }
        donor.inventory.food = donor.inventory.food.filter((b) => b.meals > 0);
        if (needed < 3 - childMeals && clock.totalDays % 5 === 1) {
          appendLifeLog(child, clock.totalDays, dateLabel, 'meal', `Received home-cooked meals from ${donor.name}.`);
        }
      }
    }

    if (childWater < 1) {
      const donor = providers.find((p) => p.inventory.water.reduce((s, w) => s + w.days, 0) >= 2);
      if (donor && donor.inventory.water[0]) {
        donor.inventory.water[0].days -= 1;
        child.inventory.water.push({ ...donor.inventory.water[0], days: 1 });
        donor.inventory.water = donor.inventory.water.filter((w) => w.days > 0);
      }
    }
  }
}
