// martForecast.ts — Ground-truth living citizen demand anchor + 14-day sales EMA forecasting

import { HOUSEHOLD_PACK_DAYS, OUTFIT_WEAR_DAYS } from './constants';
import { getManagerTraitProfile, getMartFloorManager } from './martManager';
import { round2 } from './martSetup';
import type { MartState } from './martTypes';
import type { Citizen } from './types';

function computeEma14(history: number[], alpha: number, fallback: number): number {
  const slice = history.slice(-14);
  if (slice.length === 0) return fallback;
  let ema = slice[0];
  for (let i = 1; i < slice.length; i++) {
    ema = alpha * slice[i] + (1 - alpha) * ema;
  }
  return ema;
}

export function updateSalesForecasts(mart: MartState, citizens: Citizen[], dayOfMonth: number): void {
  const manager = getMartFloorManager(citizens);
  const profile = getManagerTraitProfile(manager);
  const alive = citizens.filter((c) => c.alive);
  const paydayMult = dayOfMonth >= 28 && dayOfMonth <= 30 ? 1.08 : 1.0;

  for (const item of mart.stock) {
    let groundTruth = 0;
    for (const c of alive) {
      if (c.standards[item.category] !== item.standard) continue;
      if (item.category === 'food') groundTruth += 3;
      else if (item.category === 'water') groundTruth += 1;
      else if (item.category === 'clothes') groundTruth += 1 / OUTFIT_WEAR_DAYS;
      else groundTruth += 1 / HOUSEHOLD_PACK_DAYS;
    }
    const ema = computeEma14(item.salesHistory, profile.emaAlpha, groundTruth);
    const blended = groundTruth * profile.gtWeight + ema * profile.emaWeight;
    const stressNoise = profile.stressForecastErr > 0 ? 1 + (Math.random() * 2 - 1) * profile.stressForecastErr : 1;

    item.groundTruthForecast = round2(groundTruth);
    item.salesEma = round2(ema);
    item.dailyForecast = round2(Math.max(0, blended * paydayMult * stressNoise));
  }
}
