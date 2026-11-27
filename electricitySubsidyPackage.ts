// electricitySubsidyPackage.ts — Mood offset and dynamic 100+ package combination builder from household subsidy score

import { clamp } from './economy';
import type { GJSubsidyMood, HouseSubsidyPackage, LifelineMode, SimGodSubsidyLevel } from './gjSubsidyTypes';
import { simRandFloat, simRandInt } from './rng';
import type { Citizen } from './types';

export function moodOffset(mood: GJSubsidyMood, override?: SimGodSubsidyLevel): number {
  if (override === 'none') return -999;
  if (override === 'full') return 60;
  if (override === 'high') return 26;
  if (override === 'medium') return 6;
  if (override === 'low') return -12;
  return mood === 'generous' ? 15 : mood === 'strict' ? -14 : 0;
}

export function buildPackageFromScore(params: {
  score: number;
  occ: Citizen[];
  units: number;
  arrears: number;
  unpaidMonths: number;
  isWinterOrSpike: boolean;
  override?: SimGodSubsidyLevel;
}): Pick<HouseSubsidyPackage, 'lifelineMode' | 'lifelineUnitLimit' | 'waiverPct' | 'incomeCapPct' | 'paymentPlanMonths' | 'lateFeeWaived' | 'coldSnapRelief' | 'status'> {
  const { score, occ, units, arrears, unpaidMonths, isWinterOrSpike, override } = params;
  const totalPay = occ.reduce((s, c) => s + (c.lastGrossPay || 0), 0);
  const allLowOrUnemp = totalPay <= 420;
  if (override === 'none' || score < 38) {
    return { lifelineMode: 'none', lifelineUnitLimit: 110, waiverPct: 0, incomeCapPct: null, paymentPlanMonths: 0, lateFeeWaived: false, coldSnapRelief: 0, status: 'ineligible' };
  }

  const limit = 105 + Math.max(0, occ.length - 1) * 28;
  const lifelineMode: LifelineMode =
    units <= limit * 0.72 && score >= 62 ? 'free_0'
    : units <= limit ? 'low_020'
    : units <= limit * 1.28 && score >= 52 ? 'tapered'
    : 'none';

  const waiverPct =
    override === 'full' || (allLowOrUnemp && score >= 74) ? 100
    : score >= 68 ? simRandInt(35, 70)
    : score >= 54 ? simRandInt(12, 34)
    : 0;

  const incomeCapPct =
    waiverPct >= 100 || totalPay <= 0 ? null
    : score >= 72 ? 4
    : score >= 60 ? 6
    : score >= 48 ? 8
    : 10;

  const wantsPlan = arrears > 15 || unpaidMonths >= 1 || occ.some((c) => c.electricityAwareness?.askedForPlan);
  const paymentPlanMonths = wantsPlan ? (score >= 68 ? 4 : score >= 52 ? 3 : 2) : 0;
  const lateFeeWaived = score >= 46 || waiverPct === 100;
  const coldSnapRelief = isWinterOrSpike && score >= 48 ? Math.round(clamp((score - 35) * simRandFloat(0.28, 0.55), 5, 32) * 100) / 100 : 0;

  const status: HouseSubsidyPackage['status'] =
    waiverPct >= 100 ? 'free_bill'
    : paymentPlanMonths > 0 ? 'payment_plan'
    : lifelineMode !== 'none' && waiverPct === 0 ? 'lifeline'
    : 'active';

  return { lifelineMode, lifelineUnitLimit: limit, waiverPct, incomeCapPct, paymentPlanMonths, lateFeeWaived, coldSnapRelief, status };
}
