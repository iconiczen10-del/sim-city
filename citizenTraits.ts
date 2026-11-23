// citizenTraits.ts — 18 citizen trait metadata, clustered deterministic seeding, and child inheritance

import { clamp } from './economy';
import { simRand, simRandInt } from './rng';
import type { CitizenTraits } from './types';

export interface TraitMeta {
  key: keyof CitizenTraits;
  label: string;
  group: 'Core Drives' | 'Character & Integrity' | 'Temperament & Survival';
  hint: string;
}

export const TRAIT_METADATA: TraitMeta[] = [
  { key: 'ambition', label: 'Ambition', group: 'Core Drives', hint: 'Drives career climbing and status pursuit' },
  { key: 'greed', label: 'Greed', group: 'Core Drives', hint: 'Prioritizes wealth accumulation and status flexes' },
  { key: 'kindness', label: 'Kindness', group: 'Core Drives', hint: 'Favors generosity, empathy, and helping others' },
  { key: 'loyalty', label: 'Loyalty', group: 'Core Drives', hint: 'Sticks by employers, teammates, and close friends' },
  { key: 'sociability', label: 'Sociability', group: 'Core Drives', hint: 'Shapes social contact drain and Sharity activity' },
  { key: 'discipline', label: 'Discipline', group: 'Core Drives', hint: 'Supports saving habits, routine, and composure' },
  { key: 'honesty', label: 'Honesty', group: 'Character & Integrity', hint: 'Resists lying, cheating, or stealing when pressured' },
  { key: 'courage', label: 'Courage', group: 'Character & Integrity', hint: 'Faces confrontation, risk, and catches thieves' },
  { key: 'patience', label: 'Patience', group: 'Character & Integrity', hint: 'Endures difficult stretches before snapping or quitting' },
  { key: 'curiosity', label: 'Curiosity', group: 'Character & Integrity', hint: 'Accelerates skill growth and wards off boredom' },
  { key: 'pride', label: 'Pride', group: 'Character & Integrity', hint: 'Resists charity/downgrades; amplifies shame after failure' },
  { key: 'thriftiness', label: 'Thriftiness', group: 'Character & Integrity', hint: 'Curbs spending and reduces recreation pressure' },
  { key: 'optimism', label: 'Optimism', group: 'Temperament & Survival', hint: 'Biases neutral moods upward and softens setbacks' },
  { key: 'resilience', label: 'Resilience', group: 'Temperament & Survival', hint: 'Speeds recovery from mood, stress, and health blows' },
  { key: 'impulsiveness', label: 'Impulsiveness', group: 'Temperament & Survival', hint: 'Favors immediate reactions over patient deliberation' },
  { key: 'riskTolerance', label: 'Risk Tolerance', group: 'Temperament & Survival', hint: 'Accepts career jumps, bold buys, or desperate gambles' },
  { key: 'neatness', label: 'Neatness', group: 'Temperament & Survival', hint: 'Boosts home comfort, hygiene habits, and immunity' },
  { key: 'survivalInstinct', label: 'Survival Instinct', group: 'Temperament & Survival', hint: 'Overrides pride and preferences when basic needs crash' },
];

function clusteredTrait(): number {
  if (simRand() < 0.2) return simRandInt(8, 95);
  return Math.round((simRandInt(24, 78) + simRandInt(28, 74)) / 2);
}

function traitsSignature(t: CitizenTraits): string {
  return TRAIT_METADATA.map((m) => t[m.key]).join(',');
}

export function createSeedTraits18(existingSigs?: Set<string>): CitizenTraits {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const raw: CitizenTraits = {
      ambition: clusteredTrait(),
      greed: clusteredTrait(),
      kindness: clusteredTrait(),
      loyalty: clusteredTrait(),
      sociability: clusteredTrait(),
      discipline: clusteredTrait(),
      honesty: clusteredTrait(),
      courage: clusteredTrait(),
      patience: clusteredTrait(),
      curiosity: clusteredTrait(),
      pride: clusteredTrait(),
      thriftiness: clusteredTrait(),
      optimism: clusteredTrait(),
      resilience: clusteredTrait(),
      impulsiveness: clusteredTrait(),
      riskTolerance: clusteredTrait(),
      neatness: clusteredTrait(),
      survivalInstinct: clusteredTrait(),
    };
    const vals = Object.values(raw);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    if (avg < 36 || avg > 64) {
      const shift = Math.round(50 - avg);
      for (const m of TRAIT_METADATA) raw[m.key] = clamp(raw[m.key] + shift, 8, 95);
    }
    const sig = traitsSignature(raw);
    if (!existingSigs || !existingSigs.has(sig)) {
      existingSigs?.add(sig);
      return raw;
    }
  }
  return {
    ambition: simRandInt(20, 85), greed: simRandInt(15, 85), kindness: simRandInt(20, 90), loyalty: simRandInt(20, 90),
    sociability: simRandInt(18, 90), discipline: simRandInt(20, 90), honesty: simRandInt(25, 90), courage: simRandInt(20, 88),
    patience: simRandInt(20, 88), curiosity: simRandInt(20, 90), pride: simRandInt(15, 88), thriftiness: simRandInt(18, 88),
    optimism: simRandInt(20, 90), resilience: simRandInt(20, 90), impulsiveness: simRandInt(15, 85), riskTolerance: simRandInt(18, 85),
    neatness: simRandInt(22, 90), survivalInstinct: simRandInt(25, 92),
  };
}

export function backfillTraits18(partial: Partial<CitizenTraits>): CitizenTraits {
  const fresh = createSeedTraits18();
  const out = { ...fresh };
  for (const m of TRAIT_METADATA) {
    if (typeof partial[m.key] === 'number' && Number.isFinite(partial[m.key])) out[m.key] = clamp(partial[m.key]!, 0, 100);
  }
  return out;
}

export function inheritChildTraits(parent1: CitizenTraits, parent2: CitizenTraits): CitizenTraits {
  const child = { ...parent1 };
  for (const m of TRAIT_METADATA) {
    const avg = (parent1[m.key] + parent2[m.key]) / 2;
    child[m.key] = Math.round(clamp(avg + simRandInt(-15, 15), 0, 100));
  }
  return child;
}
