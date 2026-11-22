// martOrdering.ts — Shelf-life-capped ordering, ∆2,250 reserve guard, rush fee guards, and panic freeze

import {
  FOOD_SPOIL_DAYS, MART_BULK_DISCOUNT_RATE, MART_BULK_DISCOUNT_THRESHOLD,
  MART_CASH_RESERVE, MART_LEAD_TIME_DAYS, MART_RUSH_FEE, MART_SUPPLIER,
  MART_TRIP_FEE, OUTSIDE_WHOLESALE_MULT, SHOPPING_CATEGORIES,
} from './constants';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { CATEGORY_LABELS, STANDARD_LABELS } from './formatters';
import { getManagerTraitProfile, getMartFloorManager } from './martManager';
import { chooseAutoGapDays, logOrderDecision } from './martOrderHelpers';
import { round2 } from './martSetup';
import type { MartState } from './martTypes';
import { simRand, simRandInt } from './rng';
import type { Citizen, CityEvent } from './types';

export function processMartOrdering(
  mart: MartState,
  citizens: Citizen[],
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[],
  outsideSupplierActive = false
): void {
  if (mart.closedDaysLeft > 0 || mart.closedUntilFunded) return;
  const manager = getMartFloorManager(citizens);
  const profile = getManagerTraitProfile(manager);
  const supplierName = outsideSupplierActive ? 'Outside Vij Wholesale' : MART_SUPPLIER;
  const costMult = outsideSupplierActive ? OUTSIDE_WHOLESALE_MULT : 1;

  if (mart.panicFreezeDaysLeft > 0) {
    mart.panicFreezeDaysLeft -= 1;
    return;
  }
  if (profile.panicFreezeRisk && simRand() < 0.4) {
    mart.panicFreezeDaysLeft = simRandInt(1, 2);
    mart.decisionLog.unshift({
      id: `dec_frz_${clock.totalDays}`,
      dateLabel,
      category: 'store',
      managerName: profile.managerName,
      summary: `${profile.managerName} froze ordering (${mart.panicFreezeDaysLeft}d)`,
      reason: `High manager stress (${Math.round(manager?.stress ?? 0)}/100 > 85) caused a panic freeze.`,
    });
    return;
  }

  for (const cat of SHOPPING_CATEGORIES) {
    const sched = mart.schedules[cat];
    if (sched.mode === 'auto') sched.gapDays = chooseAutoGapDays(mart, cat);
    sched.daysUntilOrder = Math.max(0, sched.daysUntilOrder - 1);

    const catItems = mart.stock.filter((s) => s.category === cat);
    const hasBasicInStock = catItems.some((s) => (s.standard === 1 || s.standard === 2) && s.quantity > 0);
    let tripPaid = false;
    let rushPaid = false;

    for (const item of catItems) {
      if (mart.deliveries.some((d) => d.category === cat && d.standard === item.standard)) continue;
      const isEmergency = item.quantity === 0 && item.dailyForecast > 0;
      const gap = sched.gapDays;
      const reorderPoint = item.dailyForecast * (cat === 'food' ? 3.4 : gap + 1);
      const dueBySchedule = sched.mode === 'manual' ? sched.daysUntilOrder === 0 : item.quantity <= reorderPoint;
      if (!isEmergency && !dueBySchedule) continue;

      const effectiveSpan = sched.mode === 'manual' ? sched.targetSupplyDays : gap;
      const rawTarget = item.dailyForecast * effectiveSpan * profile.safetyMult;
      const maxShelfTotal = cat === 'food' ? item.dailyForecast * FOOD_SPOIL_DAYS : rawTarget;
      const projectedOnArrival = Math.max(0, item.quantity - item.dailyForecast);
      let orderQty = Math.ceil(Math.min(rawTarget, maxShelfTotal) - projectedOnArrival);
      if (orderQty <= 0) continue;

      if (profile.orderNoiseAmp > 0) {
        orderQty = Math.max(1, Math.round(orderQty * (1 + (simRand() * 2 - 1) * profile.orderNoiseAmp)));
      }
      if (cat === 'food') orderQty = Math.min(orderQty, Math.max(0, Math.floor(item.dailyForecast * FOOD_SPOIL_DAYS)));
      if (orderQty <= 0) continue;

      const unitBuy = round2(item.buyCost * costMult);
      const canRush = isEmergency && mart.cash >= 3000 && !(item.standard >= 3 && hasBasicInStock);
      const rushFee = canRush && !rushPaid ? MART_RUSH_FEE : 0;
      const tripFee = tripPaid ? 0 : MART_TRIP_FEE;
      const subTotal = orderQty * unitBuy;
      const discount = subTotal > MART_BULK_DISCOUNT_THRESHOLD ? MART_BULK_DISCOUNT_RATE : 0;
      let totalCost = round2(subTotal * (1 - discount) + tripFee + rushFee);

      const spendLimit = Math.max(0, mart.cash - MART_CASH_RESERVE);
      if (spendLimit < totalCost) {
        const affordable = Math.floor((spendLimit - tripFee - rushFee) / Math.max(0.2, unitBuy));
        if (affordable < 1) {
          if (isEmergency) {
            events.push(makeCityEvent(clock, `nocash_${cat}_${item.standard}`, {
              type: 'shortage',
              title: 'Mart Reserve Protected',
              detail: `${profile.managerName} held ${CATEGORY_LABELS[cat]} (${STANDARD_LABELS[item.standard]}) order to protect ∆2,250 cash reserve.`,
            }));
          }
          continue;
        }
        orderQty = clamp(affordable, 1, orderQty);
        totalCost = round2(orderQty * unitBuy + tripFee + rushFee);
      }

      mart.cash = round2(mart.cash - totalCost);
      mart.monthlyWholesaleSpend = round2(mart.monthlyWholesaleSpend + totalCost);
      tripPaid = true;
      if (rushFee > 0) { rushPaid = true; mart.monthRushFeeCount += 1; }

      const etaDays = canRush ? 1 : MART_LEAD_TIME_DAYS;
      mart.deliveries.push({
        id: `ord_${clock.totalDays}_${cat}_${item.standard}`,
        supplier: supplierName,
        category: cat,
        standard: item.standard,
        quantity: orderQty,
        totalCost,
        etaDays,
        originalEtaDays: etaDays,
        isLate: false,
        isRush: canRush,
        orderedDate: dateLabel,
      });

      logOrderDecision(mart, item, orderQty, canRush, rushFee > 0, clock.totalDays, dateLabel, profile);
    }

    if (sched.mode === 'manual' && sched.daysUntilOrder === 0) sched.daysUntilOrder = sched.gapDays;
    const nextInTransit = mart.deliveries.filter((d) => d.category === cat).sort((a, b) => a.etaDays - b.etaDays)[0];
    sched.nextDeliveryLabel = nextInTransit
      ? `In ${nextInTransit.etaDays}d`
      : sched.mode === 'manual'
        ? `Order in ${sched.daysUntilOrder}d`
        : `Auto (${sched.gapDays}d gap)`;
  }
}
