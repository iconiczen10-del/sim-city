// familyHousingLoan.ts — Vij Bank housing_loan helper for family home upgrades on child birth

import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { appendCompanyLedger } from './companyLedger';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { computeLandlordRent } from './housingScores';
import type { House } from './housingTypes';
import { recordSimEvent } from './recordsStore';
import { simIdSuffix } from './rng';
import type { Citizen, CityEvent, CityState } from './types';
import { BANK_PERSONALITIES, LOAN_LABELS } from './vijBankCatalogHelper';
import { computeLoanOffer, syncCitizenDebtMetrics } from './vijBankCredit';
import { ensureCitizenDebtProfile } from './vijBankSetup';
import type { BankLoan } from './vijBankTypes';

export function tryBuyBiggerHouseWithLoan(params: {
  buyer: Citizen;
  house: House;
  moveCost: number;
  city: CityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): boolean {
  const { buyer, house, moveCost, city, clock, dateLabel, events } = params;
  const bank = city.bank;
  const vijCapital = city.companies.find((c) => c.id === 'vijcapital');
  if (!bank || !vijCapital || vijCapital.bankrupt || !house.forSale || house.buyPrice === null || house.ownerId !== 'gov') {
    return false;
  }

  const downPayment = Math.round(house.buyPrice * 0.15);
  const requested = Math.max(40, house.buyPrice - downPayment);
  if (buyer.savings < downPayment + moveCost) return false;

  const offer = computeLoanOffer({
    citizen: buyer,
    loanType: 'housing_loan',
    requestedAmount: requested,
    termMonths: 48,
    bank,
    vijCapital,
    allCitizens: city.citizens,
    housing: city.housing,
    hasCollateral: true,
  });
  if (!offer.approved || offer.principal < requested) return false;

  const prof = ensureCitizenDebtProfile(buyer);
  const loan: BankLoan = {
    id: `loan_${clock.totalDays}_${buyer.id}_${simIdSuffix()}`,
    borrowerId: buyer.id,
    borrowerName: buyer.name,
    type: 'housing_loan',
    principal: offer.principal,
    annualRate: offer.annualRate,
    monthlyInterestRate: offer.monthlyRate,
    originationFee: offer.originationFee,
    balance: Math.round((offer.principal + offer.originationFee) * 100) / 100,
    termMonths: offer.termMonths,
    monthsRemaining: offer.termMonths,
    monthlyInstallment: offer.monthlyInstallment,
    missedCount: 0,
    lateCount: 0,
    status: 'active',
    collateralKind: 'house',
    collateralId: house.id,
    collateralLabel: house.name,
    originatedDay: clock.totalDays,
    originatedDate: dateLabel,
    nextDueDay: clock.totalDays + 30,
    reasonWhy: `Upgraded family home (${house.name}) upon child birth`,
    termsWhat: `${LOAN_LABELS.housing_loan} ${formatDelta(offer.principal)} @ ${Math.round(offer.annualRate * 100)}% APR for ${offer.termMonths}m (${formatDelta(offer.monthlyInstallment)}/mo)`,
    decisionHow: `Financed family move via Vij Bank (${BANK_PERSONALITIES[bank.personality].label}) with ${formatDelta(downPayment)} down.`,
    paymentHistory: [],
  };

  buyer.savings = Math.round((buyer.savings - downPayment) * 100) / 100;
  vijCapital.cash = Math.round((vijCapital.cash - offer.principal) * 100) / 100;
  city.treasury = Math.round((city.treasury + house.buyPrice) * 100) / 100;
  bank.totalLoaned = Math.round((bank.totalLoaned + offer.principal) * 100) / 100;
  bank.loans.unshift(loan);

  house.ownerId = buyer.id;
  house.originalBuyPrice = house.buyPrice;
  house.forSale = false;
  house.leaseStartDay = clock.totalDays;
  house.rentPrice = computeLandlordRent(house.baseRent, buyer);

  appendCompanyLedger(vijCapital, clock, dateLabel, {
    kind: 'outflow', category: 'loan_disbursement', label: `Housing Loan (${buyer.name})`,
    detail: `${house.name} · ${offer.termMonths}m @ ${Math.round(offer.annualRate * 100)}% APR`, amount: offer.principal, balanceAfter: vijCapital.cash,
  });
  appendLedgerEntry(buyer, clock.totalDays, dateLabel, 'expense', 'Housing Down Payment', `Bought ${house.name} with loan`, downPayment);
  appendLifeLog(buyer, clock.totalDays, dateLabel, 'money', `Financed ${house.name} (${formatDelta(house.buyPrice)}) via Vij Bank housing loan.`);
  prof.decisionHistory = [{ id: `ddec_${clock.totalDays}_${buyer.id}_${simIdSuffix()}`, day: clock.totalDays, dateLabel, action: 'borrowed' as const, why: loan.reasonWhy, what: loan.termsWhat, how: loan.decisionHow }, ...prof.decisionHistory].slice(0, 24);
  events.push(makeCityEvent(clock, `hloan_${loan.id}`, { type: 'bought-house', citizenId: buyer.id, citizenName: buyer.name, title: 'Family Housing Loan Issued', detail: `${buyer.name} bought ${house.name} via Vij Bank housing loan.` }));
  recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'companies', subType: 'bank_loan_issued', subjectId: buyer.id, subjectKind: 'citizen', subjectName: buyer.name, summary: `${buyer.name} took housing loan (${formatDelta(offer.principal)}) for ${house.name}`, detail: { loanId: loan.id, houseId: house.id, principal: offer.principal, downPayment } });
  syncCitizenDebtMetrics(buyer, bank.loans, city.citizens, bank);
  return true;
}
