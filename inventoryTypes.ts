// inventoryTypes.ts — Citizen living standards, inventory batch items, and purchase records

import type { OwnedAppliance } from './electronicsTypes';

export type ShoppingCategory = 'food' | 'water' | 'clothes' | 'household';
export type LivingStandard = 1 | 2 | 3 | 4 | 5;
export type CitizenStandards = Record<ShoppingCategory, LivingStandard>;

export interface FoodBatch {
  standard: LivingStandard;
  meals: number;
  daysOld: number;
  contaminated?: number;
}

export interface WaterBatch {
  standard: LivingStandard;
  days: number;
  contaminated?: number;
}

export interface OutfitItem {
  id: string;
  standard: LivingStandard;
  condition: number;
}

export interface HouseholdPack {
  standard: LivingStandard;
  daysLeft: number;
}

export interface CitizenInventory {
  food: FoodBatch[];
  water: WaterBatch[];
  outfits: OutfitItem[];
  household: HouseholdPack[];
  electronics?: OwnedAppliance[];
}

export interface PurchaseRecord {
  id: string;
  totalDay: number;
  dateLabel: string;
  category: ShoppingCategory;
  standard: LivingStandard;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  contaminatedQty?: number;
}
