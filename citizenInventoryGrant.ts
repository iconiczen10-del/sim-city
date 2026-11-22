// citizenInventoryGrant.ts — Adds purchased or granted batches to a citizen's inventory

import { HOUSEHOLD_PACK_DAYS } from './constants';
import type { LivingStandard, ShoppingCategory } from './martTypes';
import type { Citizen } from './types';

export function addInventoryToCitizen(
  citizen: Citizen,
  category: ShoppingCategory,
  standard: LivingStandard,
  qty: number,
  contaminated: number,
  totalDays: number
): void {
  if (category === 'food') {
    citizen.inventory.food.push({ standard, meals: qty, daysOld: 0, contaminated });
  } else if (category === 'water') {
    citizen.inventory.water.push({ standard, days: qty, contaminated });
  } else if (category === 'clothes') {
    for (let i = 0; i < qty; i++) {
      citizen.inventory.outfits.push({
        id: `out_${citizen.id}_${totalDays}_${Math.random().toString(36).slice(2, 6)}`,
        standard,
        condition: 100,
      });
    }
  } else {
    for (let i = 0; i < qty; i++) {
      citizen.inventory.household.push({ standard, daysLeft: HOUSEHOLD_PACK_DAYS });
    }
  }
}
