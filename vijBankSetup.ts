// vijBankSetup.ts — Seeded Vij Bank initialization, citizen debt profile initializer, and branch power scaling

import type { Company } from './companyTypes';
import { clamp } from './economy';
import { simPick, simRandInt } from './rng';
import type { Citizen, CityState } from './types';
import { BANK_PERSONALITIES, getCreditBand } from './vijBankCatalog';
import type { BankPersonality, CitizenDebtProfile, VijBankState } from './vijBankTypes';

const ALL_PERSONALITIES: BankPersonality[] = [
  'prudent_guardian',
  'growth_hunter',
  'community_banker',
  'predator',
  'bureaucrat',
];

export function createSeedDebtProfile(c: Pick<Citizen, 'age' | 'savings' | 'lastGrossPay' | 'roleLevel' | 'traits'>): CitizenDebtProfile {
  const base =
    560
    + Math.min(90, Math.round(c.savings / 120))
    + (c.roleLevel !== 'Unemployed' ? 45 : -45)
    + Math.round((c.traits.discipline - 50) * 0.8)
    + Math.min(30, Math.max(0, c.age - 22));
  const creditScore = Math.round(clamp(base + simRandInt(-20, 20), 340, 840));
  return {
    creditScore,
    creditBand: getCreditBand(creditScore),
    totalDebt: 0,
    monthlyObligation: 0,
    dtiRatio: 0,
    riskLevel: 'Low',
    trustInBank: Math.round(clamp(58 + (c.traits.optimism - 50) * 0.25 + (c.traits.honesty - 50) * 0.15, 25, 88)),
    perceivedDebt: 0,
    shame: 0,
    repaymentStrategy: c.traits.discipline >= 65 ? 'full' : c.traits.thriftiness >= 55 ? 'smallest_first' : 'minimum',
    garnishmentPct: 0,
    inheritedDebtTotal: 0,
    copingNote: '',
    warnings: [],
    decisionHistory: [],
  };
}

export function ensureCitizenDebtProfile(c: Citizen): CitizenDebtProfile {
  if (!c.debtProfile) c.debtProfile = createSeedDebtProfile(c);
  return c.debtProfile;
}

export function createInitialVijBankState(citizens: Citizen[]): VijBankState {
  const personality = simPick(ALL_PERSONALITIES);
  const spec = BANK_PERSONALITIES[personality];
  for (const c of citizens) {
    ensureCitizenDebtProfile(c);
    if (personality === 'predator') c.debtProfile!.trustInBank = Math.max(20, c.debtProfile!.trustInBank - 14);
    if (personality === 'community_banker') c.debtProfile!.trustInBank = Math.min(92, c.debtProfile!.trustInBank + 10);
  }
  return {
    personality,
    initialPersonality: personality,
    reserveRatio: spec.reserveRatio,
    baseRateAdjust: 0,
    branchLevel: 1,
    totalLoaned: 0,
    totalRepaid: 0,
    totalDefaultsLoss: 0,
    totalInterestEarned: 0,
    activeLoanCount: 0,
    defaultedLoanCount: 0,
    repossessionsCount: 0,
    garnishmentsCount: 0,
    bankruptDryMonths: 0,
    personalityHistory: [],
    loans: [],
  };
}

export function ensureVijBankState(city: CityState): VijBankState {
  if (!city.bank) city.bank = createInitialVijBankState(city.citizens);
  for (const c of city.citizens) ensureCitizenDebtProfile(c);
  return city.bank;
}

export function getVijBankPowerMultiplier(bank: VijBankState | undefined, citizens: Citizen[], comp?: Company): number {
  const staffCount = citizens.filter((c) => c.alive && c.employerId === 'vijcapital').length;
  const activeLoans = bank?.activeLoanCount ?? 0;
  const branchLevel = bank?.branchLevel ?? 1;
  const staffFactor = 0.78 + Math.min(0.9, staffCount * 0.085);
  const loanFactor = 1 + Math.min(0.45, activeLoans * 0.015);
  const levelFactor = 1 + Math.max(0, branchLevel - 1) * 0.18;
  const cashClamp = comp && comp.cash < 3000 ? 0.88 : 1;
  return Math.round(clamp(staffFactor * loanFactor * levelFactor * cashClamp, 0.72, 2.4) * 100) / 100;
}
