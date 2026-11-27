// electricityAwarenessSeed.ts — Initializes and migrates each NPC's imperfect "What I Know" electricity & GJ trust profile

import { clamp } from './economy';
import type { ElectricityAwarenessProfile } from './gjSubsidyTypes';
import { simRand, simRandInt } from './rng';
import type { Citizen } from './types';

const EDU_ACCURACY: Record<Citizen['education'], number> = {
  none: 0.22,
  school: 0.36,
  diploma: 0.54,
  degree: 0.72,
  masters: 0.84,
  professional: 0.9,
};

export function createInitialElectricityAwareness(c: Pick<Citizen, 'education' | 'traits' | 'roleLevel' | 'lastGrossPay'>): ElectricityAwarenessProfile {
  const eduScore = EDU_ACCURACY[c.education] ?? 0.45;
  const discScore = (c.traits.discipline + (c.traits.curiosity ?? 50)) / 200;
  const clarity = clamp(eduScore * 0.6 + discScore * 0.4, 0.12, 0.96);

  const roll = simRand();
  const tariffBeliefAccuracy: ElectricityAwarenessProfile['tariffBeliefAccuracy'] =
    clarity > 0.65 && roll < 0.75 ? 'accurate'
    : clarity > 0.38 || roll < 0.68 ? 'vague'
    : 'wrong';

  const knowsSubsidy = simRand() < (c.lastGrossPay <= 600 ? 0.25 : 0.14);
  const trustBase = 54 + Math.round((c.traits.optimism - 50) * 0.22 + simRandInt(-8, 12));

  return {
    knowsTariffBands: clarity > 0.45 && simRand() < clarity + 0.15,
    tariffBeliefAccuracy,
    knowsLateFee: simRand() < clarity + 0.12,
    knowsDisconnectRule: simRand() < clarity + 0.08,
    knowsReconnectFine: simRand() < clarity * 0.85,
    knowsSubsidy,
    subsidySource: knowsSubsidy ? 'gj_notice' : 'none',
    subsidyLearnedDay: knowsSubsidy ? 1 : undefined,
    refusedSubsidy: false,
    askedForPlan: false,
    trustInGJ: clamp(trustBase, 25, 90),
    lastKnownBill: 0,
    monthlyConservationPct: c.traits.thriftiness >= 68 ? simRandInt(6, 14) : 0,
    lastReactionNote: 'Standard household grid expectations.',
  };
}

export function ensureCitizenElectricityAwareness(c: Citizen): ElectricityAwarenessProfile {
  if (!c.electricityAwareness) {
    c.electricityAwareness = createInitialElectricityAwareness(c);
  }
  if (!Array.isArray(c.subsidyHistory)) {
    c.subsidyHistory = [];
  }
  return c.electricityAwareness;
}
