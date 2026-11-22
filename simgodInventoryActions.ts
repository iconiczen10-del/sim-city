// simgodInventoryActions.ts — SimGod mass/single add and destroy inventory actions with previews

import type { LossCause, MassTargetScope } from './citizenInspectorTypes';
import { reactToItemLoss, reactToReceivedItems } from './citizenReactions';
import { makeCityEvent, type SimClock } from './eventFactory';
import { CATEGORY_LABELS, formatDelta, formatSimDate, STANDARD_LABELS } from './formatters';
import type { LivingStandard, ShoppingCategory } from './martTypes';
import {
  addItemUnits,
  getCitizenCategoryValue,
  getUnitValue,
  removeCategoryUnits,
  selectTargetCitizens,
} from './simgodInventory';
import { getSimRngState, syncSimRng } from './rng';
import { resolveCauseLabel } from './simgodInventoryTransfer';
import type { CityState, RoleLevel, TierId } from './types';

function simClock(city: CityState): SimClock {
  return { totalDays: city.totalDays, day: city.day, month: city.month, year: city.year };
}

export function previewMassInventoryImpact(
  city: CityState,
  opts: {
    action: 'add' | 'remove';
    scope: MassTargetScope;
    citizenId?: string;
    tier?: TierId;
    role?: RoleLevel;
    randomCount?: number;
    category: ShoppingCategory | 'all';
    standard: LivingStandard;
    quantity: number;
  }
): { count: number; totalValue: number; targetIds: string[] } {
  const targets = selectTargetCitizens(city.citizens, opts.scope, opts);
  let totalValue = 0;
  for (const c of targets) {
    if (opts.action === 'add' && opts.category !== 'all') {
      totalValue += opts.quantity * getUnitValue(opts.category, opts.standard);
    } else if (opts.action === 'remove') {
      const owned = getCitizenCategoryValue(c, opts.category);
      const cap =
        opts.category === 'all'
          ? owned
          : Math.min(owned, opts.quantity * getUnitValue(opts.category, opts.standard));
      totalValue += cap;
    }
  }
  return {
    count: targets.length,
    totalValue: Math.round(totalValue * 100) / 100,
    targetIds: targets.map((t) => t.id),
  };
}

export function executeMassInventoryAction(
  prev: CityState,
  opts: {
    action: 'add' | 'remove';
    targetIds: string[];
    category: ShoppingCategory | 'all';
    standard: LivingStandard;
    quantity: number;
    removeAll?: boolean;
    cause: LossCause;
  }
): CityState {
  if (opts.targetIds.length === 0) return prev;
  syncSimRng(prev.rngState || prev.seed);
  const next = structuredClone(prev);
  const clock = simClock(next);
  const dateLabel = formatSimDate(next.day, next.month, next.year);
  const idSet = new Set(opts.targetIds);
  let totalValue = 0;
  let affected = 0;
  const causeLabel = resolveCauseLabel(opts.cause);

  for (const c of next.citizens) {
    if (!c.alive || !idSet.has(c.id)) continue;
    if (opts.action === 'add' && opts.category !== 'all') {
      const val = addItemUnits(c, opts.category, opts.standard, opts.quantity, next.totalDays);
      if (val > 0) {
        affected += 1;
        totalValue += val;
        const summary = `${opts.quantity}x L${opts.standard} ${CATEGORY_LABELS[opts.category]}`;
        reactToReceivedItems({ citizen: c, clock, dateLabel, mode: 'added', valueAdded: val, summaryText: summary });
      }
    } else if (opts.action === 'remove') {
      const qtyLimit = opts.removeAll ? 99999 : opts.quantity;
      const res = removeCategoryUnits(c, opts.category, qtyLimit);
      if (res.removedCount > 0) {
        affected += 1;
        totalValue += res.removedValue;
        const catName = opts.category === 'all' ? 'mixed supplies' : CATEGORY_LABELS[opts.category];
        const summary = `${res.removedCount}x ${catName}`;
        reactToItemLoss({ citizen: c, mart: next.mart, clock, dateLabel, valueLost: res.removedValue, causeLabel, category: opts.category === 'all' ? 'mixed' : opts.category, summaryText: summary, events: next.events });
      }
    }
  }

  if (affected === 0) return prev;
  const catText = opts.category === 'all' ? 'All Items' : `${CATEGORY_LABELS[opts.category]} (${STANDARD_LABELS[opts.standard]})`;
  const title = opts.action === 'add' ? `SimGod action: Added ${catText}` : `SimGod action: Destroyed ${catText} (${causeLabel})`;
  const detail = `${opts.action === 'add' ? 'Granted' : `Removed (${causeLabel})`} across ${affected} citizen(s) · Total value ${formatDelta(totalValue)}.`;
  next.events.unshift(makeCityEvent(clock, `sg_mass_${opts.action}`, { type: 'simgod', citizenId: affected === 1 ? opts.targetIds[0] : undefined, title, detail }));
  next.events = next.events.slice(0, 600);
  next.rngState = getSimRngState();
  return next;
}
