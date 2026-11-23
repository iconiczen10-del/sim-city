// citizenBreakdowns.ts — Signed mood breakdown matching mood total and status score breakdown

import { stepCitizenEmotionsDaily } from './citizenEmotionEngine';
import { EMOTION_META } from './citizenEmotions';
import type { SignedFactor } from './citizenInspectorTypes';
import { getMemorySignals } from './citizenMemory';
import { getStressMoodPenalty } from './citizenStress';
import { ROLE_STATUS_SCORES } from './constants';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import type { SimClock } from './eventFactory';
import { estimateMonthlyShoppingCost } from './standards';
import { computeEffectiveRespect, computeIncomeScore, computeSavingsScore } from './status';
import { simRand } from './rng';
import type { Citizen, CityEvent } from './types';

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

  for (const sl of citizen.sharityMoodLines ?? []) {
    if (Math.abs(sl.value) >= 0.2) factors.push({ label: sl.label, value: r1(sl.value) });
  }

  const targetMood = clamp(factors.reduce((s, f) => s + f.value, 0), 2, 98);
  return { targetMood, factors };
}

export function stepMoodWithBreakdown(
  citizen: Citizen,
  netPay: number,
  hadShortageToday: boolean,
  martReputation: number,
  griefPenalty: number,
  clock?: SimClock,
  dateLabel?: string,
  events?: CityEvent[]
): { mood: number; breakdown: SignedFactor[] } {
  const goodRecovery = citizen.mood >= 62 && citizen.stress < 45 ? 0.84 : 1;
  if (Array.isArray(citizen.sharityMoodLines)) {
    citizen.sharityMoodLines = citizen.sharityMoodLines
      .map((l) => ({ ...l, value: r1(l.value * l.decayRate * (l.value < 0 ? goodRecovery : 1)) }))
      .filter((l) => Math.abs(l.value) >= 0.25);
  }
  const emotionTarget = clock && dateLabel && events
    ? stepCitizenEmotionsDaily(citizen, netPay, hadShortageToday, martReputation, griefPenalty, clock, dateLabel, events)
    : buildMoodFactors(citizen, netPay, hadShortageToday, martReputation).targetMood;

  const sharitySum = (citizen.sharityMoodLines ?? []).reduce((s, l) => s + l.value, 0);
  const housingMood = r1(citizen.housingMoodOffset ?? 0);
  const resRate = clamp(0.18 + (citizen.traits.resilience - 50) * 0.0012, 0.1, 0.28);
  const targetWithSharity = clamp(emotionTarget + sharitySum + housingMood - griefPenalty * 0.5, 1, 99);
  const drift = (targetWithSharity - citizen.mood) * resRate;
  const noise = (simRand() - 0.5) * 1.4;
  const nextMood = r1(clamp(citizen.mood + drift + noise, 0, 100));

  const outFactors: SignedFactor[] = [{ label: 'Baseline & Optimism', value: r1(54 + (citizen.traits.optimism - 50) * 0.12) }];
  const topEm = EMOTION_META
    .map((m) => ({ m, v: citizen.emotions?.[m.id]?.value ?? 0 }))
    .filter((x) => Math.abs(x.v) >= 4)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, 5);
  for (const { m, v } of topEm) {
    outFactors.push({ label: `Emotion: ${m.label}`, value: r1(m.polarity === 'positive' ? v * 0.18 : -v * 0.18) });
  }
  for (const sl of citizen.sharityMoodLines ?? []) {
    if (Math.abs(sl.value) >= 0.2) outFactors.push({ label: sl.label, value: r1(sl.value) });
  }
  if (Math.abs(housingMood) >= 0.4) outFactors.push({ label: citizen.homeId === null ? 'Homelessness' : 'Housing Comfort', value: housingMood });
  if (griefPenalty > 0) outFactors.push({ label: 'City Grief / Strain', value: r1(-griefPenalty) });
  const sum = outFactors.reduce((s, f) => s + f.value, 0);
  const driftGap = r1(nextMood - sum);
  if (Math.abs(driftGap) >= 0.1) outFactors.push({ label: 'Daily Drift & Inertia', value: driftGap });
  return { mood: nextMood, breakdown: outFactors };
}

export function computeStatusBreakdown(citizen: Citizen): {
  savingsScore: number;
  incomeScore: number;
  roleScore: number;
  respectScore: number;
  socialReputation: number;
  weightedTarget: number;
} {
  const savingsScore = r1(computeSavingsScore(citizen.savings));
  const incomeScore = r1(computeIncomeScore(citizen.lastGrossPay));
  const roleScore = ROLE_STATUS_SCORES[citizen.roleLevel];
  const socialReputation = r1(clamp(citizen.socialReputation ?? 50, 0, 100));
  const respectScore = r1(computeEffectiveRespect(citizen.respect, socialReputation, citizen.healthProfile?.mental));
  const weightedTarget = r1(
    savingsScore * 0.4 + incomeScore * 0.25 + roleScore * 0.2 + respectScore * 0.15
  );
  return { savingsScore, incomeScore, roleScore, respectScore, socialReputation, weightedTarget };
}
