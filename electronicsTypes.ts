// electronicsTypes.ts — Data models for Vij Mart electronics category, tiers, stock, and owned citizen appliances

import type { MarginMood } from './martLogTypes';

export type ApplianceId =
  | 'phone'
  | 'fan'
  | 'fridge'
  | 'cooker'
  | 'heater'
  | 'television'
  | 'washing_machine'
  | 'laptop'
  | 'lamp';

export type ApplianceTier = 'basic' | 'mid' | 'premium';

export interface ApplianceSpec {
  id: ApplianceId;
  name: string;
  prices: Record<ApplianceTier, number>;
  baseDailyUnits: Record<ApplianceTier, number>;
  minMonths: number;
  maxMonths: number;
  essential: boolean;
}

export interface ElectronicsStockItem {
  applianceId: ApplianceId;
  tier: ApplianceTier;
  quantity: number;
  basePrice: number;
  buyCost: number;
  sellPrice: number;
  dailyForecast: number;
  salesHistory: number[];
}

export interface ElectronicsOrder {
  id: string;
  supplier: string;
  applianceId: ApplianceId;
  tier: ApplianceTier;
  quantity: number;
  totalCost: number;
  etaDays: number;
  orderedDate: string;
}

export interface OwnedAppliance {
  id: string;
  applianceId: ApplianceId;
  name: string;
  tier: ApplianceTier;
  purchasePrice: number;
  boughtDay: number;
  boughtDate: string;
  totalLifespanDays: number;
  daysLeft: number;
  variancePct: number;
  broken: boolean;
  brokenDay?: number;
}
