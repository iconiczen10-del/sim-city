// standards.ts — Per-category living standard selection and monthly budget estimation

import {
  DAYS_PER_MONTH,
  LIVING_STANDARDS,
  MART_BASE_PRICES,
  OUTFIT_WEAR_DAYS,
} from './constants';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import type { CitizenStandards, LivingStandard, ShoppingCategory } from './martTypes';
import type { CitizenTraits, HomeType, RoleLevel } from './types';

// Monthly cost of a single category at a given standard (baseline prices)
export function getCategoryMonthlyCost(
  category: ShoppingCategory,
  standard: LivingStandard
): number {
  const unit = MART_BASE_PRICES[category][standard];
  if (category === 'food') return unit * 3 * DAYS_PER_MONTH;
  if (category === 'water') return unit * DAYS_PER_MONTH;
  if (category === 'clothes') return unit * (DAYS_PER_MONTH / OUTFIT_WEAR_DAYS);
  return unit;
}

export function estimateMonthlyShoppingCost(standards: CitizenStandards): number {
  return Math.round(
    getCategoryMonthlyCost('food', standards.food) +
      getCategoryMonthlyCost('water', standards.water) +
      getCategoryMonthlyCost('clothes', standards.clothes) +
      getCategoryMonthlyCost('household', standards.household)
  );
}

function highestAffordableStandard(
  category: ShoppingCategory,
  budget: number
): LivingStandard {
  const minCost = getCategoryMonthlyCost(category, 1);
  let chosen: LivingStandard = 1;
  for (const std of LIVING_STANDARDS) {
    const extra = getCategoryMonthlyCost(category, std) - minCost;
    if (budget >= extra) chosen = std;
  }
  return chosen;
}

export function chooseLivingStandards(params: {
  roleLevel: RoleLevel;
  netPay: number;
  savings: number;
  homeType: HomeType;
  traits: CitizenTraits;
  allowImpulse?: boolean;
}): CitizenStandards {
  const { roleLevel, netPay, savings, homeType, traits, allowImpulse } = params;

  if (roleLevel === 'Unemployed' && savings < 900) {
    return { food: 1, water: 1, clothes: 1, household: 1 };
  }

  const fixed = calculateFixedMonthlyCosts(homeType).total;
  const survivalMin =
    getCategoryMonthlyCost('food', 1) +
    getCategoryMonthlyCost('water', 1) +
    getCategoryMonthlyCost('clothes', 1) +
    getCategoryMonthlyCost('household', 1);

  const savingsRate = 0.02 + (traits.discipline / 100) * 0.19;
  const targetSavings = netPay * savingsRate;
  const largeSavingsBonus =
    savings > (fixed + survivalMin) * 4 ? (savings - (fixed + survivalMin) * 4) * 0.045 : 0;

  let freeMoney = Math.max(0, netPay + largeSavingsBonus - fixed - survivalMin - targetSavings);
  if (traits.kindness > 70) {
    freeMoney *= 0.92;
  }

  const wFood = 1.1 + (traits.sociability + traits.greed) / 140;
  const wWater = 0.75 + traits.discipline / 220;
  const wClothes = 0.8 + (traits.ambition + traits.greed + traits.sociability) / 170;
  const wHouse = 0.7 + traits.discipline / 130;
  const wTotal = wFood + wWater + wClothes + wHouse;

  const result: CitizenStandards = {
    food: highestAffordableStandard('food', freeMoney * (wFood / wTotal)),
    water: highestAffordableStandard('water', freeMoney * (wWater / wTotal)),
    clothes: highestAffordableStandard('clothes', freeMoney * (wClothes / wTotal)),
    household: highestAffordableStandard('household', freeMoney * (wHouse / wTotal)),
  };

  // Downgrade least important category first if combined upgrade exceeds freeMoney
  const downgradeOrder: ShoppingCategory[] = ['household', 'clothes', 'water', 'food'];
  const totalExtra = () =>
    estimateMonthlyShoppingCost(result) - survivalMin;

  let guard = 0;
  while (totalExtra() > freeMoney + 5 && guard < 20) {
    guard += 1;
    let changed = false;
    for (const cat of downgradeOrder) {
      if (result[cat] > 1) {
        result[cat] = (result[cat] - 1) as LivingStandard;
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }

  // High greed + low discipline impulse overspending
  if (allowImpulse && traits.greed > 68 && traits.discipline < 42 && savings > 180) {
    if (Math.random() < 0.25) {
      const cat: ShoppingCategory = Math.random() < 0.5 ? 'clothes' : 'food';
      result[cat] = clamp(result[cat] + 1, 1, 5) as LivingStandard;
    }
  }

  return result;
}
