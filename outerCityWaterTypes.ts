// outerCityWaterTypes.ts — Data types for Outer City Water emergency supplier, personalities, pricing, and purchase log

import type { DistrictId } from './housingPrefTypes';
import type { LivingStandard } from './inventoryTypes';

export type OuterSupplierPersonality = 'fair_trader' | 'opportunist' | 'gouger';

export interface OuterCityWaterPurchase {
  id: string;
  day: number;
  dateLabel: string;
  buyerId: string;
  buyerName: string;
  recipientId?: string;
  recipientName?: string;
  district: DistrictId | 'edge';
  level: LivingStandard;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  martUnitPrice: number;
  reason: string;
}

export interface OuterCityWaterOverride {
  mode: 'multiplier' | 'fixed_floor';
  value: number;
  daysLeft: number;
}

export interface OuterCityWaterState {
  personality: OuterSupplierPersonality;
  initialPersonality: OuterSupplierPersonality;
  driftNote: string;
  scarcityDays: number;
  totalUnitsSold: number;
  totalRevenue: number;
  lostMartSalesCount: number;
  lostMartRevenue: number;
  lostMartTodayCount: number;
  pricesByLevel: Record<LivingStandard, number>;
  buyerCounts: Record<string, number>;
  override?: OuterCityWaterOverride | null;
  purchaseLog: OuterCityWaterPurchase[];
}
