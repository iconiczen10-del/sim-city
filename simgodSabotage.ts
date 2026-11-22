// simgodSabotage.ts — SimGod sabotage powers affecting stock, contamination, pricing, closure, cash, and manager

import { appendCompanyLedger } from './companyLedger';
import { makeCityEvent } from './eventFactory';
import { CATEGORY_LABELS, formatDelta, formatPrice, formatSimDate, STANDARD_LABELS } from './formatters';
import { findStockItem, round2 } from './martSetup';
import type { LivingStandard, ManagerStyle, ShoppingCategory } from './martTypes';
import type { CityState } from './types';

function clockFrom(city: CityState) {
  return { totalDays: city.totalDays, day: city.day, month: city.month, year: city.year };
}

export function applyStockSabotage(
  prev: CityState,
  action: 'destroy' | 'steal',
  category: ShoppingCategory,
  standard: LivingStandard,
  pct: number
): CityState {
  const next = structuredClone(prev);
  const item = findStockItem(next.mart, category, standard);
  if (!item || item.quantity <= 0) return prev;

  const lost = Math.max(1, Math.round((item.quantity * pct) / 100));
  item.quantity = Math.max(0, item.quantity - lost);
  if (item.foodAges) {
    let rem = lost;
    for (let i = 0; i < item.foodAges.length && rem > 0; i++) {
      const take = Math.min(item.foodAges[i], rem);
      item.foodAges[i] -= take;
      rem -= take;
    }
  }
  next.mart.recentSabotageDays = 5;
  next.mart.wasteLog.unshift({
    id: `sab_${prev.totalDays}_${Date.now()}`,
    dateLabel: formatSimDate(prev.day, prev.month, prev.year),
    source: 'mart',
    ownerName: action === 'destroy' ? 'Fire / Loss' : 'Theft',
    category,
    standard,
    quantity: lost,
    reason: action === 'destroy' ? 'destroyed' : 'stolen',
  });
  next.events.unshift(makeCityEvent(clockFrom(prev), `sg_stk_${Date.now()}`, {
    type: 'simgod',
    title: `SimGod Action: ${action === 'destroy' ? 'Destroyed' : 'Stole'} Stock`,
    detail: `Removed ${lost} (${pct}%) ${CATEGORY_LABELS[category]} (${STANDARD_LABELS[standard]}). Citizens perceive ${action === 'destroy' ? 'fire/damage' : 'theft'}.`,
  }));
  return next;
}

export function applyContamination(
  prev: CityState,
  category: 'food' | 'water',
  standard: LivingStandard,
  qty: number
): CityState {
  const next = structuredClone(prev);
  const item = findStockItem(next.mart, category, standard);
  if (!item || item.quantity <= 0) return prev;

  const tainted = Math.min(item.quantity, qty);
  item.contaminatedQty = Math.min(item.quantity, item.contaminatedQty + tainted);
  next.events.unshift(makeCityEvent(clockFrom(prev), `sg_cnt_${Date.now()}`, {
    type: 'simgod',
    title: 'SimGod Action: Contaminated Batch',
    detail: `Tainted ${tainted} units of ${CATEGORY_LABELS[category]} (${STANDARD_LABELS[standard]}).`,
  }));
  return next;
}

export function applyPriceOverride(
  prev: CityState,
  category: ShoppingCategory,
  mode: 'fixed' | 'multiplier' | 'release',
  value: number,
  days: number
): CityState {
  const next = structuredClone(prev);
  if (mode === 'release') {
    delete next.mart.overrides[category];
  } else {
    next.mart.overrides[category] = { category, mode, value, daysLeft: days };
  }
  next.events.unshift(makeCityEvent(clockFrom(prev), `sg_prc_${Date.now()}`, {
    type: 'simgod',
    title: 'SimGod Action: Price Override',
    detail: mode === 'release'
      ? `Released ${CATEGORY_LABELS[category]} price override back to Mart AI.`
      : `Overrode ${CATEGORY_LABELS[category]} (${mode === 'fixed' ? formatPrice(value) : `${value}x`}) for ${days}d.`,
  }));
  return next;
}

export function applyShopClosure(prev: CityState, days: number): CityState {
  const next = structuredClone(prev);
  next.mart.closedDaysLeft = Math.max(0, days);
  next.events.unshift(makeCityEvent(clockFrom(prev), `sg_cls_${Date.now()}`, {
    type: 'simgod',
    title: 'SimGod Action: Shop Closed',
    detail: days > 0 ? `Closed Vij Mart for ${days} days (citizens perceive strike/inspection).` : 'Reopened Vij Mart.',
  }));
  return next;
}

export function applyMartCashChange(prev: CityState, delta: number): CityState {
  const next = structuredClone(prev);
  const prevCash = next.mart.cash;
  next.mart.cash = Math.max(0, round2(next.mart.cash + delta));
  const actualDelta = Math.round((next.mart.cash - prevCash) * 100) / 100;
  const vijMart = next.companies.find((c) => c.id === 'vijmart');
  if (vijMart) {
    vijMart.cash = next.mart.cash;
    appendCompanyLedger(vijMart, clockFrom(prev), formatSimDate(prev.day, prev.month, prev.year), { kind: actualDelta >= 0 ? 'inflow' : 'outflow', category: 'adjustment', label: actualDelta >= 0 ? 'Cash Injection' : 'Cash Withdrawal', detail: 'Direct store reserve adjustment', amount: Math.abs(actualDelta), balanceAfter: next.mart.cash });
  }
  if (next.mart.closedUntilFunded && next.mart.cash >= 1500) {
    next.mart.closedUntilFunded = false;
    next.mart.unpaidOpMonths = 0;
  }
  next.events.unshift(makeCityEvent(clockFrom(prev), `sg_csh_${Date.now()}`, {
    type: 'simgod',
    title: `SimGod Action: ${delta >= 0 ? 'Added' : 'Drained'} Mart Cash`,
    detail: `${delta >= 0 ? 'Added' : 'Drained'} ${formatDelta(Math.abs(delta))} (${formatDelta(next.mart.cash)} balance).`,
  }));
  return next;
}

export function applyManagerPersonality(
  prev: CityState,
  style: ManagerStyle,
  greedyLean: number
): CityState {
  const next = structuredClone(prev);
  next.mart.personality = { style, greedyLean };
  next.events.unshift(makeCityEvent(clockFrom(prev), `sg_prs_${Date.now()}`, {
    type: 'simgod',
    title: 'SimGod Action: Manager Personality',
    detail: `Changed Mart manager to ${style} (lean ${greedyLean >= 0 ? `+${greedyLean}` : greedyLean}).`,
  }));
  return next;
}
