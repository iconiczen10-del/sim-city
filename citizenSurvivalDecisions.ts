// citizenSurvivalDecisions.ts — Scored daily shopping and meal consumption decision records

import { pushDecision, sumDecisionFactors } from './citizenDecisions';
import type { DecisionOption, DecisionRecord, SignedFactor } from './citizenInspectorTypes';
import { getMemorySignals } from './citizenMemory';
import { CATEGORY_LABELS, formatPrice } from './formatters';
import type { ShoppingCategory } from './martTypes';
import type { Citizen } from './types';

export function recordShoppingDecision(params: {
  citizen: Citizen;
  totalDay: number;
  dateLabel: string;
  category: ShoppingCategory;
  currentStock: number;
  desiredQty: number;
  unitPrice: number;
  chosenLabel: string;
  chosenReason: string;
}): DecisionRecord {
  const { citizen, totalDay, dateLabel, category, currentStock, desiredQty, unitPrice, chosenLabel, chosenReason } = params;
  const mem = getMemorySignals(citizen);
  const urgency = category === 'food' ? 100 - citizen.hunger : category === 'water' ? 100 - citizen.thirst : 35;
  const budgetScore = citizen.savings >= unitPrice * desiredQty ? 28 : citizen.savings >= unitPrice ? 8 : -35;
  const stockGap = category === 'food' ? Math.max(0, 9 - currentStock) * 5 : Math.max(0, 4 - currentStock) * 9;
  const memCaution = Math.round(mem.cautionBonus * 4);
  const priceDrag = unitPrice > (citizen.lastPaidPrices[category] || unitPrice) * 1.2 ? -14 : 6;

  const buyBufFactors: SignedFactor[] = [
    { label: 'Low Stock Need', value: stockGap },
    { label: 'Budget Headroom', value: budgetScore },
    { label: 'Hunger / Thirst Urgency', value: Math.round(urgency * 0.45) },
    { label: 'Discipline & Caution', value: Math.round(citizen.traits.discipline * 0.25 + memCaution) },
    { label: 'Mart Price Signal', value: priceDrag },
  ];
  const buyMinFactors: SignedFactor[] = [
    { label: 'Immediate Survival Need', value: Math.round(urgency * 0.45 + stockGap * 0.6) },
    { label: 'Cash Preservation', value: citizen.savings < 300 ? 28 : 10 },
    { label: 'Price Sensitivity', value: priceDrag < 0 ? 12 : -4 },
  ];
  const skipFactors: SignedFactor[] = [
    { label: 'Existing Inventory', value: currentStock > 0 ? 22 : -40 },
    { label: 'Unaffordable Cost', value: citizen.savings < unitPrice ? 45 : -15 },
    { label: 'Mart Trust / Memory', value: Math.round(mem.martTrustDelta - mem.cautionBonus * 2) },
  ];

  const options: DecisionOption[] = [
    { label: `Buy Buffer (${desiredQty}u)`, totalScore: sumDecisionFactors(buyBufFactors), chosen: chosenLabel.startsWith('Buy Buffer'), factors: buyBufFactors },
    { label: 'Buy Minimal Today', totalScore: sumDecisionFactors(buyMinFactors), chosen: chosenLabel === 'Buy Minimal Today', factors: buyMinFactors },
    { label: 'Skip / Defer', totalScore: sumDecisionFactors(skipFactors), chosen: chosenLabel === 'Skip / Defer', factors: skipFactors },
  ];

  return pushDecision(citizen, {
    totalDay,
    dateLabel,
    kind: 'daily_shopping',
    category,
    title: `${CATEGORY_LABELS[category]} Shopping (${formatPrice(unitPrice)}/u)`,
    chosenOption: chosenLabel,
    chosenReason,
    linkedMemoryIds: mem.recentLossOrStockoutIds,
    options,
  });
}

export function recordMealDecision(params: {
  citizen: Citizen;
  totalDay: number;
  dateLabel: string;
  mealsEaten: number;
  availableBefore: number;
}): DecisionRecord {
  const { citizen, totalDay, dateLabel, mealsEaten, availableBefore } = params;
  const mem = getMemorySignals(citizen);
  const eatFactors: SignedFactor[] = [
    { label: 'Hunger Urgency', value: Math.round((100 - citizen.hunger) * 0.7) },
    { label: 'Pantry Stock', value: availableBefore >= 3 ? 35 : availableBefore > 0 ? 10 : -80 },
    { label: 'Health Priority', value: Math.round((100 - citizen.health) * 0.35 + 15) },
  ];
  const skipFactors: SignedFactor[] = [
    { label: 'No Food Available', value: availableBefore <= 0 ? 85 : -45 },
    { label: 'Stress / Rationing Habit', value: Math.round(mem.cautionBonus * 1.5) },
  ];

  const ateFull = mealsEaten >= 3;
  const chosenOption = ateFull ? 'Eat Full 3 Meals' : mealsEaten > 0 ? `Partial (${mealsEaten} Meals)` : 'Skip Meals';
  const chosenReason =
    availableBefore <= 0
      ? 'Pantry had 0 meals left before shopping.'
      : ateFull
        ? `Hunger at ${Math.round(citizen.hunger)}/100 and ${availableBefore} meals in stock.`
        : `Only ${availableBefore} meal(s) left in stock.`;

  return pushDecision(citizen, {
    totalDay,
    dateLabel,
    kind: 'meal_choice',
    category: 'survival',
    title: 'Daily Meal Consumption',
    chosenOption,
    chosenReason,
    linkedMemoryIds: mem.recentLossOrStockoutIds,
    options: [
      { label: 'Eat Full 3 Meals', totalScore: sumDecisionFactors(eatFactors), chosen: ateFull, factors: eatFactors },
      { label: chosenOption === 'Skip Meals' ? 'Skip Meals' : 'Ration / Skip', totalScore: sumDecisionFactors(skipFactors), chosen: !ateFull, factors: skipFactors },
    ],
  });
}
