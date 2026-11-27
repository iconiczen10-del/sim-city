// vijBankCredit.ts — Credit scoring, reserve-ratio capacity, and dynamic personality-adjusted loan pricing

import type { Company } from './companyTypes';
import { clamp } from './economy';
import { getHouseholdSummary } from './householdPool';
import type { HousingState } from './housingTypes';
import { simRandFloat } from './rng';
import type { Citizen } from './types';
import { BANK_PERSONALITIES, getCreditBand } from './vijBankCatalog';
import type { BankLoan, LoanType, VijBankState } from './vijBankTypes';

export interface LoanOffer {
  approved: boolean;
  denyReason?: string;
  principal: number;
  annualRate: number;
  monthlyRate: number;
  originationFee: number;
  termMonths: number;
  monthlyInstallment: number;
  totalRepayment: number;
  dtiAfter: number;
}

export function computeCitizenCreditScore(
  citizen: Citizen,
  bank: VijBankState,
  allCitizens: Citizen[]
): number {
  const prof = citizen.debtProfile;
  const pool = getHouseholdSummary(citizen, allCitizens);
  const myLoans = bank.loans.filter((l) => l.borrowerId === citizen.id);
  let onTimeMarks = 0;
  let lateMarks = 0;
  let missedMarks = 0;
  for (const l of myLoans) {
    for (const pm of l.paymentHistory.slice(-12)) {
      if (pm.status === 'on_time') onTimeMarks += 1;
      else if (pm.status === 'late') lateMarks += 1;
      else if (pm.status === 'missed') missedMarks += 1;
    }
  }

  const incomeScore = clamp(pool.combinedGrossPay / 42, 0, 95);
  const savingsScore = clamp(pool.combinedSavings / 65, 0, 85);
  const tenureScore = citizen.roleLevel === 'Unemployed' ? -Math.min(55, citizen.unemployedDays * 0.45) : clamp(citizen.tenureMonths * 2.5, 0, 55);
  const ageScore = clamp((citizen.age - 18) * 1.1, 0, 40);
  const discBonus = (citizen.traits.discipline - 50) * 0.7;
  const dtiPenalty = pool.combinedGrossPay > 0
    ? clamp((pool.combinedMonthlyDebt / Math.max(250, pool.combinedGrossPay)) * 130, 0, 140)
    : Math.min(120, (prof?.totalDebt ?? 0) * 0.05);
  const historyDelta = onTimeMarks * 8 - lateMarks * 18 - missedMarks * 42;
  const defaultPenalty = myLoans.filter((l) => l.status === 'defaulted' || l.status === 'written_off').length * 85;
  const prevScore = prof?.creditScore ?? 610;
  const target = clamp(505 + incomeScore + savingsScore + tenureScore + ageScore + discBonus + historyDelta - dtiPenalty - defaultPenalty, 300, 850);
  return Math.round(clamp(prevScore * 0.45 + target * 0.55, 300, 850));
}

export function getBankLendableCash(vijCapital: Company | undefined, bank: VijBankState): number {
  if (!vijCapital || vijCapital.bankrupt) return 0;
  return Math.max(0, Math.round((vijCapital.cash * (1 - bank.reserveRatio)) * 100) / 100);
}

export function computeLoanOffer(params: {
  citizen: Citizen;
  loanType: LoanType;
  requestedAmount: number;
  termMonths: number;
  bank: VijBankState;
  vijCapital: Company | undefined;
  allCitizens: Citizen[];
  housing: HousingState;
  hasCollateral?: boolean;
}): LoanOffer {
  const { citizen, loanType, requestedAmount, termMonths, bank, vijCapital, allCitizens, housing, hasCollateral } = params;
  const spec = BANK_PERSONALITIES[bank.personality];
  const score = computeCitizenCreditScore(citizen, bank, allCitizens);
  const pool = getHouseholdSummary(citizen, allCitizens, housing);
  const lendable = getBankLendableCash(vijCapital, bank);

  if (!vijCapital || vijCapital.bankrupt || lendable < 40) {
    return { approved: false, denyReason: 'Vij Bank cash reserves depleted', principal: 0, annualRate: 0, monthlyRate: 0, originationFee: 0, termMonths, monthlyInstallment: 0, totalRepayment: 0, dtiAfter: 0 };
  }

  let effectiveMinScore = spec.minScore;
  if (loanType === 'appliance_collateral' && hasCollateral) effectiveMinScore -= 45;
  if (loanType === 'housing_loan') effectiveMinScore += 30;
  if (loanType === 'emergency_micro' || loanType === 'bill_smoothing') effectiveMinScore -= 25;
  if (bank.personality === 'community_banker' && pool.combinedGrossPay < 1200) effectiveMinScore -= 30;

  if (score < effectiveMinScore) {
    return { approved: false, denyReason: `Credit score ${score} below ${spec.label} cutoff (${effectiveMinScore})`, principal: 0, annualRate: 0, monthlyRate: 0, originationFee: 0, termMonths, monthlyInstallment: 0, totalRepayment: 0, dtiAfter: 0 };
  }

  const principal = Math.round(clamp(requestedAmount, 40, Math.min(lendable, loanType === 'housing_loan' ? 18000 : loanType === 'business_ceo' ? 12000 : 4500)));
  const scoreSpread = clamp((760 - score) / 1100, -0.02, 0.24);
  const typeAdj = loanType === 'emergency_micro' ? 0.04 : loanType === 'credit_line' ? 0.05 : loanType === 'housing_loan' ? -0.02 : loanType === 'appliance_collateral' ? -0.015 : 0;
  const lowIncomeMod = bank.personality === 'community_banker' && pool.combinedGrossPay < 1100 ? -0.03 : 0;
  const termAdj = termMonths > 12 ? 0.015 : 0;
  const noise = simRandFloat(-0.015, 0.018);
  const annualRate = Math.round(clamp(0.08 + scoreSpread + spec.rateOffset + bank.baseRateAdjust + typeAdj + lowIncomeMod + termAdj + noise, 0.045, 0.65) * 1000) / 1000;
  const monthlyRate = annualRate / 12;
  const feeRate = bank.personality === 'predator' ? 0.065 : bank.personality === 'growth_hunter' ? 0.03 : 0.012;
  const originationFee = Math.round(principal * feeRate);
  const totalWithFee = principal + originationFee;
  const monthlyInstallment = monthlyRate > 0.0001
    ? Math.round(((totalWithFee * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))) * 100) / 100
    : Math.round((totalWithFee / termMonths) * 100) / 100;
  const totalRepayment = Math.round(monthlyInstallment * termMonths * 100) / 100;
  const incomeFloor = Math.max(300, pool.combinedGrossPay);
  const dtiAfter = Math.round(((pool.combinedMonthlyDebt + monthlyInstallment) / incomeFloor) * 100) / 100;

  if (dtiAfter > spec.maxDti && loanType !== 'emergency_micro') {
    return { approved: false, denyReason: `Debt-to-income ${Math.round(dtiAfter * 100)}% exceeds ${Math.round(spec.maxDti * 100)}% limit`, principal: 0, annualRate, monthlyRate, originationFee, termMonths, monthlyInstallment, totalRepayment, dtiAfter };
  }

  return { approved: true, principal, annualRate, monthlyRate, originationFee, termMonths, monthlyInstallment, totalRepayment, dtiAfter };
}

export function syncCitizenDebtMetrics(citizen: Citizen, loans: BankLoan[], allCitizens: Citizen[], bank: VijBankState): void {
  const prof = citizen.debtProfile;
  if (!prof) return;
  const active = loans.filter((l) => l.borrowerId === citizen.id && (l.status === 'active' || l.status === 'restructured' || l.status === 'defaulted'));
  prof.totalDebt = Math.round(active.reduce((s, l) => s + l.balance, 0) * 100) / 100;
  prof.monthlyObligation = Math.round(active.reduce((s, l) => s + (l.status === 'defaulted' ? l.monthlyInstallment * 0.5 : l.monthlyInstallment), 0) * 100) / 100;
  prof.inheritedDebtTotal = Math.round(active.filter((l) => Boolean(l.inheritedFromId)).reduce((s, l) => s + l.balance, 0) * 100) / 100;
  const pool = getHouseholdSummary(citizen, allCitizens);
  prof.dtiRatio = pool.combinedGrossPay > 0 ? Math.round((prof.monthlyObligation / pool.combinedGrossPay) * 100) / 100 : (prof.totalDebt > 0 ? 1 : 0);
  prof.creditScore = computeCitizenCreditScore(citizen, bank, allCitizens);
  prof.creditBand = getCreditBand(prof.creditScore);
  prof.riskLevel = prof.totalDebt <= 0 ? 'Low' : (prof.dtiRatio > 0.55 || active.some((l) => l.missedCount >= 2)) ? 'Critical' : (prof.dtiRatio > 0.35 || active.some((l) => l.lateCount > 0)) ? 'Elevated' : 'Moderate';
  if (citizen.traits.discipline < 42 && citizen.stress > 60) {
    prof.perceivedDebt = Math.round(prof.totalDebt * 0.72 * 100) / 100; // underestimates when stressed
  } else {
    prof.perceivedDebt = prof.totalDebt;
  }
}
