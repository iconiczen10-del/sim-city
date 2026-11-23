// sharityWaveDetector.ts — Detects city crises and SimGod incidents to start multi-day Sharity reaction waves

import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import type { MartState } from './martTypes';
import type { SharityCityWave, SharityState } from './sharityTypes';
import type { CityEvent } from './types';

function addWave(
  sharity: SharityState,
  clock: SimClock,
  dateLabel: string,
  w: Omit<SharityCityWave, 'id' | 'startDay' | 'dateLabel'>,
  events: CityEvent[]
): void {
  const existing = (sharity.cityWaves ?? []).find((x) => x.kind === w.kind && x.endDay >= clock.totalDays);
  if (existing) return;
  const wave: SharityCityWave = { id: `wave_${clock.totalDays}_${w.kind}`, startDay: clock.totalDays, dateLabel, ...w };
  sharity.cityWaves = [wave, ...(sharity.cityWaves ?? [])].slice(0, 12);
  events.push(makeCityEvent(clock, wave.id, { type: 'city-wave', title: `City Wave: ${w.title}`, detail: `Neighbors across Vij are reacting to ${w.title} (${w.hashtag}).` }));
}

export function detectNewWaves(params: {
  sharity: SharityState; aliveCount: number; mart: MartState; dayEvents: CityEvent[]; clock: SimClock; dateLabel: string; events: CityEvent[];
}): void {
  const { sharity, aliveCount, mart, dayEvents, clock, dateLabel, events } = params;
  const foodQty = mart.stock.filter((s) => s.category === 'food').reduce((s, x) => s + x.quantity, 0);
  if (mart.closedDaysLeft > 0 || mart.closedUntilFunded) addWave(sharity, clock, dateLabel, { kind: 'mart_closed', title: 'Vij Mart Closure', endDay: clock.totalDays + 3, hashtag: '#VijMartClosed', sentimentDelta: -12, triggeredKey: 'mart_closed' }, events);
  else if (foodQty < Math.max(10, aliveCount * 1.4)) addWave(sharity, clock, dateLabel, { kind: 'food_stockout', title: 'Food Shelf Shortage', endDay: clock.totalDays + 3, hashtag: '#EmptyShelves', sentimentDelta: -10, triggeredKey: 'stockout' }, events);
  if (dayEvents.filter((e) => e.type === 'layoff').length >= 2) addWave(sharity, clock, dateLabel, { kind: 'mass_layoff', title: 'Layoff Shockwave', endDay: clock.totalDays + 4, hashtag: '#LayoffSeason', sentimentDelta: -15, triggeredKey: 'city_mass_layoff' }, events);

  for (const ev of dayEvents) {
    if (ev.type === 'bankruptcy') addWave(sharity, clock, dateLabel, { kind: 'bankruptcy', title: `${ev.title} Shock`, endDay: clock.totalDays + 4, hashtag: '#Bankruptcy', sentimentDelta: -16, triggeredKey: 'city_bankrupt' }, events);
    if (ev.type === 'death') addWave(sharity, clock, dateLabel, { kind: 'death', title: `Mourning ${ev.citizenName ?? 'a Neighbor'}`, endDay: clock.totalDays + 3, hashtag: '#InMemory', sentimentDelta: -14, triggeredKey: 'city_death' }, events);
    if (ev.type === 'simgod') {
      const txt = `${ev.title} ${ev.detail}`.toLowerCase();
      if (txt.includes('fire') || txt.includes('destroyed')) addWave(sharity, clock, dateLabel, { kind: 'incident_fire', title: 'Warehouse & Home Fires', endDay: clock.totalDays + 3, hashtag: '#FireLoss', sentimentDelta: -12, triggeredKey: 'nat_fire' }, events);
      else if (txt.includes('stole') || txt.includes('theft')) addWave(sharity, clock, dateLabel, { kind: 'incident_theft', title: 'Neighborhood Theft Spree', endDay: clock.totalDays + 3, hashtag: '#TheftAlert', sentimentDelta: -11, triggeredKey: 'nat_theft' }, events);
      else if (txt.includes('flood')) addWave(sharity, clock, dateLabel, { kind: 'incident_flood', title: 'District Flooding', endDay: clock.totalDays + 3, hashtag: '#FloodAlert', sentimentDelta: -12, triggeredKey: 'nat_flood' }, events);
      else if (txt.includes('poison') || txt.includes('tainted')) addWave(sharity, clock, dateLabel, { kind: 'incident_poison', title: 'Food Safety Scare', endDay: clock.totalDays + 3, hashtag: '#FoodSafety', sentimentDelta: -15, triggeredKey: 'nat_poisoning' }, events);
      else if (txt.includes('power')) addWave(sharity, clock, dateLabel, { kind: 'incident_power', title: 'Grid Power Outage', endDay: clock.totalDays + 2, hashtag: '#PowerOut', sentimentDelta: -9, triggeredKey: 'nat_power_cut' }, events);
      else if (txt.includes('price')) addWave(sharity, clock, dateLabel, { kind: 'incident_price', title: 'Sudden Price Surge', endDay: clock.totalDays + 3, hashtag: '#PricesUp', sentimentDelta: -11, triggeredKey: 'nat_price_jump' }, events);
    }
  }
}
