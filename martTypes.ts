// martTypes.ts — Core Vij Mart store, stock item, and manager tracking structures

import type { ElectronicsOrder, ElectronicsStockItem } from './electronicsTypes';
import type { LivingStandard, ShoppingCategory } from './inventoryTypes';
import type {
  CategoryMoodState,
  DeliverySchedule,
  ManagerDecision,
  ManagerStyle,
  MartHistoryPoint,
  MartOrder,
  MartSaleRecord,
  MartWasteEntry,
  PriceFactorBreakdown,
  PriceOverride,
} from './martLogTypes';

export type {
  CitizenInventory,
  CitizenStandards,
  FoodBatch,
  HouseholdPack,
  LivingStandard,
  OutfitItem,
  PurchaseRecord,
  ShoppingCategory,
  WaterBatch,
} from './inventoryTypes';

export type {
  CategoryMoodState,
  DeliverySchedule,
  ManagerDecision,
  ManagerStyle,
  MarginMood,
  MartHistoryPoint,
  MartOrder,
  MartSaleRecord,
  MartWasteEntry,
  PriceFactorBreakdown,
  PriceOverride,
} from './martLogTypes';

export interface MartStockItem {
  category: ShoppingCategory;
  standard: LivingStandard;
  quantity: number;
  foodAges?: number[];
  contaminatedQty: number;
  basePrice: number;
  buyCost: number;
  sellPrice: number;
  dailyForecast: number;
  groundTruthForecast?: number;
  salesEma?: number;
  salesHistory: number[];
  priceFactors?: PriceFactorBreakdown;
}

export interface MartState {
  cash: number;
  todayRevenue: number;
  monthlyRevenue: number;
  monthlyWholesaleSpend: number;
  lastMonthProfit: number;
  customersTodayIds: string[];
  reputation: number;
  personality: { style: ManagerStyle; greedyLean: number };
  categoryMoods: Record<ShoppingCategory, CategoryMoodState>;
  schedules: Record<ShoppingCategory, DeliverySchedule>;
  overrides: Partial<Record<ShoppingCategory, PriceOverride>>;
  closedDaysLeft: number;
  closedUntilFunded: boolean;
  unpaidOpMonths: number;
  rationingActive: boolean;
  recentSabotageDays: number;
  lateDeliveryCount: number;
  totalDeliveryCount: number;
  managerPerformance: number;
  managerLowPerfMonths: number;
  panicFreezeDaysLeft: number;
  monthSpoilageCount: number;
  monthStockoutDays: number;
  monthRushFeeCount: number;
  monthClosureDays: number;
  stock: MartStockItem[];
  deliveries: MartOrder[];
  decisionLog: ManagerDecision[];
  salesLog: MartSaleRecord[];
  wasteLog: MartWasteEntry[];
  history: MartHistoryPoint[];
  electronicsStock?: ElectronicsStockItem[];
  electronicsMood?: CategoryMoodState;
  electronicsDeliveries?: ElectronicsOrder[];
}
