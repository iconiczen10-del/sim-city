// vijBankConsequences.ts — Default handling (repossess, garnish, restructure, forgive) & NPC debt coping actions

import { addCitizenMemory } from './citizenMemory';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { appendCompanyLedger } from './companyLedger';
import type { Company } from './companyTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { HousingState } from './housingTypes';
import { syncCitizenHousingLinks } from './housingScores';
import { recordSimEvent } from './recordsStore';
import { simIdSuffix, simRand } from './rng';
import type { Citizen, CityEvent } from './types';
import { BANK_PERSONALITIES, LOAN_LABELS } from './vijBankCatalog';
import { ensureCitizenDebtProfile } from './vijBankSetup';
import type { BankLoan, VijBankState } from './vijBankTypes';

export function resolveLoanDefault(params: {
  loan: BankLoan;
  borrower: Citizen;
  bank: VijBankState;
  vijCapital: Company | undefined;
  housing: HousingState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { loan, borrower, bank, vijCapital, housing, clock, dateLabel, events } = params;
  const spec = BANK_PERSONALITIES[bank.personality];
  const prof = ensureCitizenDebtProfile(borrower);

  // Restructure before seizure if personality is merciful
  if (loan.status === 'active' && simRand() < spec.restructureChance) {
    loan.status = 'restructured';
    loan.missedCount = 1;
    loan.monthsRemaining = Math.min(24, loan.monthsRemaining + 4);
    loan.monthlyInstallment = Math.round((loan.balance / Math.max(1, loan.monthsRemaining)) * 100) / 100;
    if (spec.forgivePct > 0 && vijCapital) {
      const forgiven = Math.round(loan.balance * spec.forgivePct * 100) / 100;
      loan.balance = Math.max(0, Math.round((loan.balance - forgiven) * 100) / 100);
      bank.totalDefaultsLoss = Math.round((bank.totalDefaultsLoss + forgiven) * 100) / 100;
      vijCapital.monthlyOtherCost = Math.round((vijCapital.monthlyOtherCost + forgiven) * 100) / 100;
      appendCompanyLedger(vijCapital, clock, dateLabel, { kind: 'outflow', category: 'loan_writeoff', label: `Forgiven Debt (${borrower.name})`, detail: `${spec.label} partial debt relief`, amount: forgiven, balanceAfter: vijCapital.cash });
    }
    appendLifeLog(borrower, clock.totalDays, dateLabel, 'money', `Vij Bank (${spec.label}) restructured ${LOAN_LABELS[loan.type]} to ${formatDelta(loan.monthlyInstallment)}/mo.`);
    prof.decisionHistory = [{ id: `ddec_${clock.totalDays}_${borrower.id}_${simIdSuffix()}`, day: clock.totalDays, dateLabel, action: 'restructured' as const, why: 'Missed payments triggered hardship review', what: `${LOAN_LABELS[loan.type]} extended to ${loan.monthsRemaining}m`, how: `${spec.label} lowered monthly instalment.` }, ...prof.decisionHistory].slice(0, 24);
    return;
  }

  loan.status = 'defaulted';
  let recovered = 0;

  // Collateral repossession
  if (loan.collateralKind === 'appliance' && loan.collateralId && borrower.inventory.electronics) {
    const idx = borrower.inventory.electronics.findIndex((e) => e.id === loan.collateralId);
    if (idx >= 0) {
      const seized = borrower.inventory.electronics.splice(idx, 1)[0];
      const resale = Math.round(seized.purchasePrice * 0.45);
      recovered += resale;
      loan.balance = Math.max(0, Math.round((loan.balance - resale) * 100) / 100);
      bank.repossessionsCount += 1;
      appendLifeLog(borrower, clock.totalDays, dateLabel, 'loss', `Vij Bank repossessed ${seized.name} for unpaid ${LOAN_LABELS[loan.type]}.`);
    }
  } else if (loan.collateralKind === 'house' && loan.collateralId) {
    const house = housing.houses.find((h) => h.id === loan.collateralId && h.ownerId === borrower.id);
    if (house) {
      const value = Math.round(house.rentPrice * 8);
      recovered += value;
      house.ownerId = 'gov';
      house.forSale = true;
      house.buyPrice = house.buyPrice ?? value;
      loan.balance = Math.max(0, Math.round((loan.balance - value) * 100) / 100);
      bank.repossessionsCount += 1;
      syncCitizenHousingLinks([borrower], housing.houses);
      appendLifeLog(borrower, clock.totalDays, dateLabel, 'loss', `Vij Bank repossessed ${house.name} due to housing loan default.`);
    }
  }

  if (recovered > 0 && vijCapital) {
    vijCapital.cash = Math.round((vijCapital.cash + recovered) * 100) / 100;
    bank.totalRepaid = Math.round((bank.totalRepaid + recovered) * 100) / 100;
    appendCompanyLedger(vijCapital, clock, dateLabel, { kind: 'inflow', category: 'loan_repayment', label: `Collateral Recovery (${borrower.name})`, detail: LOAN_LABELS[loan.type], amount: recovered, balanceAfter: vijCapital.cash });
  }

  if (loan.balance <= 5) {
    loan.balance = 0;
    loan.status = 'paid';
    return;
  }

  // Wage garnishment on predator / growth_hunter / bureaucrat
  if (spec.harshness >= 50 && borrower.roleLevel !== 'Unemployed' && borrower.roleLevel !== 'Retired') {
    const gPct = spec.harshness >= 90 ? 25 : spec.harshness >= 70 ? 18 : 12;
    prof.garnishmentPct = Math.max(prof.garnishmentPct, gPct);
    bank.garnishmentsCount += 1;
    prof.warnings = [`Wage garnishment active (${gPct}%) for defaulted ${LOAN_LABELS[loan.type]}`, ...prof.warnings].slice(0, 6);
  } else {
    // Write-off loss hits Vij Capital profit and reserves
    const loss = Math.round(loan.balance * 100) / 100;
    loan.status = 'written_off';
    bank.totalDefaultsLoss = Math.round((bank.totalDefaultsLoss + loss) * 100) / 100;
    if (vijCapital) {
      vijCapital.monthlyOtherCost = Math.round((vijCapital.monthlyOtherCost + loss) * 100) / 100;
      appendCompanyLedger(vijCapital, clock, dateLabel, { kind: 'outflow', category: 'loan_writeoff', label: `Default Write-Off (${borrower.name})`, detail: LOAN_LABELS[loan.type], amount: loss, balanceAfter: vijCapital.cash });
    }
  }

  prof.shame = Math.round(clamp(prof.shame + 28, 0, 100));
  prof.trustInBank = Math.round(clamp(prof.trustInBank - (spec.harshness >= 75 ? 18 : 8), 0, 100));
  borrower.stress = Math.round(clamp(borrower.stress + 16, 0, 100) * 10) / 10;
  borrower.mood = Math.round(clamp(borrower.mood - 12, 0, 100) * 10) / 10;
  addCitizenMemory(borrower, clock, dateLabel, 'loan_default', `Defaulted on ${LOAN_LABELS[loan.type]} (${formatDelta(loan.balance)} owed).`, -40);
  events.push(makeCityEvent(clock, `def_${loan.id}`, { type: 'debt-default', citizenId: borrower.id, citizenName: borrower.name, companyId: 'vijcapital', title: 'Loan Default', detail: `${borrower.name} defaulted on ${LOAN_LABELS[loan.type]} (${formatDelta(loan.balance)} remaining).` }));
  recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'companies', subType: 'loan_default', subjectId: borrower.id, subjectKind: 'citizen', subjectName: borrower.name, summary: `${borrower.name} defaulted on ${LOAN_LABELS[loan.type]} (${formatDelta(loan.balance)})`, detail: { loanId: loan.id, status: loan.status, recovered, garnishmentPct: prof.garnishmentPct } });
}

export function applyCitizenDebtCoping(c: Citizen, clock: SimClock, dateLabel: string): void {
  const prof = c.debtProfile;
  if (!prof || prof.totalDebt <= 0) { if (prof) prof.copingNote = ''; return; }
  if (prof.dtiRatio < 0.35 && prof.shame < 35) return;

  if (c.standards.food > 1 || c.standards.clothes > 1) {
    c.standards.food = 1;
    c.standards.clothes = 1;
    prof.copingNote = 'Cut food & clothes to L1 to service debt.';
  } else if (c.inventory.electronics && c.inventory.electronics.length > 2 && c.savings < 90 && simRand() < 0.25) {
    const idx = c.inventory.electronics.findIndex((e) => !e.broken && e.applianceId !== 'phone' && e.applianceId !== 'lamp');
    if (idx >= 0) {
      const sold = c.inventory.electronics.splice(idx, 1)[0];
      const cash = Math.round(sold.purchasePrice * 0.42);
      c.savings = Math.round((c.savings + cash) * 100) / 100;
      appendLedgerEntry(c, clock.totalDays, dateLabel, 'income', 'Asset Sale', `Sold ${sold.name} to cover debt`, cash);
      prof.copingNote = `Sold ${sold.name} for ${formatDelta(cash)} to manage payments.`;
    }
  } else if (c.roleLevel !== 'Unemployed' && c.roleLevel !== 'Retired' && c.traits.discipline >= 50 && simRand() < 0.2) {
    const extra = Math.round(clamp(c.lastGrossPay * 0.08, 35, 220));
    c.savings = Math.round((c.savings + extra) * 100) / 100;
    c.stress = Math.round(clamp(c.stress + 4, 0, 100) * 10) / 10;
    appendLedgerEntry(c, clock.totalDays, dateLabel, 'income', 'Overtime Shift', 'Extra shift for debt relief', extra);
    prof.copingNote = `Picked up extra shift (+${formatDelta(extra)}) to pay down debt.`;
  }
}
