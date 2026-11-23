// citizenSeedHelpers.ts — Random trait, inventory, and score calibration helpers for seeding

import { createSeedTraits18 } from './citizenTraits';
import { simPick, simRandInt } from './rng';
import type { CitizenInventory, CitizenStandards, OutfitItem } from './martTypes';
import type { SeedSlot } from './seedProfiles';
import type { CitizenTraits } from './types';

export function randInt(min: number, max: number): number {
  return simRandInt(min, max);
}

export function pick<T>(arr: readonly T[]): T {
  return simPick(arr);
}

export function createSeedTraits(existingSigs?: Set<string>): CitizenTraits {
  return createSeedTraits18(existingSigs);
}

export function createSeedInventory(
  id: string,
  standards: CitizenStandards
): CitizenInventory {
  const outfitCount = randInt(2, 4);
  const outfits: OutfitItem[] = Array.from({ length: outfitCount }, (_, i) => ({
    id: `out_${id}_${i}`,
    standard: standards.clothes,
    condition: randInt(68, 98),
  }));

  return {
    food: [
      { standard: standards.food, meals: 6, daysOld: 0 },
      { standard: standards.food, meals: 3, daysOld: 1 },
    ],
    water: [{ standard: standards.water, days: 7 }],
    outfits,
    household: [{ standard: standards.household, daysLeft: randInt(18, 30) }],
  };
}

export function calibrateInitialScore(
  score: number,
  targetTier: SeedSlot['targetTier']
): number {
  if (targetTier === 'T1' && score < 81) return randInt(81, 90);
  if (targetTier === 'T2' && (score < 61 || score >= 80)) return randInt(62, 77);
  if (targetTier === 'T3' && (score < 41 || score >= 60)) return randInt(42, 57);
  if (targetTier === 'T4' && (score < 21 || score >= 40)) return randInt(22, 37);
  if (targetTier === 'T5' && score >= 20) return randInt(6, 18);
  return score;
}
