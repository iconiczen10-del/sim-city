// vijBankRepayment.ts — Month-end loan instalment collection, household pool fallback, late fees, and garnishment

import { addCitizenMemory } from './citizenMemory';
import { appendLifeLog } from './citizenLedger';
import { appendCompanyLedger } from './companyLedger';
import type { Company } from './companyTypes';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { getMarriedSpouse, spendFromHouseholdPool } from './householdPool';
import type { HousingState } from './housingTypes';
import { simIdSuffix } from './rng';
import type { Citizen, CityEvent } from './types';
import { BANK_PERSONALITIES, LOAN_LABELS } from './vijBankCatalog';
import { resolveLoanDefault } from './vijBankConsequences';
import { syncCitizenDebtMetrics } from './vijBankCredit';
import { ensureCitizenDebtProfile } from './vijBankSetup';
import type { RepaymentStrategy, VijBankState } from './vijBankTypes';

function pickRepaymentStrategy(c: Citizen): RepaymentStrategy {
  const prof = ensureCitizenDebtProfile(c);
  if (prof.dtiRatio > 0.65 && c.savings < prof.monthlyObligation) return c.traits.optimism > 65 ? 'borrow_to_repay' : 'skip';
  if (c.traits.discipline >= 68 && c.savings >= prof.monthlyObligation * 1.4) return 'full';
  if (c.traits.thriftiness >= 62) return 'smallest_first';
  return 'minimum';
}

export function collectMonthlyLoanInstalments(params: {
  bank: VijBankState;
  vijCapital: Company | undefined;
  citizens: Citizen[];
  housing: HousingState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { bank, vijCapital, citizens, housing, clock, dateLabel, events } = params;
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const spec = BANK_PERSONALITIES[bank.personality];

  // Clear garnishments when zero defaulted/active debt
  for (const c of citizens) {
    if (!c.alive || !c.debtProfile) continue;
    c.debtProfile.repaymentStrategy = pickRepaymentStrategy(c);
    if (c.debtProfile.garnishmentPct > 0 && c.roleLevel !== 'Unemployed' && c.roleLevel !== 'Retired') {
      const activeDef = bank.loans.filter((l) => l.borrowerId === c.id && l.status === 'defaulted' && l.balance > 0);
      if (activeDef.length === 0) { c.debtProfile.garnishmentPct = 0; continue; }
      const garnish = Math.round(Math.min(activeDef[0].balance, (c.lastGrossPay * c.debtProfile.garnishmentPct) / 100) * 100) / 100;
      if (garnish > 0 && c.savings >= garnish) {
        spendFromHouseholdPool({ primary: c, spouse: null, amount: garnish, totalDay: clock.totalDays, dateLabel, category: 'Wage Garnishment', label: LOAN_LABELS[activeDef[0].type] });
        activeDef[0].balance = Math.round((activeDef[0].balance - garnish) * 100) / 100;
        if (activeDef[0].balance <= 1) { activeDef[0].balance = 0; activeDef[0].status = 'paid'; }
        if (vijCapital) {
          vijCapital.cash = Math.round((vijCapital.cash + garnish) * 100) / 100;
          vijCapital.monthlyRevenue = Math.round((vijCapital.monthlyRevenue + garnish) * 100) / 100;
          bank.totalRepaid = Math.round((bank.totalRepaid + garnish) * 100) / 100;
          appendCompanyLedger(vijCapital, clock, dateLabel, { kind: 'inflow', category: 'loan_repayment', label: `Garnished Instalment (${c.name})`, detail: LOAN_LABELS[activeDef[0].type], amount: garnish, balanceAfter: vijCapital.cash });
        }
      }
    }
  }

  for (const loan of bank.loans) {
    if (loan.status !== 'active' && loan.status !== 'restructured') continue;
    const borrower = byId.get(loan.borrowerId);
    if (!borrower || !borrower.alive) continue;

    const prof = ensureCitizenDebtProfile(borrower);
    const spouse = getMarriedSpouse(borrower, byId);
    const interest = Math.round(loan.balance * loan.monthlyInterestRate * 100) / 100;
    const due = Math.round(Math.min(loan.balance + interest, loan.monthlyInstallment) * 100) / 100;
    const extraPay = prof.repaymentStrategy === 'full' && borrower.savings > due * 2.5 ? Math.min(loan.balance - due, Math.round(due * 0.25)) : 0;
    const attemptAmt = Math.round((due + Math.max(0, extraPay)) * 100) / 100;

    const paid = prof.repaymentStrategy !== 'skip' && spendFromHouseholdPool({
      primary: borrower, spouse, amount: attemptAmt, totalDay: clock.totalDays, dateLabel,
      category: 'Loan Instalment', label: `${LOAN_LABELS[loan.type]}${loan.inheritedFromName ? ` (Inherited ${loan.inheritedFromName})` : ''}`,
    });

    if (paid) {
      const principalPaid = Math.max(0, attemptAmt - interest);
      loan.balance = Math.max(0, Math.round((loan.balance + interest - attemptAmt) * 100) / 100);
      loan.monthsRemaining = Math.max(0, loan.monthsRemaining - 1);
      loan.missedCount = 0;
      loan.nextDueDay = clock.totalDays + 30;
      loan.paymentHistory = [...loan.paymentHistory.slice(-23), { day: clock.totalDays, dateLabel, amountDue: due, amountPaid: attemptAmt, lateFee: 0, status: 'on_time' }];
      if (loan.balance <= 1 || loan.monthsRemaining === 0 && loan.balance < 5) { loan.balance = 0; loan.status = 'paid'; }
      if (vijCapital) {
        vijCapital.cash = Math.round((vijCapital.cash + attemptAmt) * 100) / 100;
        vijCapital.monthlyRevenue = Math.round((vijCapital.monthlyRevenue + interest) * 100) / 100;
        bank.totalRepaid = Math.round((bank.totalRepaid + principalPaid) * 100) / 100;
        bank.totalInterestEarned = Math.round((bank.totalInterestEarned + interest) * 100) / 100;
        appendCompanyLedger(vijCapital, clock, dateLabel, { kind: 'inflow', category: 'loan_repayment', label: `Loan Payment (${borrower.name})`, detail: `${LOAN_LABELS[loan.type]} · Int ${formatDelta(interest)}`, amount: attemptAmt, balanceAfter: vijCapital.cash });
      }
      prof.shame = Math.round(clamp(prof.shame - 4, 0, 100));
    } else {
      const lateFee = Math.round((bank.personality === 'predator' ? Math.max(25, due * 0.16) : Math.max(12, due * 0.08)) * 100) / 100;
      loan.balance = Math.round((loan.balance + interest + lateFee) * 100) / 100;
      loan.missedCount += 1;
      loan.lateCount += 1;
      loan.paymentHistory = [...loan.paymentHistory.slice(-23), { day: clock.totalDays, dateLabel, amountDue: due, amountPaid: 0, lateFee, status: loan.missedCount >= 2 ? 'missed' : 'late' }];
      prof.shame = Math.round(clamp(prof.shame + 10, 0, 100));
      borrower.stress = Math.round(clamp(borrower.stress + 8, 0, 100) * 10) / 10;
      if (spouse) spouse.stress = Math.round(clamp(spouse.stress + 5, 0, 100) * 10) / 10;
      prof.warnings = [`Missed ${LOAN_LABELS[loan.type]} payment (${formatDelta(lateFee)} fee)`, ...prof.warnings].slice(0, 6);
      appendLifeLog(borrower, clock.totalDays, dateLabel, 'money', `Missed ${LOAN_LABELS[loan.type]} instalment (+${formatDelta(lateFee)} late fee).`);
      addCitizenMemory(borrower, clock, dateLabel, 'debt_stress', `Missed payment on ${LOAN_LABELS[loan.type]}.`, -22);
      prof.decisionHistory = [{ id: `ddec_${clock.totalDays}_${borrower.id}_${simIdSuffix()}`, day: clock.totalDays, dateLabel, action: 'missed' as const, why: 'Insufficient household pool after bills', what: `Missed ${formatDelta(due)} due`, how: `Strategy ${prof.repaymentStrategy}; incurred ${formatDelta(lateFee)} fee.` }, ...prof.decisionHistory].slice(0, 24);

      if (loan.missedCount >= spec.defaultMissThreshold) {
        resolveLoanDefault({ loan, borrower, bank, vijCapital, housing, clock, dateLabel, events });
      }
    }
    syncCitizenDebtMetrics(borrower, bank.loans, citizens, bank);
  }
}
