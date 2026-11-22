// eventFactory.ts — Structured simulation event builder

import { formatSimDate } from './formatters';
import type { CityEvent } from './types';

export interface SimClock {
  totalDays: number;
  day: number;
  month: number;
  year: number;
}

export function makeCityEvent(
  clock: SimClock,
  suffix: string,
  partial: Omit<CityEvent, 'id' | 'totalDay' | 'dateLabel'>
): CityEvent {
  return {
    id: `evt_${clock.totalDays}_${suffix}`,
    totalDay: clock.totalDays,
    dateLabel: formatSimDate(clock.day, clock.month, clock.year),
    ...partial,
  };
}
