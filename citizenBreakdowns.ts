// citizenBreakdowns.ts — Signed mood breakdown matching mood total and status score breakdown

import type { SignedFactor } from './citizenInspectorTypes';
import { getMemorySignals } from './citizenMemory';
import { getStressMoodPenalty } from './citizenStress';
import { ROLE_STATUS_SCORES } from './constants';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import { estimateMonthlyShoppingCost } from './standards';
import { computeIncomeScore, computeSavingsScore } from './status';
import { simRand } from './rng';
import type { Citizen } from './types';

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function buildMoodFactors(
  citizen: Citizen,
  netPay: number,
  hadShortageToday: boolean,
  martReputation: number
): { targetMood: number; factors: SignedFactor[] } {
  const fixed = calculateFixedMonthlyCosts(citizen.homeType).total;
  const estLiving = fixed + estimateMonthlyShoppingCost(citizen.standards);
  const monthsSaved = estLiving > 0 ? citizen.savings / estLiving : 0;
  const mem = getMemorySignals(citizen);

  const factors: SignedFactor[] = [{ label: 'Baseline Outlook', value: 54 }];

  let savingsVal = 14;
  if (monthsSaved < 0.25) savingsVal = -16;
  else if (monthsSaved < 1) savingsVal = -7;
  else if (monthsSaved < 3) savingsVal = 4;
  else if (monthsSaved < 6) savingsVal = 9;
  factors.push({ label: 'Savings Runway', value: savingsVal });

  let incomeVal = -8;
  if (citizen.roleLevel === 'Unemployed') incomeVal = citizen.traits.ambition > 65 ? -16 : -12;
  else if (netPay >= estLiving * 1.15) incomeVal = 9;
  else if (netPay >= estLiving) incomeVal = 4;
  factors.push({ label: 'Pay vs Living Costs', value: incomeVal });

  if (citizen.hunger < 15) factors.push({ label: 'Severe Hunger', value: -22 });
  else if (citizen.hunger < 45) factors.push({ label: 'Hunger', value: -10 });

  if (citizen.thirst < 15) factors.push({ label: 'Severe Thirst', value: -26 });
  else if (citizen.thirst < 45) factors.push({ label: 'Thirst', value: -12 });

  if (hadShortageToday) factors.push({ label: 'Mart Stock-Out Today', value: -6 });

  const avgStd =
    (citizen.standards.food + citizen.standards.water + citizen.standards.clothes + citizen.standards.household) / 4;
  if (avgStd >= 4.2) factors.push({ label: 'High Living Standards', value: 9 });
  else if (avgStd >= 3.2) factors.push({ label: 'Comfortable Standards', value: 5 });
  else if (avgStd <= 1.25) factors.push({ label: 'Minimum Standards Strain', value: -4 });

  const stressPen = getStressMoodPenalty(citizen.stress);
  if (stressPen !== 0) factors.push({ label: 'Stress Burden', value: stressPen });

  const memVal = r1(clamp((mem.posWeight - mem.negWeight * 0.85) * 0.12, -16, 14));
  if (Math.abs(memVal) >= 0.5) factors.push({ label: 'Memories & Trust', value: memVal });

  const repVal = r1((martReputation - 70) * 0.08);
  if (Math.abs(repVal) >= 0.3) factors.push({ label: 'Vij Mart Reputation', value: repVal });

  const traitVal = r1(
    (citizen.traits.kindness + citizen.traits.sociability - 100) * 0.05 +
      (citizen.traits.discipline - 50) * 0.04 +
      (citizen.traits.greed > 70 && netPay < estLiving * 1.15 ? -4 : 0)
  );
  if (Math.abs(traitVal) >= 0.3) factors.push({ label: 'Personality & Temperament', value: traitVal });

  const targetMood = clamp(factors.reduce((s, f) => s + f.value, 0), 2, 98);
  return { targetMood, factors };
}

export function stepMoodWithBreakdown(
  citizen: Citizen,
  netPay: number,
  hadShortageToday: boolean,
  martReputation: number,
  griefPenalty: number
): { mood: number; breakdown: SignedFactor[] } {
  const { targetMood, factors } = buildMoodFactors(citizen, netPay, hadShortageToday, martReputation);
  const drift = (targetMood - citizen.mood) * 0.14;
  const noise = (simRand() - 0.5) * 1.8;
  const nextMood = r1(clamp(citizen.mood + drift + noise - griefPenalty, 0, 100));

  const outFactors = [...factors];
  if (griefPenalty > 0) {
    outFactors.push({ label: 'City Grief', value: r1(-griefPenalty) });
  }
  const sum = outFactors.reduce((s, f) => s + f.value, 0);
  const driftGap = r1(nextMood - sum);
  if (Math.abs(driftGap) >= 0.1) {
    outFactors.push({ label: 'Daily Drift & Inertia', value: driftGap });
  }
  return { mood: nextMood, breakdown: outFactors };
}

export function computeStatusBreakdown(citizen: Citizen): {
  savingsScore: number;
  incomeScore: number;
  roleScore: number;
  respectScore: number;
  weightedTarget: number;
} {
  const savingsScore = r1(computeSavingsScore(citizen.savings));
  const incomeScore = r1(computeIncomeScore(citizen.lastGrossPay));
  const roleScore = ROLE_STATUS_SCORES[citizen.roleLevel];
  const respectScore = r1(clamp(citizen.respect, 0, 100));
  const weightedTarget = r1(
    savingsScore * 0.4 + incomeScore * 0.25 + roleScore * 0.2 + respectScore * 0.15
  );
  return { savingsScore, incomeScore, roleScore, respectScore, weightedTarget };
}
