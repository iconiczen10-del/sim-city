// citizenStress.ts — Daily citizen stress (0-100), signed stress breakdown, and mood/health impact

import type { SignedFactor } from './citizenInspectorTypes';
import { getMemorySignals } from './citizenMemory';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import { estimateMonthlyShoppingCost } from './standards';
import type { Citizen } from './types';

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function buildStressFactors(citizen: Citizen): {
  targetStress: number;
  factors: SignedFactor[];
} {
  const fixed = calculateFixedMonthlyCosts(citizen.homeType).total;
  const estMonthly = fixed + estimateMonthlyShoppingCost(citizen.standards);
  const monthsSaved = estMonthly > 0 ? citizen.savings / estMonthly : 0;
  const mem = getMemorySignals(citizen);

  const factors: SignedFactor[] = [];
  factors.push({ label: 'Baseline Vigilance', value: 14 });

  if (citizen.hunger < 25) factors.push({ label: 'Severe Hunger', value: 24 });
  else if (citizen.hunger < 55) factors.push({ label: 'Low Food / Hunger', value: 11 });

  if (citizen.thirst < 25) factors.push({ label: 'Severe Dehydration', value: 28 });
  else if (citizen.thirst < 55) factors.push({ label: 'Thirst Deficit', value: 13 });

  if (citizen.health < 50) factors.push({ label: 'Poor Health / Illness', value: 16 });
  else if (citizen.health < 75) factors.push({ label: 'Health Strain', value: 7 });

  if (monthsSaved < 0.25) factors.push({ label: 'Critically Low Savings', value: 18 });
  else if (monthsSaved < 1) factors.push({ label: 'Thin Savings Cushion', value: 9 });
  else if (monthsSaved >= 3) factors.push({ label: 'Financial Security', value: -7 });

  if (citizen.roleLevel === 'Unemployed') {
    factors.push({ label: 'Unemployment Worry', value: 10 });
  }

  const memStress = clamp(mem.negWeight * 0.14, 0, 24);
  if (memStress >= 1) {
    factors.push({ label: 'Painful Memories', value: r1(memStress) });
  }

  const posRelief = clamp(mem.posWeight * 0.12, 0, 12);
  if (posRelief >= 1) {
    factors.push({ label: 'Positive Memories Relief', value: r1(-posRelief) });
  }

  if (citizen.standards.food >= 3 && citizen.hunger > 65 && citizen.thirst > 65) {
    const stdRelief = citizen.standards.food >= 4 ? -7 : -4;
    factors.push({ label: 'Good Daily Living Relief', value: stdRelief });
  }

  const discBuffer = (citizen.traits.discipline - 50) * -0.08;
  if (Math.abs(discBuffer) >= 0.5) {
    factors.push({ label: 'Discipline Composure', value: r1(discBuffer) });
  }

  const rawTarget = factors.reduce((s, f) => s + f.value, 0);
  const targetStress = clamp(rawTarget, 2, 98);
  return { targetStress, factors };
}

export function stepDailyStress(
  citizen: Citizen,
  immediateShock = 0
): { stress: number; breakdown: SignedFactor[] } {
  const { targetStress, factors } = buildStressFactors(citizen);
  const driftRate = targetStress > citizen.stress ? 0.22 : 0.12;
  const nextStress = r1(clamp(citizen.stress + (targetStress - citizen.stress) * driftRate + immediateShock, 0, 100));

  const factorSum = factors.reduce((s, f) => s + f.value, 0);
  const diff = r1(nextStress - factorSum);
  const finalFactors = Math.abs(diff) >= 0.1
    ? [...factors, { label: 'Daily Recovery / Momentum', value: diff }]
    : factors;

  return { stress: nextStress, breakdown: finalFactors };
}

export function getStressMoodPenalty(stress: number): number {
  if (stress >= 75) return -16;
  if (stress >= 55) return -10;
  if (stress >= 35) return -4;
  return 0;
}

export function getStressHealthDrain(stress: number): number {
  if (stress >= 85) return 2.2;
  if (stress >= 70) return 1.1;
  if (stress >= 58) return 0.4;
  return 0;
}
