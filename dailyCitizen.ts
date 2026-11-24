// dailyCitizen.ts — Daily survival, memory/stress updates, shopping decisions, health, and death

import { consumeFoodAndWater, wearClothesAndHousehold } from './citizenConsumption';
import { stepCitizenDecisionOutcomes } from './citizenDecisionOutcomes';
import { recordStandardOrTierDecision } from './citizenDecisions';
import { finalizeCitizenDeath } from './citizenHealthEvents';
import { stepCitizenHealthDaily } from './citizenHealthSystem';
import { appendChangeExplanation } from './citizenLedger';
import { decayCitizenMemories, getMemorySignals } from './citizenMemory';
import { stepCitizenNeedsDaily } from './citizenNeeds';
import { stepDailyStress } from './citizenStress';
import { applySurvivalInstinctBehavior } from './citizenSurvivalEngine';
import { recordShoppingDecision } from './citizenSurvivalDecisions';
import { maybeAttemptDesperateTheft } from './citizenTheft';
import { stepCitizenElectronicsDaily } from './electronicsCitizen';
import type { SimClock } from './eventFactory';
import { CATEGORY_LABELS, formatDelta } from './formatters';
import { findStockItem } from './martSetup';
import { purchaseFromMart } from './martShopping';
import type { MartState } from './martTypes';
import type { SharityState } from './sharityTypes';
import { chooseLivingStandards } from './standards';
import type { Citizen, CityEvent } from './types';

export function processCitizenDailySurvival(
  citizen: Citizen,
  mart: MartState,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[],
  allCitizens: Citizen[] = [],
  sharity?: SharityState
): { died: boolean; estateToTreasury: number; shortageToday: boolean } {
  citizen.stockoutMemoryDays = Math.max(0, citizen.stockoutMemoryDays - 1);
  decayCitizenMemories(citizen);

  const { foodStd, waterStd } = consumeFoodAndWater(citizen, mart, clock, dateLabel, events);
  wearClothesAndHousehold(citizen, mart, clock.totalDays, dateLabel);

  const totalMeals = citizen.inventory.food.reduce((s, b) => s + b.meals, 0);
  const totalWater = citizen.inventory.water.reduce((s, w) => s + w.days, 0);
  const memSignals = getMemorySignals(citizen);
  const isBufferBuyer = citizen.savings >= 600 || citizen.traits.discipline >= 60;
  const panicStress = (citizen.stockoutMemoryDays > 0 || memSignals.cautionBonus > 2) && (citizen.traits.discipline < 45 || citizen.mood < 45);
  const memExtraFood = Math.min(2, Math.floor(memSignals.cautionBonus * 0.4));
  const panicFood = Math.min(2, citizen.stockoutMemoryDays > 0 ? (panicStress ? 2 : 1) + memExtraFood : memExtraFood);
  const panicWater = Math.min(2, citizen.stockoutMemoryDays > 0 ? (panicStress ? 2 : 1) : 0);
  let shortageToday = false;

  if (totalMeals < (citizen.stockoutMemoryDays > 0 ? 5 : 3)) {
    const baseFoodTarget = isBufferBuyer ? 9 : 3;
    const desired = Math.max(3, Math.min(9, baseFoodTarget - totalMeals) + panicFood);
    const unitPrice = findStockItem(mart, 'food', citizen.standards.food)?.sellPrice ?? 2;
    const bought = purchaseFromMart(citizen, mart, 'food', citizen.standards.food, desired, clock, dateLabel, events);
    if (!bought) shortageToday = true;
    recordShoppingDecision({
      citizen, totalDay: clock.totalDays, dateLabel, category: 'food', currentStock: totalMeals, desiredQty: desired, unitPrice,
      chosenLabel: bought ? (isBufferBuyer ? `Buy Buffer (${desired}u)` : 'Buy Minimal Today') : 'Skip / Defer',
      chosenReason: bought
        ? `${totalMeals} meals left; ${citizen.stockoutMemoryDays > 0 ? 'post-loss caution boosted order' : isBufferBuyer ? 'buffer-buying discipline' : 'buying daily survival meals'}.`
        : mart.closedUntilFunded || mart.closedDaysLeft > 0 ? 'Vij Mart closed.' : 'Out of stock or insufficient savings.',
    });
  }

  if (totalWater < (citizen.stockoutMemoryDays > 0 ? 4 : 2)) {
    const desired = Math.max(1, (isBufferBuyer ? 7 - totalWater : 1) + panicWater);
    const unitPrice = findStockItem(mart, 'water', citizen.standards.water)?.sellPrice ?? 0.5;
    const bought = purchaseFromMart(citizen, mart, 'water', citizen.standards.water, desired, clock, dateLabel, events);
    if (!bought) shortageToday = true;
    recordShoppingDecision({
      citizen, totalDay: clock.totalDays, dateLabel, category: 'water', currentStock: totalWater, desiredQty: desired, unitPrice,
      chosenLabel: bought ? (isBufferBuyer ? `Buy Buffer (${desired}u)` : 'Buy Minimal Today') : 'Skip / Defer',
      chosenReason: bought ? `${totalWater}d water left; secured hydration supply.` : 'Mart closed, out of stock, or out of cash.',
    });
  }

  if (citizen.inventory.outfits.length === 0 || (citizen.inventory.outfits.length === 1 && citizen.inventory.outfits[0].condition < 20)) {
    purchaseFromMart(citizen, mart, 'clothes', citizen.standards.clothes, 1, clock, dateLabel, events);
  }
  if (citizen.inventory.household.length === 0) {
    purchaseFromMart(citizen, mart, 'household', citizen.standards.household, 1, clock, dateLabel, events);
  }

  const stressStep = stepDailyStress(citizen);
  citizen.stress = stressStep.stress;
  citizen.stressBreakdown = stressStep.breakdown;
  stepCitizenNeedsDaily(citizen, mart, clock, dateLabel, events);
  stepCitizenElectronicsDaily(citizen, mart, clock, dateLabel, events);
  stepCitizenHealthDaily(citizen, foodStd, waterStd, clock, dateLabel, events);
  applySurvivalInstinctBehavior(citizen, allCitizens, clock, dateLabel);
  if (sharity && allCitizens.length > 0) {
    maybeAttemptDesperateTheft({ thief: citizen, allCitizens, sharity, clock, dateLabel, events });
  }
  stepCitizenDecisionOutcomes(citizen, clock);

  if (citizen.savings <= 50 && citizen.standards.food > 1 && citizen.giftShieldDays === 0) {
    const prevFood = citizen.standards.food;
    citizen.standards = chooseLivingStandards({
      roleLevel: citizen.roleLevel, netPay: citizen.lastGrossPay - citizen.lastTax,
      savings: citizen.savings, homeType: citizen.homeType, traits: citizen.traits,
    });
    if (citizen.standards.food < prevFood) {
      const dec = recordStandardOrTierDecision({
        citizen, totalDay: clock.totalDays, dateLabel, kind: 'downgrade_upgrade', category: 'food',
        title: 'Low-Savings Standard Cut', chosenOption: `Cut to L${citizen.standards.food}`, altOption: `Keep L${prevFood}`,
        chosenReason: `Savings fell to ${formatDelta(citizen.savings)}, forcing minimum living standards.`,
        budgetVal: -30, memVal: Math.round(memSignals.martTrustDelta), traitVal: Math.round(citizen.traits.discipline * 0.2), urgencyOrStatusVal: 25,
        oldStd: prevFood, newStd: citizen.standards.food,
      });
      appendChangeExplanation(citizen, clock.totalDays, dateLabel, 'standard_downgrade', `${CATEGORY_LABELS.food} lowered L${prevFood} → L${citizen.standards.food} due to ${formatDelta(citizen.savings)} savings.`, dec.id);
    }
  }

  if (citizen.health <= 0) {
    return { died: true, estateToTreasury: finalizeCitizenDeath(citizen, clock, dateLabel, events), shortageToday };
  }
  return { died: false, estateToTreasury: 0, shortageToday };
}
