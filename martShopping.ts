// martShopping.ts — Citizen purchasing with memories, price shock decisions, rationing, ledger, and diary

import { recordStandardOrTierDecision } from './citizenDecisions';
import { addInventoryToCitizen } from './citizenInventoryGrant';
import { appendChangeExplanation, appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { CATEGORY_LABELS, formatPrice, STANDARD_LABELS } from './formatters';
import { deductMartStock, findStockItem, round2 } from './martSetup';
import type { LivingStandard, MartState, ShoppingCategory } from './martTypes';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent } from './types';

export function purchaseFromMart(
  citizen: Citizen,
  mart: MartState,
  category: ShoppingCategory,
  preferredStandard: LivingStandard,
  desiredQty: number,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): boolean {
  if (mart.closedDaysLeft > 0 || mart.closedUntilFunded) return false;

  let item = findStockItem(mart, category, preferredStandard);
  let chosenStandard = preferredStandard;

  if (!item || item.quantity <= 0) {
    citizen.stockoutMemoryDays = Math.max(citizen.stockoutMemoryDays, 14);
    addCitizenMemory(citizen, clock, dateLabel, 'stockout', `${CATEGORY_LABELS[category]} (${STANDARD_LABELS[preferredStandard]}) out of stock at Vij Mart.`, -24);
    events.push(makeCityEvent(clock, `stockout_${category}_${preferredStandard}_${citizen.id}`, {
      type: 'stock-out', citizenId: citizen.id, citizenName: citizen.name,
      title: 'Item Out of Stock', detail: `${CATEGORY_LABELS[category]} (${STANDARD_LABELS[preferredStandard]}) out of stock for ${citizen.name}.`,
    }));
    if (preferredStandard > 1) {
      const lower = (preferredStandard - 1) as LivingStandard;
      const fallback = findStockItem(mart, category, lower);
      if (fallback && fallback.quantity > 0) { item = fallback; chosenStandard = lower; }
      else return false;
    } else return false;
  }

  let qty = Math.min(desiredQty, item.quantity);
  if (mart.rationingActive) {
    qty = Math.min(qty, category === 'food' ? 3 : 1);
    if (desiredQty > qty) addCitizenMemory(citizen, clock, dateLabel, 'rationing', `Vij Mart rationed ${CATEGORY_LABELS[category]} purchases.`, -16);
  }
  while (qty > 0 && citizen.savings < round2(qty * item.sellPrice)) qty -= 1;
  if (qty <= 0 && (category === 'food' || category === 'water')) {
    for (let std = chosenStandard - 1; std >= 1; std -= 1) {
      const cheap = findStockItem(mart, category, std as LivingStandard);
      if (cheap && cheap.quantity > 0 && citizen.savings >= round2(cheap.sellPrice)) {
        item = cheap;
        chosenStandard = std as LivingStandard;
        qty = Math.min(desiredQty, cheap.quantity);
        while (qty > 0 && citizen.savings < round2(qty * cheap.sellPrice)) qty -= 1;
        break;
      }
    }
  }
  if (qty <= 0) return false;

  const remembered = citizen.lastPaidPrices[category] || item.basePrice;
  if (item.sellPrice >= remembered * 1.28) {
    citizen.mood = clamp(citizen.mood - 6, 0, 100);
    addCitizenMemory(citizen, clock, dateLabel, 'price_shock', `Shocked by ${formatPrice(item.sellPrice)} price for ${CATEGORY_LABELS[category]}.`, -28);
    if (citizen.standards[category] > 1 && citizen.giftShieldDays === 0) {
      const oldStd = citizen.standards[category];
      citizen.standards[category] = (oldStd - 1) as LivingStandard;
      const dec = recordStandardOrTierDecision({
        citizen, totalDay: clock.totalDays, dateLabel, kind: 'downgrade_upgrade', category,
        title: `Price Shock Downgrade (${CATEGORY_LABELS[category]})`,
        chosenOption: `Downgrade L${oldStd} → L${oldStd - 1}`, altOption: `Keep L${oldStd}`,
        chosenReason: `Unit price ${formatPrice(item.sellPrice)} exceeded remembered ${formatPrice(remembered)} by >28%.`,
        budgetVal: -16, memVal: -14, traitVal: Math.round((citizen.traits.discipline - 50) * 0.2), urgencyOrStatusVal: 24,
        oldStd, newStd: (oldStd - 1) as LivingStandard,
      });
      appendChangeExplanation(citizen, clock.totalDays, dateLabel, 'standard_downgrade', `Downgraded ${CATEGORY_LABELS[category]} L${oldStd} → L${oldStd - 1} after price shock.`, dec.id);
    }
    events.push(makeCityEvent(clock, `shock_${citizen.id}_${category}`, {
      type: 'price-shock', citizenId: citizen.id, citizenName: citizen.name,
      title: 'Price Shock', detail: `${citizen.name} faced ${formatPrice(item.sellPrice)} for ${CATEGORY_LABELS[category]} (was ${formatPrice(remembered)}).`,
    }));
  } else if (item.sellPrice <= remembered * 0.82) {
    citizen.mood = clamp(citizen.mood + 2, 0, 100);
  }
  citizen.lastPaidPrices[category] = item.sellPrice;

  const totalCost = round2(qty * item.sellPrice);
  citizen.savings = round2(citizen.savings - totalCost);
  const contaminated = deductMartStock(item, qty);
  if (item.salesHistory.length > 0) item.salesHistory[item.salesHistory.length - 1] += qty;
  mart.cash = round2(mart.cash + totalCost);
  mart.todayRevenue = round2(mart.todayRevenue + totalCost);
  mart.monthlyRevenue = round2(mart.monthlyRevenue + totalCost);
  if (!mart.customersTodayIds.includes(citizen.id)) mart.customersTodayIds.push(citizen.id);

  addInventoryToCitizen(citizen, category, chosenStandard, qty, contaminated, clock.totalDays);
  appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'expense', CATEGORY_LABELS[category], `${qty}x ${STANDARD_LABELS[chosenStandard]} ${CATEGORY_LABELS[category]}`, totalCost);
  appendLifeLog(citizen, clock.totalDays, dateLabel, 'shop', `Bought ${qty}x L${chosenStandard} ${CATEGORY_LABELS[category]} at ${formatPrice(item.sellPrice)} (${formatPrice(totalCost)}).`);
  if (totalCost >= Math.max(40, citizen.savings * 0.15)) {
    addCitizenMemory(citizen, clock, dateLabel, 'big_buy', `Made a major ${formatPrice(totalCost)} purchase of ${CATEGORY_LABELS[category]}.`, 14);
  }

  const sale = { id: `sale_${clock.totalDays}_${citizen.id}_${category}`, totalDay: clock.totalDays, dateLabel, category, standard: chosenStandard, quantity: qty, unitPrice: item.sellPrice, totalPrice: totalCost, contaminatedQty: contaminated > 0 ? contaminated : undefined };
  citizen.recentPurchases = [sale, ...citizen.recentPurchases].slice(0, 12);
  mart.salesLog.unshift({ ...sale, citizenId: citizen.id, citizenName: citizen.name });
  recordSimEvent({
    simDay: clock.totalDays, dateLabel, category: 'shopping', subType: 'purchase',
    subjectId: citizen.id, subjectKind: 'citizen', subjectName: citizen.name,
    summary: `${citizen.name} bought ${qty}x L${chosenStandard} ${CATEGORY_LABELS[category]} (${formatPrice(totalCost)})`,
    detail: { item: category, standard: chosenStandard, unitPrice: item.sellPrice, totalPrice: totalCost, quantity: qty, day: clock.totalDays, contaminated },
  });
  return true;
}
