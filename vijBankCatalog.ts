// vijBankCatalog.ts — Vij Bank personality tuning, banking staff role bands, loan catalog, and credit bands

import type { RoleLevel } from './cityBaseTypes';
import { clamp } from './economy';
import type { Citizen } from './types';
import type { BankJobTitle, BankPersonality, CreditBand, LoanType } from './vijBankTypes';

export interface BankPersonalitySpec {
  id: BankPersonality;
  label: string;
  summary: string;
  rateOffset: number;
  minScore: number;
  maxDti: number;
  reserveRatio: number;
  defaultMissThreshold: number;
  harshness: number; // 0..100
  restructureChance: number;
  forgivePct: number;
}

export const BANK_PERSONALITIES: Record<BankPersonality, BankPersonalitySpec> = {
  prudent_guardian: {
    id: 'prudent_guardian', label: 'Prudent Guardian',
    summary: 'Low rates, strict credit scores, big reserves, restructures before seizing.',
    rateOffset: -0.025, minScore: 635, maxDti: 0.36, reserveRatio: 0.34,
    defaultMissThreshold: 3, harshness: 28, restructureChance: 0.78, forgivePct: 0.1,
  },
  growth_hunter: {
    id: 'growth_hunter', label: 'Growth Hunter',
    summary: 'Approves broadly with thin reserves, mid-high rates, hard collections, crash risk.',
    rateOffset: 0.035, minScore: 430, maxDti: 0.72, reserveRatio: 0.14,
    defaultMissThreshold: 2, harshness: 76, restructureChance: 0.25, forgivePct: 0,
  },
  community_banker: {
    id: 'community_banker', label: 'Community Banker',
    summary: 'Lower rates for modest earners, patient grace periods, occasional partial forgiveness.',
    rateOffset: -0.015, minScore: 500, maxDti: 0.52, reserveRatio: 0.24,
    defaultMissThreshold: 3, harshness: 20, restructureChance: 0.7, forgivePct: 0.28,
  },
  predator: {
    id: 'predator', label: 'Predator',
    summary: 'Payday-style rates and fees, rapid repossession and wage garnishment, low public trust.',
    rateOffset: 0.14, minScore: 340, maxDti: 0.9, reserveRatio: 0.16,
    defaultMissThreshold: 2, harshness: 95, restructureChance: 0.1, forgivePct: 0,
  },
  bureaucrat: {
    id: 'bureaucrat', label: 'Bureaucrat',
    summary: 'Rigid checklist thresholds, slow uniform terms even during a citywide crisis.',
    rateOffset: 0.01, minScore: 590, maxDti: 0.44, reserveRatio: 0.26,
    defaultMissThreshold: 2, harshness: 55, restructureChance: 0.35, forgivePct: 0.04,
  },
};

export interface BankRoleSpec {
  title: Exclude<BankJobTitle, 'CEO'>;
  roleLevel: Exclude<RoleLevel, 'Unemployed' | 'Retired'>;
  minPay: number;
  maxPay: number;
  priority: number;
  duty: string;
}

export const BANK_STAFF_SPECS: BankRoleSpec[] = [
  { title: 'Branch Manager', roleLevel: 'Executive', minPay: 2950, maxPay: 4250, priority: 1, duty: 'Branch reserves, lending limits & policy' },
  { title: 'Loan Officer', roleLevel: 'Manager', minPay: 1900, maxPay: 2700, priority: 2, duty: 'Loan underwriting & borrower screening' },
  { title: 'Credit Analyst', roleLevel: 'Team Lead', minPay: 1280, maxPay: 1760, priority: 3, duty: 'Monthly credit scoring & default risk' },
  { title: 'Collections Officer', roleLevel: 'Staff', minPay: 780, maxPay: 1120, priority: 4, duty: 'Arrears recovery, garnishment & repo' },
  { title: 'Teller', roleLevel: 'Entry', minPay: 430, maxPay: 590, priority: 5, duty: 'Counter service, instalments & cash desk' },
];

export const BANK_SPEC_BY_TITLE: Record<Exclude<BankJobTitle, 'CEO'>, BankRoleSpec> = {
  'Branch Manager': BANK_STAFF_SPECS[0],
  'Loan Officer': BANK_STAFF_SPECS[1],
  'Credit Analyst': BANK_STAFF_SPECS[2],
  'Collections Officer': BANK_STAFF_SPECS[3],
  Teller: BANK_STAFF_SPECS[4],
};

export function inferBankTitle(citizen: Pick<Citizen, 'roleLevel' | 'bankJobTitle'>): BankJobTitle {
  if (citizen.roleLevel === 'CEO') return 'CEO';
  if (citizen.bankJobTitle && citizen.bankJobTitle !== 'CEO') return citizen.bankJobTitle;
  if (citizen.roleLevel === 'Executive') return 'Branch Manager';
  if (citizen.roleLevel === 'Manager') return 'Loan Officer';
  if (citizen.roleLevel === 'Team Lead') return 'Credit Analyst';
  if (citizen.roleLevel === 'Staff') return 'Collections Officer';
  return 'Teller';
}

export function calculateBankTitlePay(
  citizen: Pick<Citizen, 'skill' | 'experience' | 'traits'>,
  title: Exclude<BankJobTitle, 'CEO'>,
  companyHealthMult = 1.0
): number {
  const spec = BANK_SPEC_BY_TITLE[title];
  const merit = clamp((citizen.skill - 10) / 80, 0, 1) * 0.65 + clamp(citizen.experience / 12, 0, 1) * 0.35;
  const raw = spec.minPay + (spec.maxPay - spec.minPay) * clamp(merit * clamp(companyHealthMult, 0.8, 1.1), 0, 1);
  return Math.round(clamp(raw, spec.minPay * 0.85, spec.maxPay * 1.08));
}

export const LOAN_LABELS: Record<LoanType, string> = {
  emergency_micro: 'Emergency Micro-Loan',
  bill_smoothing: 'Bill-Smoothing Loan',
  appliance_collateral: 'Appliance Collateral Loan',
  housing_loan: 'Housing Loan',
  credit_line: 'Revolving Credit Line',
  business_ceo: 'Business / CEO Loan',
};

export function getCreditBand(score: number): CreditBand {
  if (score >= 800) return 'Prime';
  if (score >= 740) return 'Good';
  if (score >= 670) return 'Fair';
  if (score >= 580) return 'Subprime';
  return 'High Risk';
}
