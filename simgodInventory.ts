// simgodInventory.ts — Inventory valuation, target selection, adding, and removing units

import type { MassTargetScope } from './simgodTypes';
import { HOUSEHOLD_PACK_DAYS, MART_BASE_PRICES, SHOPPING_CATEGORIES } from './constants';
import type { LivingStandard, ShoppingCategory } from './martTypes';
import { simIdSuffix, simShuffle } from './rng';
import type { Citizen, RoleLevel, TierId } from './types';

export function getUnitValue(category: ShoppingCategory, std: LivingStandard): number {
  return MART_BASE_PRICES[category][std];
}

export function getCitizenCategoryValue(citizen: Citizen, cat: ShoppingCategory | 'all'): number {
  const cats = cat === 'all' ? SHOPPING_CATEGORIES : [cat];
  let sum = 0;
  for (const c of cats) {
    if (c === 'food') sum += citizen.inventory.food.reduce((s, b) => s + b.meals * getUnitValue('food', b.standard), 0);
    if (c === 'water') sum += citizen.inventory.water.reduce((s, w) => s + w.days * getUnitValue('water', w.standard), 0);
    if (c === 'clothes') sum += citizen.inventory.outfits.reduce((s, o) => s + getUnitValue('clothes', o.standard) * (o.condition / 100), 0);
    if (c === 'household') sum += citizen.inventory.household.reduce((s, h) => s + getUnitValue('household', h.standard) * (h.daysLeft / HOUSEHOLD_PACK_DAYS), 0);
  }
  return Math.round(sum * 100) / 100;
}

export function selectTargetCitizens(
  citizens: Citizen[],
  scope: MassTargetScope,
  opts: { citizenId?: string; tier?: TierId; role?: RoleLevel; randomCount?: number }
): Citizen[] {
  const living = citizens.filter((c) => c.alive);
  if (scope === 'single') return living.filter((c) => c.id === opts.citizenId);
  if (scope === 'tier') return living.filter((c) => c.tier === opts.tier);
  if (scope === 'role') return living.filter((c) => c.roleLevel === opts.role);
  if (scope === 'all') return living;
  const n = Math.max(1, Math.min(living.length, opts.randomCount ?? 5));
  return simShuffle(living).slice(0, n);
}

export function addItemUnits(citizen: Citizen, cat: ShoppingCategory, std: LivingStandard, qty: number, totalDays: number): number {
  if (qty <= 0) return 0;
  if (cat === 'food') citizen.inventory.food.push({ standard: std, meals: qty, daysOld: 0 });
  else if (cat === 'water') citizen.inventory.water.push({ standard: std, days: qty });
  else if (cat === 'clothes') {
    for (let i = 0; i < qty; i++) {
      citizen.inventory.outfits.push({ id: `sg_${totalDays}_${simIdSuffix()}`, standard: std, condition: 100 });
    }
  } else {
    for (let i = 0; i < qty; i++) citizen.inventory.household.push({ standard: std, daysLeft: HOUSEHOLD_PACK_DAYS });
  }
  return Math.round(qty * getUnitValue(cat, std) * 100) / 100;
}

export function removeCategoryUnits(
  citizen: Citizen,
  cat: ShoppingCategory | 'all',
  qtyLimit: number
): { removedCount: number; removedValue: number; primaryStd: LivingStandard } {
  let rem = qtyLimit;
  let removedCount = 0;
  let removedValue = 0;
  let primaryStd: LivingStandard = 1;
  const cats = cat === 'all' ? SHOPPING_CATEGORIES : [cat];

  for (const c of cats) {
    if (c === 'food') {
      citizen.inventory.food = citizen.inventory.food.filter((b) => {
        if (rem <= 0) return true;
        const take = Math.min(b.meals, rem);
        b.meals -= take;
        rem -= take;
        removedCount += take;
        removedValue += take * getUnitValue('food', b.standard);
        primaryStd = b.standard;
        return b.meals > 0;
      });
    } else if (c === 'water') {
      citizen.inventory.water = citizen.inventory.water.filter((w) => {
        if (rem <= 0) return true;
        const take = Math.min(w.days, rem);
        w.days -= take;
        rem -= take;
        removedCount += take;
        removedValue += take * getUnitValue('water', w.standard);
        primaryStd = w.standard;
        return w.days > 0;
      });
    } else if (c === 'clothes') {
      while (citizen.inventory.outfits.length > 0 && rem > 0) {
        const out = citizen.inventory.outfits.pop()!;
        rem -= 1;
        removedCount += 1;
        removedValue += getUnitValue('clothes', out.standard) * (out.condition / 100);
        primaryStd = out.standard;
      }
    } else {
      while (citizen.inventory.household.length > 0 && rem > 0) {
        const hp = citizen.inventory.household.pop()!;
        rem -= 1;
        removedCount += 1;
        removedValue += getUnitValue('household', hp.standard) * (hp.daysLeft / HOUSEHOLD_PACK_DAYS);
        primaryStd = hp.standard;
      }
    }
  }
  return { removedCount, removedValue: Math.round(removedValue * 100) / 100, primaryStd };
}
