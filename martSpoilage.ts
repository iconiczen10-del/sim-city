// martSpoilage.ts — Daily food shelf-life aging and Mart waste/spoilage logging

import { FOOD_SPOIL_DAYS } from './constants';
import { makeCityEvent, type SimClock } from './eventFactory';
import { STANDARD_LABELS } from './formatters';
import type { MartState } from './martTypes';
import type { CityEvent } from './types';

export function processMartFoodSpoilage(
  mart: MartState,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): void {
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
}
