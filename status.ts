// status.ts — Status score, tier hysteresis, respect updates, and daily mood drift

import {
  MAX_MONTHLY_STATUS_DELTA,
  ROLE_STATUS_SCORES,
  TIER_HYSTERESIS,
  TIER_ORDER,
  TIER_THRESHOLDS,
} from './constants';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import { estimateMonthlyShoppingCost } from './standards';
import type { Citizen, TierId } from './types';

export function computeSavingsScore(savings: number): number {
  if (savings <= 0) return 0;
  const normalized = (Math.log10(savings + 10) - 1) / (Math.log10(20000) - 1);
  return clamp(normalized * 100, 0, 100);
}

export function computeIncomeScore(grossPay: number): number {
  if (grossPay <= 0) return 0;
  return clamp((Math.sqrt(grossPay) / Math.sqrt(7000)) * 100, 0, 100);
}

export function computeTargetStatusScore(
  citizen: Pick<Citizen, 'savings' | 'roleLevel' | 'respect'>,
  grossPay: number
): number {
  const savingsScore = computeSavingsScore(citizen.savings);
  const incomeScore = computeIncomeScore(grossPay);
  const roleScore = ROLE_STATUS_SCORES[citizen.roleLevel];
  const respectScore = clamp(citizen.respect, 0, 100);

  const weighted =
    savingsScore * 0.4 +
    incomeScore * 0.25 +
    roleScore * 0.2 +
    respectScore * 0.15;

  return Math.round(clamp(weighted, 0, 100) * 10) / 10;
}

export function stepMonthlyStatusScore(currentScore: number, targetScore: number): number {
  const diff = targetScore - currentScore;
  const delta = clamp(diff, -MAX_MONTHLY_STATUS_DELTA, MAX_MONTHLY_STATUS_DELTA);
  return Math.round(clamp(currentScore + delta, 0, 100) * 10) / 10;
}

export function evaluateTierWithHysteresis(currentTier: TierId, statusScore: number): TierId {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx > 0) {
    const upperTier = TIER_ORDER[idx - 1];
    if (statusScore >= TIER_THRESHOLDS[upperTier] + TIER_HYSTERESIS) return upperTier;
  }
  if (idx < TIER_ORDER.length - 1) {
    if (statusScore < TIER_THRESHOLDS[currentTier] - TIER_HYSTERESIS) return TIER_ORDER[idx + 1];
  }
  return currentTier;
}

export function initialTierFromScore(score: number): TierId {
  if (score >= 80) return 'T1';
  if (score >= 60) return 'T2';
  if (score >= 40) return 'T3';
  if (score >= 20) return 'T4';
  return 'T5';
}

export function computeTargetMood(
  citizen: Citizen,
  netPay: number,
  hadShortageToday = false,
  martReputation = 70
): number {
  const fixed = calculateFixedMonthlyCosts(citizen.homeType).total;
  const estLiving = fixed + estimateMonthlyShoppingCost(citizen.standards);
  const monthsSaved = estLiving > 0 ? citizen.savings / estLiving : 0;

  let mood = 54;
  if (monthsSaved < 0.25) mood -= 16;
  else if (monthsSaved < 1) mood -= 7;
  else if (monthsSaved < 3) mood += 4;
  else if (monthsSaved < 6) mood += 9;
  else mood += 14;

  if (citizen.roleLevel === 'Unemployed') mood -= citizen.traits.ambition > 65 ? 16 : 12;
  else if (netPay >= estLiving * 1.15) mood += 9;
  else if (netPay >= estLiving) mood += 4;
  else mood -= 8;

  if (citizen.hunger < 15) mood -= 22;
  else if (citizen.hunger < 45) mood -= 10;
  if (citizen.thirst < 15) mood -= 26;
  else if (citizen.thirst < 45) mood -= 12;
  if (hadShortageToday) mood -= 6;

  const avgStd = (citizen.standards.food + citizen.standards.water + citizen.standards.clothes + citizen.standards.household) / 4;
  if (avgStd >= 4.2) mood += 9;
  else if (avgStd >= 3.2) mood += 5;
  else if (avgStd <= 1.25) mood -= 4;

  mood += (martReputation - 70) * 0.08;
  mood += (citizen.traits.kindness + citizen.traits.sociability - 100) * 0.05;
  mood += (citizen.traits.discipline - 50) * 0.04;
  if (citizen.traits.greed > 70 && netPay < estLiving * 1.15) mood -= 4;

  return clamp(mood, 2, 98);
}

export function stepDailyMood(
  citizen: Citizen,
  netPay: number,
  hadShortageToday: boolean,
  martReputation = 70
): number {
  const target = computeTargetMood(citizen, netPay, hadShortageToday, martReputation);
  const drift = (target - citizen.mood) * 0.14;
  const noise = (Math.random() - 0.5) * 2.0;
  return Math.round(clamp(citizen.mood + drift + noise, 0, 100) * 10) / 10;
}
