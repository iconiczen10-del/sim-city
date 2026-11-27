// martSetup.ts — Initializes Vij Mart AI state, stock, schedules, and lookup helpers

import {
  LIVING_STANDARDS,
  MART_BASE_PRICES,
  MART_INITIAL_CASH,
  MART_WHOLESALE_RATIO,
  SHOPPING_CATEGORIES,
} from './constants';
import type {
  CategoryMoodState,
  DeliverySchedule,
  LivingStandard,
  MartState,
  MartStockItem,
  ShoppingCategory,
} from './martTypes';
import { createInitialOuterCityWater } from './outerCityWater';
import type { Citizen } from './types';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function estimateSeedDemand(citizens: Citizen[], cat: ShoppingCategory, std: LivingStandard): number {
  const count = citizens.filter((c) => c.standards[cat] === std).length;
  if (cat === 'food') return Math.max(std === 5 ? 3 : 6, count * 3);
  if (cat === 'water') return Math.max(std === 5 ? 1 : 2, count);
  if (cat === 'clothes') return Math.max(0.25, count * 0.08);
  return Math.max(0.25, count * 0.12);
}

function defaultMoodState(): CategoryMoodState {
  return { mood: 'typical', marginPct: 48, daysRemaining: 3, reason: 'Standard opening baseline' };
}

function defaultSchedule(cat: ShoppingCategory): DeliverySchedule {
  const gapDays = cat === 'food' ? 2 : cat === 'water' ? 3 : 5;
  return {
    mode: 'auto',
    gapDays,
    targetSupplyDays: cat === 'food' ? 4 : 7,
    daysUntilOrder: gapDays,
    nextDeliveryLabel: 'Auto',
  };
}

export function createInitialMart(citizens: Citizen[]): MartState {
  const stock: MartStockItem[] = [];
  for (const category of SHOPPING_CATEGORIES) {
    for (const standard of LIVING_STANDARDS) {
      const dailyForecast = estimateSeedDemand(citizens, category, standard);
      const targetDays = standard === 5 ? 4 : 7;
      const qty = Math.max(standard === 5 ? 2 : 4, Math.round(dailyForecast * targetDays));
      const basePrice = MART_BASE_PRICES[category][standard];
      const buyCost = round2(basePrice * MART_WHOLESALE_RATIO);
      stock.push({
        category,
        standard,
        quantity: qty,
        foodAges: category === 'food' ? [Math.ceil(qty * 0.5), Math.floor(qty * 0.5), 0, 0] : undefined,
        contaminatedQty: 0,
        basePrice,
        buyCost,
        sellPrice: basePrice,
        dailyForecast,
        groundTruthForecast: dailyForecast,
        salesEma: dailyForecast,
        salesHistory: [Math.round(dailyForecast)],
      });
    }
  }

  const martState: MartState = {
    cash: MART_INITIAL_CASH,
    todayRevenue: 0,
    monthlyRevenue: 0,
    monthlyWholesaleSpend: 0,
    lastMonthProfit: 0,
    customersTodayIds: [],
    reputation: 70,
    personality: { style: 'balanced', greedyLean: 0 },
    categoryMoods: { food: defaultMoodState(), water: defaultMoodState(), clothes: defaultMoodState(), household: defaultMoodState() },
    schedules: { food: defaultSchedule('food'), water: defaultSchedule('water'), clothes: defaultSchedule('clothes'), household: defaultSchedule('household') },
    overrides: {},
    closedDaysLeft: 0,
    closedUntilFunded: false,
    unpaidOpMonths: 0,
    rationingActive: false,
    recentSabotageDays: 0,
    lateDeliveryCount: 0,
    totalDeliveryCount: 0,
    managerPerformance: 70,
    managerLowPerfMonths: 0,
    panicFreezeDaysLeft: 0,
    monthSpoilageCount: 0,
    monthStockoutDays: 0,
    monthRushFeeCount: 0,
    monthClosureDays: 0,
    stock,
    deliveries: [],
    decisionLog: [{
      id: 'dec_init',
      dateLabel: '1 Jan, Year 1',
      category: 'store',
      managerName: 'Floor Manager',
      summary: 'Opened Vij Mart',
      reason: 'Seeded baseline stock and ∆40,000 working capital with 48% typical margin.',
    }],
    salesLog: [],
    wasteLog: [],
    history: [{ label: '1 Jan', revenue: 0, avgPriceIndex: 100, dominantMood: 'typical' }],
  };
  martState.outerCityWater = createInitialOuterCityWater(martState);
  return martState;
}

export function findStockItem(
  mart: MartState,
  category: ShoppingCategory,
  standard: LivingStandard
): MartStockItem | undefined {
  return mart.stock.find((s) => s.category === category && s.standard === standard);
}

export function deductMartStock(item: MartStockItem, qty: number): number {
  const soldContam = Math.min(item.contaminatedQty, qty);
  item.contaminatedQty = Math.max(0, item.contaminatedQty - soldContam);
  item.quantity = Math.max(0, item.quantity - qty);
  if (item.foodAges) {
    let rem = qty;
    for (let age = item.foodAges.length - 1; age >= 0 && rem > 0; age--) {
      const take = Math.min(item.foodAges[age], rem);
      item.foodAges[age] -= take;
      rem -= take;
    }
  }
  return soldContam;
}
