// martPricing.ts — Multi-factor SKU pricing with strict 1.0x wholesale cost floor

import { OUTSIDE_WHOLESALE_MULT } from './constants';
import { clamp } from './economy';
import { round2 } from './martSetup';
import type {
  CategoryMoodState,
  MartState,
  MartStockItem,
  PriceFactorBreakdown,
} from './martTypes';

export function computeSkuPrice(
  item: MartStockItem,
  moodState: CategoryMoodState,
  mart: MartState,
  avgSavings: number,
  avgMood: number,
  delayRate: number,
  override?: { mode: 'fixed' | 'multiplier'; value: number },
  outsideSupplierActive = false
): number {
  const effectiveBuy = round2(item.buyCost * (outsideSupplierActive ? OUTSIDE_WHOLESALE_MULT : 1));
  const daysLeft = item.quantity / Math.max(0.2, item.dailyForecast);
  const stockAdjPct = Math.round(clamp((6 - daysLeft) * 8, -22, 65));
  const nearExp = item.foodAges?.[2] ?? 0;
  const expiryAdjPct = nearExp > 4 ? -15 : 0;
  const recent = item.salesHistory.slice(-2).reduce((a, b) => a + b, 0) / 2;
  const demandAdjPct = item.dailyForecast > 0
    ? Math.round(clamp(((recent - item.dailyForecast) / item.dailyForecast) * 18, -12, 24))
    : 0;
  const affordAdjPct = Math.round(clamp((avgSavings - 1200) / 150 + (avgMood - 55) * 0.2, -15, 18));
  const cashAdjPct = mart.cash < 2000 ? 18 : mart.cash > 18000 ? -4 : 0;
  const reputationAdjPct = Math.round((mart.reputation - 70) * 0.15);
  const delaySabotageAdjPct = Math.round(delayRate * 25 + (mart.recentSabotageDays > 0 ? 15 : 0));

  const adjFactor =
    (1 + stockAdjPct / 100) *
    (1 + expiryAdjPct / 100) *
    (1 + demandAdjPct / 100) *
    (1 + affordAdjPct / 100) *
    (1 + cashAdjPct / 100) *
    (1 + reputationAdjPct / 100) *
    (1 + delaySabotageAdjPct / 100);

  const rawPrice = effectiveBuy * (1 + moodState.marginPct / 100) * adjFactor;
  let finalPrice = Math.max(effectiveBuy, rawPrice);

  if (override) {
    const overridden = override.mode === 'fixed' ? override.value : finalPrice * override.value;
    finalPrice = Math.max(effectiveBuy, overridden);
  }

  const factors: PriceFactorBreakdown = {
    baseMarginPct: moodState.marginPct,
    stockAdjPct,
    expiryAdjPct,
    demandAdjPct,
    affordabilityAdjPct: affordAdjPct,
    cashAdjPct,
    reputationAdjPct,
    delaySabotageAdjPct,
    finalMultiplier: round2(finalPrice / effectiveBuy),
  };
  item.priceFactors = factors;
  return round2(Math.max(effectiveBuy, finalPrice));
}
