// economy.ts — Salary (with company health & industry), marginal tax, home selection, and fixed costs

import {
  EDUCATION_MULTIPLIERS,
  FIXED_NON_RENT_COSTS,
  RENT_COSTS,
  ROLE_PAY_BANDS,
} from './constants';
import { calculateGJTitlePay } from './gjStaffCatalog';
import type { Citizen, HomeType } from './types';
import { calculateBankTitlePay } from './vijBankCatalog';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function calculateMonthlyPay(
  citizen: Pick<Citizen, 'roleLevel' | 'education' | 'skill' | 'experience' | 'traits' | 'gjJobTitle' | 'bankJobTitle'>,
  companyHealthMult = 1.0,
  industryMult = 1.0
): number {
  if (citizen.roleLevel === 'Unemployed' || citizen.roleLevel === 'Retired') return 0;
  if (citizen.gjJobTitle && citizen.gjJobTitle !== 'CEO') {
    return calculateGJTitlePay(citizen, citizen.gjJobTitle, companyHealthMult);
  }
  if (citizen.bankJobTitle && citizen.bankJobTitle !== 'CEO') {
    return calculateBankTitlePay(citizen, citizen.bankJobTitle, companyHealthMult);
  }
  const band = ROLE_PAY_BANDS[citizen.roleLevel];
  const eduMult = EDUCATION_MULTIPLIERS[citizen.education];
  const skillMult = 0.8 + (citizen.skill / 100) * 0.5;
  const expMult = 1 + Math.min(0.3, citizen.experience * 0.03);
  const drive = (citizen.traits.greed + citizen.traits.ambition) / 200;
  const negMult = 0.95 + drive * 0.1;

  const combinedMult = eduMult * skillMult * expMult * negMult;
  const roleBase = (band.min + band.max) / 2;
  const bandPay = roleBase * (combinedMult / band.expectedMult);
  const scaled = bandPay * companyHealthMult * industryMult;
  const minFloor = Math.round(band.min * 0.72);
  const maxCeil = Math.round(band.max * 1.35);
  return Math.round(clamp(scaled, minFloor, maxCeil));
}

export function calculateMarginalTax(grossPay: number): number {
  if (grossPay <= 500) return 0;
  let tax = 0;
  if (grossPay > 500) tax += (Math.min(grossPay, 1500) - 500) * 0.05;
  if (grossPay > 1500) tax += (Math.min(grossPay, 3000) - 1500) * 0.1;
  if (grossPay > 3000) tax += (grossPay - 3000) * 0.2;
  return Math.round(tax);
}

const HOME_TIERS: HomeType[] = [
  'shared_room',
  'small_flat',
  'apartment',
  'villa',
  'mansion',
];

export function selectHomeType(
  netPay: number,
  savings: number,
  greed: number,
  discipline: number
): HomeType {
  const effectiveBudget = netPay + savings * 0.08;
  const spendBias = (greed - discipline) / 100;
  const desired = effectiveBudget * (1 + spendBias * 0.22);

  if (netPay === 0 && savings < 1200) return HOME_TIERS[0];
  if (desired >= 3600) return HOME_TIERS[4];
  if (desired >= 2100) return HOME_TIERS[3];
  if (desired >= 1050) return HOME_TIERS[2];
  if (desired >= 560) return HOME_TIERS[1];
  return HOME_TIERS[0];
}

export function calculateFixedMonthlyCosts(homeType: HomeType): {
  rent: number;
  nonRent: number;
  total: number;
} {
  const rent = RENT_COSTS[homeType];
  const nonRent = FIXED_NON_RENT_COSTS.total;
  return { rent, nonRent, total: rent + nonRent };
}
