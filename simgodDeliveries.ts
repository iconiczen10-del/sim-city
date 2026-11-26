// simgodDeliveries.ts — SimGod delivery schedule control and order rush/delay/cancel actions

import { appendCompanyLedger } from './companyLedger';
import { MART_RUSH_FEE } from './constants';
import { makeCityEvent } from './eventFactory';
import { CATEGORY_LABELS, formatDelta, formatSimDate } from './formatters';
import type { ShoppingCategory } from './martTypes';
import { recordSimGodAction } from './recordsSimGod';
import type { CityState } from './types';

export function applyDeliverySchedule(
  prev: CityState,
  category: ShoppingCategory,
  mode: 'auto' | 'manual',
  gapDays: number,
  targetSupplyDays: number
): CityState {
  const next = structuredClone(prev);
  const sched = next.mart.schedules[category];
  sched.mode = mode;
  sched.gapDays = Math.max(1, Math.min(7, gapDays));
  sched.targetSupplyDays = Math.max(2, Math.min(14, targetSupplyDays));
  sched.daysUntilOrder = mode === 'manual' ? 1 : sched.gapDays;
  sched.nextDeliveryLabel = mode === 'auto' ? 'Auto' : `Manual (${sched.gapDays}d)`;

  const clock = { totalDays: prev.totalDays, day: prev.day, month: prev.month, year: prev.year };
  const dateLabel = formatSimDate(prev.day, prev.month, prev.year);
  const detail = mode === 'auto' ? `Returned ${CATEGORY_LABELS[category]} ordering to Auto.` : `Set ${CATEGORY_LABELS[category]} delivery every ${sched.gapDays}d (target ${sched.targetSupplyDays}d supply).`;
  next.events.unshift(makeCityEvent(clock, `sg_sched_${category}_${Date.now()}`, { type: 'simgod', title: 'SimGod Action: Delivery Schedule', detail }));
  recordSimGodAction({ city: next, dateLabel, targetId: 'vijmart', targetKind: 'mart', targetName: 'Vij Mart', preview: `${CATEGORY_LABELS[category]} schedule (${mode})`, cause: 'SimGod delivery override', effect: detail });
  return next;
}

export function applyOrderIntervention(
  prev: CityState,
  orderId: string,
  action: 'rush' | 'delay' | 'cancel',
  delayDays = 2
): CityState {
  const next = structuredClone(prev);
  const idx = next.mart.deliveries.findIndex((d) => d.id === orderId);
  if (idx === -1) return prev;

  const order = next.mart.deliveries[idx];
  const clock = { totalDays: prev.totalDays, day: prev.day, month: prev.month, year: prev.year };
  let detail = '';

  if (action === 'rush') {
    const prevCash = next.mart.cash;
    next.mart.cash = Math.max(0, Math.round((next.mart.cash - MART_RUSH_FEE) * 100) / 100);
    const paid = Math.round((prevCash - next.mart.cash) * 100) / 100;
    const vijMart = next.companies.find((c) => c.id === 'vijmart');
    if (vijMart) {
      vijMart.cash = next.mart.cash;
      appendCompanyLedger(vijMart, clock, formatSimDate(prev.day, prev.month, prev.year), { kind: 'outflow', category: 'adjustment', label: 'Rush Delivery Fee', detail: `Rushed ${CATEGORY_LABELS[order.category]} L${order.standard}`, amount: paid, balanceAfter: next.mart.cash });
    }
    order.etaDays = 1;
    order.isRush = true;
    detail = `Rushed ${order.quantity} ${CATEGORY_LABELS[order.category]} (L${order.standard}) for ${formatDelta(MART_RUSH_FEE)}.`;
  } else if (action === 'delay') {
    order.etaDays += delayDays;
    order.isLate = true;
    next.mart.lateDeliveryCount += 1;
    detail = `Delayed ${order.quantity} ${CATEGORY_LABELS[order.category]} (L${order.standard}) by ${delayDays} days.`;
  } else {
    next.mart.deliveries.splice(idx, 1);
    detail = `Cancelled ${order.quantity} ${CATEGORY_LABELS[order.category]} (L${order.standard}) delivery.`;
  }

  next.events.unshift(makeCityEvent(clock, `sg_ord_${orderId}_${Date.now()}`, { type: 'simgod', title: `SimGod Action: Delivery ${action}`, detail }));
  recordSimGodAction({ city: next, dateLabel: formatSimDate(prev.day, prev.month, prev.year), targetId: 'vijmart', targetKind: 'mart', targetName: 'Vij Mart', preview: `Delivery ${action} (${orderId})`, cause: `SimGod delivery ${action}`, effect: detail });
  return next;
}
