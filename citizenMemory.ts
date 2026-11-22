// citizenMemory.ts — Emotional memory creation, decay over time, and behavioral impact signals

import type { CitizenMemory, MemoryKind } from './citizenInspectorTypes';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import type { Citizen } from './types';

function computeDecayRate(initialWeight: number): number {
  const absW = Math.abs(initialWeight);
  if (absW >= 70) return 0.018;
  if (absW >= 40) return 0.032;
  if (absW >= 20) return 0.05;
  return 0.085;
}

export function addCitizenMemory(
  citizen: Citizen,
  clock: SimClock,
  dateLabel: string,
  kind: MemoryKind,
  summary: string,
  rawWeight: number
): CitizenMemory {
  const stressAmp = 1 + (citizen.stress / 100) * 0.25;
  const traitAmp =
    rawWeight < 0
      ? 1 + (citizen.traits.discipline - 50) * 0.002 + (citizen.traits.greed - 50) * 0.002
      : 1 + (citizen.traits.kindness - 50) * 0.003;
  const initialWeight = Math.round(clamp(rawWeight * stressAmp * traitAmp, -100, 100));

  const mem: CitizenMemory = {
    id: `mem_${clock.totalDays}_${citizen.id}_${kind}_${Math.random().toString(36).slice(2, 6)}`,
    totalDay: clock.totalDays,
    dateLabel,
    kind,
    summary,
    initialWeight,
    currentWeight: initialWeight,
    decayRate: computeDecayRate(initialWeight),
    linkedDecisionIds: [],
  };

  citizen.memories = [mem, ...citizen.memories].slice(0, 48);
  return mem;
}

export function decayCitizenMemories(citizen: Citizen): void {
  citizen.giftShieldDays = Math.max(0, citizen.giftShieldDays - 1);
  citizen.memories = citizen.memories
    .map((m) => ({
      ...m,
      currentWeight: Math.round(m.currentWeight * (1 - m.decayRate) * 10) / 10,
    }))
    .filter((m) => Math.abs(m.currentWeight) >= 1);
}

export function linkMemoriesToDecision(
  citizen: Citizen,
  memoryIds: string[],
  decisionId: string
): void {
  if (memoryIds.length === 0) return;
  const set = new Set(memoryIds);
  for (const m of citizen.memories) {
    if (set.has(m.id) && !m.linkedDecisionIds.includes(decisionId)) {
      m.linkedDecisionIds = [decisionId, ...m.linkedDecisionIds].slice(0, 12);
    }
  }
}

export function getMemorySignals(citizen: Citizen): {
  netWeight: number;
  negWeight: number;
  posWeight: number;
  martTrustDelta: number;
  cautionBonus: number;
  recentLossOrStockoutIds: string[];
  positiveIds: string[];
} {
  let negWeight = 0;
  let posWeight = 0;
  const recentLossOrStockoutIds: string[] = [];
  const positiveIds: string[] = [];

  for (const m of citizen.memories) {
    if (m.currentWeight < 0) {
      negWeight += Math.abs(m.currentWeight);
      if (['loss', 'stockout', 'price_shock', 'rationing', 'broke'].includes(m.kind)) {
        recentLossOrStockoutIds.push(m.id);
      }
    } else if (m.currentWeight > 0) {
      posWeight += m.currentWeight;
      positiveIds.push(m.id);
    }
  }

  const traitMult = 0.75 + (citizen.traits.discipline + citizen.traits.greed) / 400;
  const stressMult = 1 + citizen.stress / 200;
  const cautionBonus = clamp((negWeight / 45) * traitMult * stressMult, 0, 8);
  const martTrustDelta = clamp((posWeight - negWeight * 0.45) / 18, -10, 10);

  return {
    netWeight: Math.round((posWeight - negWeight) * 10) / 10,
    negWeight: Math.round(negWeight * 10) / 10,
    posWeight: Math.round(posWeight * 10) / 10,
    martTrustDelta: Math.round(martTrustDelta * 10) / 10,
    cautionBonus: Math.round(cautionBonus * 10) / 10,
    recentLossOrStockoutIds: recentLossOrStockoutIds.slice(0, 4),
    positiveIds: positiveIds.slice(0, 3),
  };
}
