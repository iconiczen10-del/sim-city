// martEngine.ts — Daily Mart deliveries, late arrivals, spoilage, rationing, reputation, and AI orchestration

import { FOOD_SPOIL_DAYS, SHOPPING_CATEGORIES } from './constants';
import { clamp } from './economy';
import { stepElectronicsMartDayEnd, stepElectronicsMartDayStart } from './electronicsMart';
import { makeCityEvent, type SimClock } from './eventFactory';
import { CATEGORY_LABELS, STANDARD_LABELS } from './formatters';
import { updateMartMoodsAndPrices } from './martAI';
import { updateSalesForecasts } from './martForecast';
import { getMartFloorManager } from './martManager';
import { processMartOrdering } from './martOrdering';
import { findStockItem, round2 } from './martSetup';
import type { MarginMood, MartState } from './martTypes';
import { simRand, simRandInt } from './rng';
import type { Citizen, CityEvent } from './types';

export function processMartDayStart(
  mart: MartState,
  clock: SimClock,
  events: CityEvent[]
): void {
  mart.todayRevenue = 0;
  mart.customersTodayIds = [];
  if (mart.closedDaysLeft > 0) mart.closedDaysLeft -= 1;
  if (mart.recentSabotageDays > 0) mart.recentSabotageDays -= 1;
  stepElectronicsMartDayStart(mart, clock, events);

  for (const item of mart.stock) {
    item.salesHistory = [...item.salesHistory.slice(-13), 0];
  }

  const stillInTransit = [];
  for (const order of mart.deliveries) {
    order.etaDays -= 1;
    // 10% chance non-rush delivery slips 1-3 days late when about to arrive
    if (order.etaDays <= 0 && !order.isRush && !order.isLate && simRand() < 0.1) {
      const delay = simRandInt(1, 3);
      order.etaDays = delay;
      order.isLate = true;
      mart.lateDeliveryCount += 1;
      events.push(makeCityEvent(clock, `late_${order.id}`, {
        type: 'late-delivery',
        title: 'Supplier Delivery Delayed',
        detail: `${CATEGORY_LABELS[order.category]} (L${order.standard}) from ${order.supplier} is ${delay}d late.`,
      }));
      stillInTransit.push(order);
      continue;
    }

    if (order.etaDays <= 0) {
      mart.totalDeliveryCount += 1;
      const item = findStockItem(mart, order.category, order.standard);
      if (item) {
        item.quantity += order.quantity;
        if (item.foodAges) item.foodAges[0] += order.quantity;
      }
      events.push(makeCityEvent(clock, `deliv_${order.id}`, {
        type: 'delivery',
        title: 'Mart Delivery Arrived',
        detail: `Received ${order.quantity} ${CATEGORY_LABELS[order.category]} (${STANDARD_LABELS[order.standard]}) from ${order.supplier}.`,
      }));
    } else {
      stillInTransit.push(order);
    }
  }
  mart.deliveries = stillInTransit;
}

export function processMartDayEnd(
  mart: MartState,
  citizens: Citizen[],
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[],
  outsideSupplierActive = false
): void {
  // 1. Food spoilage (> 4 days)
  for (const item of mart.stock) {
    if (item.category !== 'food' || !item.foodAges) continue;
    const spoiled = item.foodAges[FOOD_SPOIL_DAYS - 1] ?? 0;
    for (let i = FOOD_SPOIL_DAYS - 1; i > 0; i--) item.foodAges[i] = item.foodAges[i - 1];
    item.foodAges[0] = 0;
    if (spoiled > 0) {
      item.quantity = Math.max(0, item.quantity - spoiled);
      mart.monthSpoilageCount += spoiled;
      mart.wasteLog.unshift({
        id: `waste_m_${clock.totalDays}_${item.standard}`,
        dateLabel,
        source: 'mart',
        ownerName: 'Vij Mart',
        category: 'food',
        standard: item.standard,
        quantity: spoiled,
        reason: 'spoiled',
      });
      events.push(makeCityEvent(clock, `spoil_m_${item.standard}`, {
        type: 'spoilage',
        title: 'Mart Food Spoiled',
        detail: `${spoiled} meals of ${STANDARD_LABELS[item.standard]} food spoiled in Vij Mart.`,
      }));
    }
  }

  // 2. Stats, rationing check, & reputation
  const alive = citizens.filter((c) => c.alive);
  const avgSavings = alive.length ? alive.reduce((s, c) => s + c.savings, 0) / alive.length : 0;
  const avgMood = alive.length ? alive.reduce((s, c) => s + c.mood, 0) / alive.length : 50;

  const foodTotal = mart.stock.filter((s) => s.category === 'food').reduce((a, b) => a + b.quantity, 0);
  const foodDemand = mart.stock.filter((s) => s.category === 'food').reduce((a, b) => a + b.dailyForecast, 0);
  const wasRationing = mart.rationingActive;
  mart.rationingActive = foodTotal / Math.max(1, foodDemand) < 2;
  if (mart.rationingActive && !wasRationing) {
    events.push(makeCityEvent(clock, 'ration_on', {
      type: 'rationing',
      title: 'Vij Mart Rationing Active',
      detail: 'Stock fell below 2 days of supply; purchase quantities are rationed per citizen.',
    }));
  }

  const stockouts = mart.stock.filter((s) => s.quantity === 0 && s.dailyForecast > 0).length;
  if (stockouts > 0) mart.monthStockoutDays += 1;
  if (mart.closedDaysLeft > 0 || mart.closedUntilFunded) mart.monthClosureDays += 1;
  const floorMgr = getMartFloorManager(citizens);
  if (floorMgr && floorMgr.mood < 20) {
    mart.managerPerformance = round2(clamp(mart.managerPerformance - 2, 0, 100));
  }

  const gougingCats = SHOPPING_CATEGORIES.filter((c) => mart.categoryMoods[c].mood === 'gouging').length;
  const friendlyCats = SHOPPING_CATEGORIES.filter((c) => ['generous', 'clearance'].includes(mart.categoryMoods[c].mood)).length;
  const repDelta = (stockouts === 0 ? 0.3 : -stockouts * 0.4) - (mart.rationingActive ? 0.8 : 0) - gougingCats * 0.6 + friendlyCats * 0.4;
  mart.reputation = round2(clamp(mart.reputation + repDelta, 0, 100));

  // 3. Forecast -> Mood & Prices -> New Orders
  updateSalesForecasts(mart, citizens, clock.day);
  updateMartMoodsAndPrices(mart, citizens, avgSavings, avgMood, clock, dateLabel, events, outsideSupplierActive);
  processMartOrdering(mart, citizens, clock, dateLabel, events, outsideSupplierActive);
  stepElectronicsMartDayEnd(mart, clock, dateLabel, outsideSupplierActive);

  const avgIndex = mart.stock.reduce((sum, s) => sum + (s.sellPrice / s.basePrice) * 100, 0) / mart.stock.length;
  const dominantMood: MarginMood = mart.categoryMoods.food.mood;
  mart.history = [
    ...mart.history.slice(-59),
    { label: `${clock.day} ${dateLabel.split(' ')[1]?.replace(',', '') ?? ''}`, revenue: round2(mart.todayRevenue), avgPriceIndex: round2(avgIndex), dominantMood },
  ];
  mart.salesLog = mart.salesLog.slice(0, 150);
  mart.wasteLog = mart.wasteLog.slice(0, 120);
}
