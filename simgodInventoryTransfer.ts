// simgodInventoryTransfer.ts — SimGod gift/theft item transfers between citizens and cause resolution

import { LOSS_CAUSE_LABELS, NATURAL_LOSS_CAUSES } from './citizenInspectorLabels';
import type { LossCause } from './citizenInspectorTypes';
import { reactToItemLoss, reactToReceivedItems } from './citizenReactions';
import { makeCityEvent, type SimClock } from './eventFactory';
import { CATEGORY_LABELS, formatDelta, formatSimDate } from './formatters';
import type { ShoppingCategory } from './martTypes';
import { addItemUnits, removeCategoryUnits } from './simgodInventory';
import { getSimRngState, simPick, syncSimRng } from './rng';
import type { CityState } from './types';

function simClock(city: CityState): SimClock {
  return { totalDays: city.totalDays, day: city.day, month: city.month, year: city.year };
}

export function resolveCauseLabel(cause: LossCause): string {
  const actual =
    cause === 'random'
      ? simPick(NATURAL_LOSS_CAUSES)
      : cause;
  return LOSS_CAUSE_LABELS[actual];
}

export function applySimGodInventoryTransfer(
  prev: CityState,
  fromId: string,
  toId: string,
  category: ShoppingCategory,
  qty: number,
  mode: 'gift' | 'theft',
  thiefName?: string
): CityState {
  if (fromId === toId || qty <= 0) return prev;
  syncSimRng(prev.rngState || prev.seed);
  const next = structuredClone(prev);
  const clock = simClock(next);
  const dateLabel = formatSimDate(next.day, next.month, next.year);
  const giver = next.citizens.find((c) => c.id === fromId && c.alive);
  const receiver = next.citizens.find((c) => c.id === toId && c.alive);
  if (!giver || !receiver) return prev;

  const { removedCount, removedValue, primaryStd } = removeCategoryUnits(giver, category, qty);
  if (removedCount === 0) return prev;

  const addedVal = addItemUnits(receiver, category, primaryStd, removedCount, next.totalDays);
  const summary = `${removedCount}x ${CATEGORY_LABELS[category]} (L${primaryStd})`;

  if (mode === 'theft') {
    reactToItemLoss({ citizen: giver, mart: next.mart, clock, dateLabel, valueLost: removedValue, causeLabel: 'Theft', category, summaryText: summary, events: next.events });
    reactToReceivedItems({ citizen: receiver, clock, dateLabel, mode: 'theft', valueAdded: addedVal, summaryText: summary, sourceName: giver.name });
  } else {
    reactToReceivedItems({ citizen: receiver, clock, dateLabel, mode: 'gift', valueAdded: addedVal, summaryText: summary });
  }

  const thiefTag = mode === 'theft' && thiefName ? ` · Suspected thief: ${thiefName}` : '';
  next.events.unshift(makeCityEvent(clock, `sg_xfer_${fromId}_${toId}`, {
    type: 'simgod',
    citizenId: receiver.id,
    citizenName: receiver.name,
    title: `SimGod action: Inventory ${mode === 'theft' ? 'Theft' : 'Gift'}`,
    detail: `Moved ${summary} (${formatDelta(addedVal)}) from ${giver.name} to ${receiver.name}${thiefTag}.`,
  }));
  next.events = next.events.slice(0, 600);
  next.rngState = getSimRngState();
  return next;
}
