// citizenSeedHelpers.ts — Random trait, inventory, and score calibration helpers for seeding

import type { CitizenInventory, CitizenStandards, OutfitItem } from './martTypes';
import type { SeedSlot } from './seedProfiles';
import type { CitizenTraits } from './types';

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createSeedTraits(): CitizenTraits {
  return {
    ambition: randInt(15, 95),
    greed: randInt(10, 92),
    kindness: randInt(15, 95),
    loyalty: randInt(20, 95),
    sociability: randInt(15, 95),
    discipline: randInt(15, 95),
  };
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
