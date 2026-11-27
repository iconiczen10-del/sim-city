// outerCityWater.ts — Seeded Outer City Water supplier pricing, personality drift, and scarcity tracking

import { MART_BASE_PRICES } from './constants';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import type { DistrictId } from './housingPrefTypes';
import type { LivingStandard, MartState } from './martTypes';
import { findStockItem, round2 } from './martSetup';
import type { OuterCityWaterState, OuterSupplierPersonality } from './outerCityWaterTypes';
import { recordSimEvent } from './recordsStore';
import { simPick, simRand, simRandFloat } from './rng';
import type { Citizen, CityEvent } from './types';

export const OUTER_SUPPLIER_LABELS: Record<OuterSupplierPersonality, string> = {
  fair_trader: 'Fair Trader',
  opportunist: 'Opportunist',
  gouger: 'Gouger',
};

export const DISTRICT_WATER_DIST_MULT: Record<DistrictId | 'edge', number> = {
  old_town: 1.0,
  mill_quarter: 1.04,
  greenfield: 1.08,
  riverside: 1.11,
  hilltop: 1.15,
  edge: 1.09,
};

export function computePricesSnapshot(
  mart: MartState,
  personality: OuterSupplierPersonality,
  scarcityDays: number,
  popWaterDemand: number,
  month: number,
  outsideSupplierActive: boolean,
  ocw?: OuterCityWaterState
): Record<LivingStandard, number> {
  const emptyWater = mart.stock.filter((s) => s.category === 'water' && s.quantity <= 0).length;
  const emptyRatio = emptyWater / 5;
  const scarcityMult = 1 + emptyRatio * 0.24 + Math.min(0.36, scarcityDays * 0.03);
  const seasonHeat = month >= 4 && month <= 8 ? 1.14 : month === 3 || month === 9 ? 1.05 : 0.96;
  const demandMult = clamp(0.95 + (popWaterDemand / 65) * 0.14, 0.92, 1.24) * seasonHeat;
  const fuelMult = outsideSupplierActive ? 1.18 : 1.0;
  const persMult = personality === 'fair_trader' ? 1.18 : personality === 'opportunist' ? 1.38 : 1.66;

  const prices = {} as Record<LivingStandard, number>;
  for (const lvl of [1, 2, 3, 4, 5] as LivingStandard[]) {
    const base = MART_BASE_PRICES.water[lvl];
    const martPrice = findStockItem(mart, 'water', lvl)?.sellPrice ?? base;
    const jitter = simRandFloat(-0.04, 0.05);
    let raw = round2(base * persMult * scarcityMult * demandMult * fuelMult * (1 + jitter));
    const ov = ocw?.override;
    if (ov && ov.daysLeft > 0) {
      raw = ov.mode === 'multiplier' ? round2(raw * ov.value) : round2(Math.max(raw, ov.value * lvl));
    } else {
      const floorMult = 1.15 + simRandFloat(0.01, 0.06);
      raw = Math.max(raw, round2(martPrice * floorMult));
    }
    prices[lvl] = Math.max(0.6, raw);
  }
  return prices;
}

export function createInitialOuterCityWater(mart: MartState): OuterCityWaterState {
  const personality = simPick(['fair_trader', 'opportunist', 'gouger'] as const);
  return {
    personality,
    initialPersonality: personality,
    driftNote: `Seeded as ${OUTER_SUPPLIER_LABELS[personality]}.`,
    scarcityDays: 0,
    totalUnitsSold: 0,
    totalRevenue: 0,
    lostMartSalesCount: 0,
    lostMartRevenue: 0,
    lostMartTodayCount: 0,
    pricesByLevel: computePricesSnapshot(mart, personality, 0, 50, 1, false),
    buyerCounts: {},
    override: null,
    purchaseLog: [],
  };
}

export function ensureOuterCityWater(mart: MartState): OuterCityWaterState {
  if (!mart.outerCityWater) mart.outerCityWater = createInitialOuterCityWater(mart);
  return mart.outerCityWater;
}

export function stepOuterCityWaterDaily(params: {
  mart: MartState;
  citizens: Citizen[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
  outsideSupplierActive: boolean;
}): void {
  const { mart, citizens, clock, dateLabel, events, outsideSupplierActive } = params;
  const ocw = ensureOuterCityWater(mart);
  if (ocw.override) {
    ocw.override.daysLeft -= 1;
    if (ocw.override.daysLeft <= 0) ocw.override = null;
  }

  const waterEmptyCount = mart.stock.filter((s) => s.category === 'water' && s.quantity <= 0).length;
  const martWaterShort = mart.closedDaysLeft > 0 || mart.closedUntilFunded || waterEmptyCount >= 2;
  ocw.scarcityDays = martWaterShort ? ocw.scarcityDays + 1 : Math.max(0, ocw.scarcityDays - 1);

  if (ocw.lostMartTodayCount >= 3) {
    const repHit = Math.min(1.2, ocw.lostMartTodayCount * 0.14);
    mart.reputation = round2(clamp(mart.reputation - repHit, 0, 100));
  }

  // Personality drift from persistent shortages or calm abundance
  let nextPers = ocw.personality;
  if (ocw.scarcityDays >= 5 && ocw.lostMartTodayCount >= 4 && simRand() < 0.25) {
    nextPers = ocw.personality === 'fair_trader' ? 'opportunist' : 'gouger';
  } else if (ocw.scarcityDays === 0 && ocw.lostMartTodayCount === 0 && clock.day % 10 === 0 && simRand() < 0.2) {
    nextPers = ocw.personality === 'gouger' ? 'opportunist' : 'fair_trader';
  }

  if (nextPers !== ocw.personality) {
    const prev = ocw.personality;
    ocw.personality = nextPers;
    ocw.driftNote = `Shifted ${OUTER_SUPPLIER_LABELS[prev]} → ${OUTER_SUPPLIER_LABELS[nextPers]} on ${dateLabel}.`;
    events.push(makeCityEvent(clock, `ocw_drift_${clock.totalDays}`, {
      type: 'price-shock',
      title: 'Outer City Water Policy Shift',
      detail: `Outer City Water supplier shifted from ${OUTER_SUPPLIER_LABELS[prev]} to ${OUTER_SUPPLIER_LABELS[nextPers]}.`,
    }));
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'mart', subType: 'outer_water_drift',
      subjectId: 'vijmart', subjectKind: 'mart', subjectName: 'Outer City Water',
      summary: ocw.driftNote, detail: { from: prev, to: nextPers, scarcityDays: ocw.scarcityDays },
    });
  }

  const aliveCount = citizens.filter((c) => c.alive).length;
  ocw.pricesByLevel = computePricesSnapshot(mart, ocw.personality, ocw.scarcityDays, aliveCount, clock.month, outsideSupplierActive, ocw);
  ocw.lostMartTodayCount = 0;
}
