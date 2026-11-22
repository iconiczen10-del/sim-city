// martLogTypes.ts — Supporting breakdown, order, schedule, waste, and history types for Vij Mart

import type {
  LivingStandard,
  PurchaseRecord,
  ShoppingCategory,
} from './inventoryTypes';

export type MarginMood =
  | 'clearance'
  | 'generous'
  | 'good'
  | 'typical'
  | 'greedy'
  | 'gouging';

export type ManagerStyle = 'cautious' | 'balanced' | 'aggressive';

export interface PriceFactorBreakdown {
  baseMarginPct: number;
  stockAdjPct: number;
  expiryAdjPct: number;
  demandAdjPct: number;
  affordabilityAdjPct: number;
  cashAdjPct: number;
  reputationAdjPct: number;
  delaySabotageAdjPct: number;
  finalMultiplier: number;
}

export interface MartOrder {
  id: string;
  supplier: string;
  category: ShoppingCategory;
  standard: LivingStandard;
  quantity: number;
  totalCost: number;
  etaDays: number;
  originalEtaDays: number;
  isLate: boolean;
  isRush?: boolean;
  orderedDate: string;
}

export interface DeliverySchedule {
  mode: 'auto' | 'manual';
  gapDays: number;
  targetSupplyDays: number;
  daysUntilOrder: number;
  nextDeliveryLabel: string;
}

export interface CategoryMoodState {
  mood: MarginMood;
  marginPct: number;
  daysRemaining: number;
  reason: string;
}

export interface PriceOverride {
  category: ShoppingCategory;
  mode: 'fixed' | 'multiplier';
  value: number;
  daysLeft: number;
}

export interface ManagerDecision {
  id: string;
  dateLabel: string;
  category: ShoppingCategory | 'store';
  managerName?: string;
  summary: string;
  reason: string;
}

export interface MartWasteEntry {
  id: string;
  dateLabel: string;
  source: 'mart' | 'citizen';
  ownerName: string;
  category: ShoppingCategory;
  standard: LivingStandard;
  quantity: number;
  reason: 'spoiled' | 'worn_out' | 'destroyed' | 'stolen' | 'contaminated';
}

export interface MartHistoryPoint {
  label: string;
  revenue: number;
  avgPriceIndex: number;
  dominantMood: MarginMood;
}

export type MartSaleRecord = PurchaseRecord & { citizenId: string; citizenName: string };
