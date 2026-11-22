// sharityAffinity.ts — Pairwise citizen affinity scores (-100 to +100), slow monthly drift, and rankings

import { clamp } from './economy';
import { simRandFloat } from './rng';
import type { SharityState } from './sharityTypes';
import type { Citizen, TierId } from './types';

const TIER_NUM: Record<TierId, number> = { T1: 5, T2: 4, T3: 3, T4: 2, T5: 1 };

export function affinityKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

export function getAffinity(sharity: SharityState, aId: string, bId: string): number {
  if (aId === bId) return 0;
  return sharity.affinities[affinityKey(aId, bId)] ?? 0;
}

function computeTraitCloseness(a: Citizen, b: Citizen): number {
  const keys = ['ambition', 'greed', 'kindness', 'loyalty', 'sociability', 'discipline'] as const;
  const avgDiff = keys.reduce((s, k) => s + Math.abs(a.traits[k] - b.traits[k]), 0) / keys.length;
  if (avgDiff <= 20) return (20 - avgDiff) * 0.95;
  if (avgDiff >= 32) return -(avgDiff - 32) * 0.55;
  return 0;
}

function computeGreedKindnessClash(a: Citizen, b: Citizen): number {
  const aGreedyBKind = a.traits.greed >= 65 && b.traits.kindness >= 65 && b.traits.greed <= 45;
  const bGreedyAKind = b.traits.greed >= 65 && a.traits.kindness >= 65 && a.traits.greed <= 45;
  if (aGreedyBKind || bGreedyAKind) return -18;
  return 0;
}

export function seedAllAffinities(citizens: Citizen[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < citizens.length; i++) {
    for (let j = i + 1; j < citizens.length; j++) {
      const a = citizens[i];
      const b = citizens[j];
      let score = 0;
      if (a.employerId && a.employerId === b.employerId) score += 16;
      const sameBoss = Boolean(a.bossId && a.bossId === b.bossId);
      const bossLink = a.bossId === b.id || b.bossId === a.id;
      if (sameBoss) score += 10;
      if (bossLink) {
        const rel = a.bossId === b.id ? a.bossRelationship : b.bossRelationship;
        score += rel >= 0 ? 12 : -8;
      }
      score += computeTraitCloseness(a, b);
      const tierGap = Math.abs(TIER_NUM[a.tier] - TIER_NUM[b.tier]);
      if (tierGap >= 2) score -= (tierGap - 1) * 7;
      score += computeGreedKindnessClash(a, b);
      score += simRandFloat(-11, 11);
      map[affinityKey(a.id, b.id)] = Math.round(clamp(score, -100, 100));
    }
  }
  return map;
}

export function driftAffinitiesMonthly(citizens: Citizen[], sharity: SharityState): void {
  const alive = citizens.filter((c) => c.alive);
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i];
      const b = alive[j];
      const key = affinityKey(a.id, b.id);
      const cur = sharity.affinities[key] ?? 0;
      let pull = 0;
      if (a.employerId && a.employerId === b.employerId) pull += 1.0;
      if (a.bossId && a.bossId === b.bossId) pull += 0.8;
      if (Math.abs(TIER_NUM[a.tier] - TIER_NUM[b.tier]) >= 3) pull -= 0.7;
      if (computeGreedKindnessClash(a, b) < 0) pull -= 0.7;
      const next = Math.round(clamp(cur + pull + simRandFloat(-1.8, 1.8), -100, 100));
      sharity.affinities[key] = next;
    }
  }
}

export function getTopAndLowestAffinities(
  citizenId: string,
  citizens: Citizen[],
  sharity: SharityState,
  limit = 5
): { highest: { citizen: Citizen; score: number }[]; lowest: { citizen: Citizen; score: number }[] } {
  const rows = citizens
    .filter((c) => c.id !== citizenId)
    .map((citizen) => ({ citizen, score: getAffinity(sharity, citizenId, citizen.id) }));
  const highest = [...rows].sort((a, b) => b.score - a.score || a.citizen.name.localeCompare(b.citizen.name)).slice(0, limit);
  const lowest = [...rows].sort((a, b) => a.score - b.score || a.citizen.name.localeCompare(b.citizen.name)).slice(0, limit);
  return { highest, lowest };
}
