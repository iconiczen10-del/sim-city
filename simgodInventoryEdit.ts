// simgodInventoryEdit.ts — Direct quantity and condition editing for citizen inventory items

import { appendLifeLog } from './citizenLedger';
import { HOUSEHOLD_PACK_DAYS } from './constants';
import { makeCityEvent } from './eventFactory';
import { CATEGORY_LABELS, formatSimDate } from './formatters';
import type { ShoppingCategory } from './martTypes';
import { recordSimGodAction } from './recordsSimGod';
import type { CityState } from './types';

export function editCitizenInventoryDirect(
  prev: CityState,
  citizenId: string,
  category: ShoppingCategory,
  index: number,
  newQtyOrDays: number,
  newCondition?: number
): CityState {
  const next = structuredClone(prev);
  const clock = { totalDays: next.totalDays, day: next.day, month: next.month, year: next.year };
  const dateLabel = formatSimDate(next.day, next.month, next.year);
  const c = next.citizens.find((x) => x.id === citizenId && x.alive);
  if (!c) return prev;

  const cleanQty = Math.max(0, Math.round(newQtyOrDays));
  if (category === 'food' && c.inventory.food[index]) {
    if (cleanQty === 0) c.inventory.food.splice(index, 1);
    else c.inventory.food[index].meals = cleanQty;
  } else if (category === 'water' && c.inventory.water[index]) {
    if (cleanQty === 0) c.inventory.water.splice(index, 1);
    else c.inventory.water[index].days = cleanQty;
  } else if (category === 'clothes' && c.inventory.outfits[index]) {
    const cond = Math.max(0, Math.min(100, Math.round(newCondition ?? c.inventory.outfits[index].condition)));
    if (cond === 0 || cleanQty === 0) c.inventory.outfits.splice(index, 1);
    else c.inventory.outfits[index].condition = cond;
  } else if (category === 'household' && c.inventory.household[index]) {
    if (cleanQty === 0) c.inventory.household.splice(index, 1);
    else c.inventory.household[index].daysLeft = Math.min(HOUSEHOLD_PACK_DAYS * 3, cleanQty);
  } else {
    return prev;
  }

  appendLifeLog(c, next.totalDays, dateLabel, 'loss', `${CATEGORY_LABELS[category]} inventory adjusted.`);
  next.events.unshift(makeCityEvent(clock, `sg_edit_${citizenId}_${category}`, {
    type: 'simgod',
    citizenId: c.id,
    citizenName: c.name,
    title: `SimGod action: Edited ${c.name}'s ${CATEGORY_LABELS[category]}`,
    detail: `Directly updated ${CATEGORY_LABELS[category]} item #${index + 1} for ${c.name}.`,
  }));
  next.events = next.events.slice(0, 600);
  recordSimGodAction({ city: next, dateLabel, targetId: c.id, targetKind: 'citizen', targetName: c.name, preview: `Edit ${c.name} ${CATEGORY_LABELS[category]} #${index + 1}`, cause: 'Direct inventory edit', effect: `Set ${CATEGORY_LABELS[category]} qty/cond (${cleanQty})` });
  return next;
}
