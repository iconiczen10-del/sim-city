// vijBankBorrowing.ts — Conscious NPC borrowing (Why/What/How), imperfect rate reading, peer trust, and disbursement

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { appendCompanyLedger } from './companyLedger';
import type { Company } from './companyTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { HousingState } from './housingTypes';
import { recordSimEvent } from './recordsStore';
import { simIdSuffix, simRand, simRandInt } from './rng';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';
import { BANK_PERSONALITIES, EDU_LABELS_EDU_RANK, LOAN_LABELS } from './vijBankCatalogHelper';
import { computeLoanOffer, syncCitizenDebtMetrics } from './vijBankCredit';
import { ensureCitizenDebtProfile } from './vijBankSetup';
import type { BankLoan, LoanType, VijBankState } from './vijBankTypes';

function pickBorrowTrigger(c: Citizen, bank: VijBankState): { type: LoanType; amount: number; term: number; why: string } | null {
  const activeCount = bank.loans.filter((l) => l.borrowerId === c.id && l.status !== 'paid' && l.status !== 'written_off' && l.status !== 'refused_heir').length;
  if (activeCount >= 3) return null;
  const needCash = c.savings < 120;
  const arrears = (c.rentArrears ?? 0) + (c.electricArrears ?? 0);
  if ((c.hunger < 42 || c.thirst < 42) && needCash) {
    return { type: 'emergency_micro', amount: simRandInt(140, 380), term: 2, why: 'Food & water crisis with empty savings' };
  }
  if (arrears >= 60 || (needCash && (c.lastElectricBill ?? 0) > c.savings)) {
    return { type: 'bill_smoothing', amount: Math.max(180, Math.min(900, Math.round(arrears + 180))), term: 3, why: 'Electricity/rent bill shortfall' };
  }
  if (c.debtProfile?.repaymentStrategy === 'borrow_to_repay' && (c.debtProfile?.monthlyObligation ?? 0) > c.savings && simRand() < 0.35) {
    return { type: 'credit_line', amount: Math.round(Math.max(250, (c.debtProfile?.monthlyObligation ?? 200) * 1.6)), term: 6, why: 'Rollover credit line to cover existing debt' };
  }
  const hasBrokenEssential = (c.inventory.electronics ?? []).some((e) => e.broken && (e.applianceId === 'fridge' || e.applianceId === 'cooker' || e.applianceId === 'phone'));
  if (hasBrokenEssential && c.savings < 260 && simRand() < 0.4) {
    return { type: 'appliance_collateral', amount: simRandInt(240, 520), term: 6, why: 'Replace essential appliance using item as collateral' };
  }
  if (c.roleLevel === 'CEO' && c.employerId && c.savings < 900 && simRand() < 0.18) {
    return { type: 'business_ceo', amount: simRandInt(1200, 3200), term: 10, why: 'Executive liquidity & business bridge' };
  }
  const statusDrive = (c.traits.greed + c.traits.impulsiveness) / 200;
  if (c.traits.impulsiveness > 62 && c.traits.discipline < 52 && c.savings < 700 && simRand() < 0.12 * statusDrive) {
    return { type: 'credit_line', amount: simRandInt(300, 950), term: 6, why: c.traits.pride > 62 ? 'Status lifestyle pressure from peers' : 'Impulse discretionary spending' };
  }
  return null;
}

export function evaluateCitizenBorrowing(params: {
  citizen: Citizen;
  bank: VijBankState;
  vijCapital: Company | undefined;
  allCitizens: Citizen[];
  housing: HousingState;
  sharity?: SharityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { citizen, bank, vijCapital, allCitizens, housing, clock, dateLabel, events } = params;
  if (!citizen.alive || citizen.age < 25) return;
  const prof = ensureCitizenDebtProfile(citizen);
  const trigger = pickBorrowTrigger(citizen, bank);
  if (!trigger) return;

  // Conscious reluctance: pride, low trust, high thriftiness oppose borrowing unless survival emergency
  const desperate = trigger.type === 'emergency_micro' || trigger.type === 'bill_smoothing';
  const prideResist = (citizen.traits.pride - 50) * (desperate ? 0.15 : 0.45);
  const thriftResist = (citizen.traits.thriftiness - 50) * 0.35;
  const trustPull = (prof.trustInBank - 50) * 0.45;
  const urgeScore = (desperate ? 45 : 22) + (citizen.traits.impulsiveness - 50) * 0.3 + trustPull - prideResist - thriftResist;
  if (urgeScore < 10) return;

  const workingApp = (citizen.inventory.electronics ?? []).find((e) => !e.broken && e.purchasePrice >= 120);
  const houseOwned = housing.houses.find((h) => h.ownerId === citizen.id);
  const hasCollateral = trigger.type === 'appliance_collateral' ? Boolean(workingApp) : trigger.type === 'housing_loan' ? Boolean(houseOwned) : false;

  const offer = computeLoanOffer({
    citizen, loanType: trigger.type, requestedAmount: trigger.amount, termMonths: trigger.term,
    bank, vijCapital, allCitizens, housing, hasCollateral,
  });

  if (!offer.approved || !vijCapital) {
    prof.trustInBank = Math.round(clamp(prof.trustInBank - 4, 5, 100));
    prof.decisionHistory = [{
      id: `ddec_${clock.totalDays}_${citizen.id}_${simIdSuffix()}`, day: clock.totalDays, dateLabel, action: 'denied' as const,
      why: trigger.why, what: `${LOAN_LABELS[trigger.type]} (${formatDelta(trigger.amount)})`,
      how: `Declined by Vij Bank: ${offer.denyReason ?? 'insufficient reserves'}.`,
    }, ...prof.decisionHistory].slice(0, 24);
    return;
  }

  // Imperfect rate/fee reading when low education/discipline or panicking
  const literacy = EDU_LABELS_EDU_RANK[citizen.education] * 12 + citizen.traits.discipline * 0.6;
  const misreadRate = literacy < 68 || desperate;
  const perceivedApr = misreadRate ? Math.round(offer.annualRate * 75) : Math.round(offer.annualRate * 100);
  if (!desperate && citizen.traits.discipline >= 70 && offer.annualRate > 0.34) return; // prudent refusal

  const colKind = trigger.type === 'appliance_collateral' && workingApp ? 'appliance' : trigger.type === 'housing_loan' && houseOwned ? 'house' : 'none';
  const colLabel = colKind === 'appliance' ? workingApp?.name : colKind === 'house' ? houseOwned?.name : undefined;
  const colId = colKind === 'appliance' ? workingApp?.id : colKind === 'house' ? houseOwned?.id : undefined;

  const loan: BankLoan = {
    id: `loan_${clock.totalDays}_${citizen.id}_${simIdSuffix()}`,
    borrowerId: citizen.id, borrowerName: citizen.name, type: trigger.type,
    principal: offer.principal, annualRate: offer.annualRate, monthlyInterestRate: offer.monthlyRate,
    originationFee: offer.originationFee, balance: Math.round((offer.principal + offer.originationFee) * 100) / 100,
    termMonths: offer.termMonths, monthsRemaining: offer.termMonths, monthlyInstallment: offer.monthlyInstallment,
    missedCount: 0, lateCount: 0, status: 'active',
    collateralKind: colKind, collateralId: colId, collateralLabel: colLabel,
    originatedDay: clock.totalDays, originatedDate: dateLabel, nextDueDay: clock.totalDays + 30,
    reasonWhy: trigger.why,
    termsWhat: `${LOAN_LABELS[trigger.type]} ${formatDelta(offer.principal)} @ ${Math.round(offer.annualRate * 100)}% APR for ${offer.termMonths}m (${formatDelta(offer.monthlyInstallment)}/mo)`,
    decisionHow: misreadRate ? `Accepted fast under pressure (estimated ~${perceivedApr}% APR vs ${Math.round(offer.annualRate * 100)}% actual).` : `Compared terms with Vij Bank (${BANK_PERSONALITIES[bank.personality].label}) and accepted.`,
    paymentHistory: [],
  };

  vijCapital.cash = Math.round((vijCapital.cash - offer.principal) * 100) / 100;
  citizen.savings = Math.round((citizen.savings + offer.principal) * 100) / 100;
  bank.totalLoaned = Math.round((bank.totalLoaned + offer.principal) * 100) / 100;
  bank.loans.unshift(loan);

  appendCompanyLedger(vijCapital, clock, dateLabel, {
    kind: 'outflow', category: 'loan_disbursement', label: `${LOAN_LABELS[trigger.type]} (${citizen.name})`,
    detail: `${offer.termMonths}m @ ${Math.round(offer.annualRate * 100)}% APR`, amount: offer.principal, balanceAfter: vijCapital.cash,
  });
  appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'income', 'Bank Loan', `${LOAN_LABELS[trigger.type]} disbursed`, offer.principal);
  appendLifeLog(citizen, clock.totalDays, dateLabel, 'money', `Borrowed ${formatDelta(offer.principal)} (${LOAN_LABELS[trigger.type]}): ${trigger.why}.`);
  prof.decisionHistory = [{
    id: `ddec_${clock.totalDays}_${citizen.id}_${simIdSuffix()}`, day: clock.totalDays, dateLabel, action: 'borrowed' as const,
    why: loan.reasonWhy, what: loan.termsWhat, how: loan.decisionHow,
  }, ...prof.decisionHistory].slice(0, 24);
  recordConsequentialDecision({
    citizen, clock, dateLabel, kind: 'loan_borrow', category: 'security',
    title: `Borrow ${LOAN_LABELS[trigger.type]}`, chosenOption: `Borrow ${formatDelta(offer.principal)}`, altOption: 'Go Without Credit',
    chosenReason: `${trigger.why}. ${loan.decisionHow}`,
    chosenFactors: [{ label: desperate ? 'Urgent Need' : 'Desire/Status', value: 28 }],
    altFactors: [{ label: 'Debt Caution', value: Math.round(citizen.traits.thriftiness * 0.25) }],
    diarySentence: `Took out ${loan.termsWhat}.`,
  });
  events.push(makeCityEvent(clock, `loan_${loan.id}`, { type: 'loan', citizenId: citizen.id, citizenName: citizen.name, companyId: 'vijcapital', title: 'Vij Bank Loan Issued', detail: `${citizen.name} borrowed ${formatDelta(offer.principal)} (${LOAN_LABELS[trigger.type]}).` }));
  recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'companies', subType: 'bank_loan_issued', subjectId: citizen.id, subjectKind: 'citizen', subjectName: citizen.name, summary: `${citizen.name} borrowed ${formatDelta(offer.principal)} via ${LOAN_LABELS[trigger.type]}`, detail: { loanId: loan.id, amount: offer.principal, apr: offer.annualRate, termMonths: offer.termMonths, why: trigger.why } });
  syncCitizenDebtMetrics(citizen, bank.loans, allCitizens, bank);
}
