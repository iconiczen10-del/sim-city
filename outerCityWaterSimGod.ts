// outerCityWaterSimGod.ts — SimGod price overrides and supplier personality overrides for Outer City Water

import { formatSimDate } from './formatters';
import { computePricesSnapshot, ensureOuterCityWater, OUTER_SUPPLIER_LABELS } from './outerCityWater';
import type { OuterSupplierPersonality } from './outerCityWaterTypes';
import { recordSimGodAction } from './recordsSimGod';
import type { CityState } from './types';

export function applyOuterWaterOverride(
  prev: CityState,
  mode: 'multiplier' | 'fixed_floor' | 'release',
  value: number,
  days: number
): CityState {
  const next = structuredClone(prev);
  const ocw = ensureOuterCityWater(next.mart);
  const dateLabel = formatSimDate(prev.day, prev.month, prev.year);
  if (mode === 'release') {
    ocw.override = null;
  } else {
    ocw.override = { mode, value, daysLeft: Math.max(1, Math.round(days)) };
  }
  const aliveCount = next.citizens.filter((c) => c.alive).length;
  const outsideActive = Boolean(next.companies.find((c) => c.id === 'vijindustries')?.bankrupt);
  ocw.pricesByLevel = computePricesSnapshot(next.mart, ocw.personality, ocw.scarcityDays, aliveCount, next.month, outsideActive, ocw);

  const effect = mode === 'release'
    ? 'Released Outer City Water SimGod price override.'
    : `Applied ${mode === 'multiplier' ? `${value}x` : `min ${value}/lvl`} Outer City Water override for ${days}d.`;
  recordSimGodAction({ city: next, dateLabel, targetId: 'vijmart', targetKind: 'mart', targetName: 'Outer City Water', preview: 'Outer Water Price Override', cause: 'SimGod override', effect });
  return next;
}

export function applyOuterWaterPersonality(prev: CityState, personality: OuterSupplierPersonality): CityState {
  const next = structuredClone(prev);
  const ocw = ensureOuterCityWater(next.mart);
  const dateLabel = formatSimDate(prev.day, prev.month, prev.year);
  ocw.personality = personality;
  ocw.driftNote = `Set to ${OUTER_SUPPLIER_LABELS[personality]} by SimGod on ${dateLabel}.`;
  const aliveCount = next.citizens.filter((c) => c.alive).length;
  const outsideActive = Boolean(next.companies.find((c) => c.id === 'vijindustries')?.bankrupt);
  ocw.pricesByLevel = computePricesSnapshot(next.mart, ocw.personality, ocw.scarcityDays, aliveCount, next.month, outsideActive, ocw);
  recordSimGodAction({ city: next, dateLabel, targetId: 'vijmart', targetKind: 'mart', targetName: 'Outer City Water', preview: `Supplier: ${OUTER_SUPPLIER_LABELS[personality]}`, cause: 'SimGod policy override', effect: ocw.driftNote });
  return next;
}
