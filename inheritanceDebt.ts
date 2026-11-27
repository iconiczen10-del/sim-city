// inheritanceDebt.ts — Settles deceased debt from estate first, passes remaining debt to spouse (Accept/Negotiate/Refuse), or writes off at Vij Bank

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { appendCompanyLedger } from './companyLedger';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent, CityState } from './types';
import { BANK_PERSONALITIES, LOAN_LABELS } from './vijBankCatalog';
import { syncCitizenDebtMetrics } from './vijBankCredit';
import { ensureCitizenDebtProfile } from './vijBankSetup';

export function settleDeceasedEstateAndDebt(params: {
  deceased: Citizen;
  initialEstate: number;
  spouse: Citizen | undefined;
  livingChildren: Citizen[];
  city: CityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): { remainingEstate: number } {
  const { deceased, initialEstate, spouse, livingChildren, city, clock, dateLabel, events } = params;
  const bank = city.bank;
  const vijCapital = city.companies.find((c) => c.id === 'vijcapital');
  if (!bank) return { remainingEstate: initialEstate };

  const activeLoans = bank.loans.filter(
    (l) => l.borrowerId === deceased.id && (l.status === 'active' || l.status === 'restructured' || l.status === 'defaulted') && l.balance > 0
  );
  if (activeLoans.length === 0) return { remainingEstate: initialEstate };

  let estatePool = Math.max(0, initialEstate);
  const totalDebt = Math.round(activeLoans.reduce((s, l) => s + l.balance, 0) * 100) / 100;

  // Liquidate electronics first if cash estate cannot cover debt
  if (estatePool < totalDebt && deceased.inventory.electronics?.length) {
    let resale = 0;
    for (const item of deceased.inventory.electronics) resale += Math.round(item.purchasePrice * 0.42);
    deceased.inventory.electronics = [];
    estatePool = Math.round((estatePool + resale) * 100) / 100;
  }

  let repaidTotal = 0;
  let remainingDebtTotal = 0;
  for (const loan of activeLoans) {
    const pay = Math.min(estatePool, loan.balance);
    if (pay > 0) {
      estatePool = Math.round((estatePool - pay) * 100) / 100;
      loan.balance = Math.round((loan.balance - pay) * 100) / 100;
      repaidTotal += pay;
      if (vijCapital) {
        vijCapital.cash = Math.round((vijCapital.cash + pay) * 100) / 100;
        bank.totalRepaid = Math.round((bank.totalRepaid + pay) * 100) / 100;
        appendCompanyLedger(vijCapital, clock, dateLabel, { kind: 'inflow', category: 'loan_repayment', label: `Estate Settlement (${deceased.name})`, detail: LOAN_LABELS[loan.type], amount: pay, balanceAfter: vijCapital.cash });
      }
    }
    if (loan.balance <= 1) {
      loan.balance = 0;
      loan.status = 'paid';
    } else {
      remainingDebtTotal += loan.balance;
    }
  }

  const unpaidLoans = activeLoans.filter((l) => l.balance > 1);
  if (unpaidLoans.length > 0) {
    if (spouse && spouse.alive) {
      const spProf = ensureCitizenDebtProfile(spouse);
      const spec = BANK_PERSONALITIES[bank.personality];
      const dutyScore = spouse.traits.honesty * 0.4 + spouse.traits.loyalty * 0.35 + (spouse.savings > remainingDebtTotal ? 25 : -15);
      const choice: 'accepted' | 'negotiated' | 'refused' = dutyScore >= 65 ? 'accepted' : dutyScore >= 38 ? 'negotiated' : 'refused';

      for (const loan of unpaidLoans) {
        loan.originalBorrowerId = deceased.id;
        loan.borrowerId = spouse.id;
        loan.borrowerName = spouse.name;
        loan.inheritedFromId = deceased.id;
        loan.inheritedFromName = deceased.name;
        loan.heirAction = choice;

        if (choice === 'negotiated') {
          const cutPct = bank.personality === 'community_banker' ? 0.4 : bank.personality === 'prudent_guardian' ? 0.25 : bank.personality === 'predator' ? 0 : 0.12;
          const cut = Math.round(loan.balance * cutPct * 100) / 100;
          loan.balance = Math.max(0, Math.round((loan.balance - cut) * 100) / 100);
          loan.monthsRemaining = Math.min(24, loan.monthsRemaining + 4);
          loan.monthlyInstallment = Math.round((loan.balance / Math.max(1, loan.monthsRemaining)) * 100) / 100;
          loan.status = 'restructured';
          if (cut > 0) bank.totalDefaultsLoss = Math.round((bank.totalDefaultsLoss + cut) * 100) / 100;
        } else if (choice === 'refused') {
          spouse.respect = Math.round(clamp(spouse.respect - 9, 0, 100) * 10) / 10;
          spouse.socialReputation = Math.round(clamp(spouse.socialReputation - 8, 0, 100));
          if (spec.harshness >= 70) {
            loan.status = 'defaulted';
            spProf.garnishmentPct = Math.max(spProf.garnishmentPct, bank.personality === 'predator' ? 25 : 15);
            spProf.warnings = [`Bank pursuing refused inherited debt from ${deceased.name}`, ...spProf.warnings].slice(0, 6);
          } else if (spec.harshness <= 30) {
            const forgiven = Math.round(loan.balance * 0.5 * 100) / 100;
            loan.balance = Math.round((loan.balance - forgiven) * 100) / 100;
            bank.totalDefaultsLoss = Math.round((bank.totalDefaultsLoss + forgiven) * 100) / 100;
            if (vijCapital) vijCapital.monthlyOtherCost = Math.round((vijCapital.monthlyOtherCost + forgiven) * 100) / 100;
          }
        }
      }

      spouse.inheritedDebtNote = `${choice === 'accepted' ? 'Accepted' : choice === 'negotiated' ? 'Negotiated' : 'Refused'} ${formatDelta(remainingDebtTotal)} debt from ${deceased.name}`;
      spouse.stress = Math.round(clamp(spouse.stress + 12, 0, 100) * 10) / 10;
      addCitizenMemory(spouse, clock, dateLabel, 'inherited_debt', `${spouse.inheritedDebtNote}.`, -30);
      appendLifeLog(spouse, clock.totalDays, dateLabel, 'money', `${spouse.inheritedDebtNote}.`);
      recordConsequentialDecision({
        citizen: spouse, clock, dateLabel, kind: 'inherited_debt_choice', category: 'family',
        title: `Inherited Debt From ${deceased.name}`, chosenOption: choice === 'accepted' ? 'Accept Debt' : choice === 'negotiated' ? 'Negotiate Terms' : 'Refuse Debt',
        altOption: 'Walk Away', chosenReason: `Estate fell short by ${formatDelta(remainingDebtTotal)}; bank is ${spec.label}.`,
        chosenFactors: [{ label: 'Loyalty & Honesty', value: Math.round(dutyScore * 0.4) }], altFactors: [{ label: 'Debt Burden', value: 24 }],
        diarySentence: `${spouse.inheritedDebtNote}.`,
      });
      events.push(makeCityEvent(clock, `inhd_${deceased.id}`, { type: 'inheritance', citizenId: spouse.id, citizenName: spouse.name, companyId: 'vijcapital', title: 'Inherited Debt Settled', detail: `${spouse.name} ${choice} ${formatDelta(remainingDebtTotal)} remaining debt from ${deceased.name}'s estate.` }));
      syncCitizenDebtMetrics(spouse, bank.loans, city.citizens, bank);
    } else {
      // No surviving spouse — Vij Bank absorbs write-off
      let writeOff = 0;
      for (const loan of unpaidLoans) {
        writeOff += loan.balance;
        loan.status = 'written_off';
        bank.totalDefaultsLoss = Math.round((bank.totalDefaultsLoss + loan.balance) * 100) / 100;
        if (vijCapital) {
          vijCapital.monthlyOtherCost = Math.round((vijCapital.monthlyOtherCost + loan.balance) * 100) / 100;
          appendCompanyLedger(vijCapital, clock, dateLabel, { kind: 'outflow', category: 'loan_writeoff', label: `Deceased Write-Off (${deceased.name})`, detail: 'No spouse after estate exhaustion', amount: loan.balance, balanceAfter: vijCapital.cash });
        }
      }
      events.push(makeCityEvent(clock, `inhwo_${deceased.id}`, { type: 'inheritance', companyId: 'vijcapital', citizenId: deceased.id, citizenName: deceased.name, title: 'Estate Debt Written Off', detail: `Vij Bank absorbed ${formatDelta(writeOff)} loss after ${deceased.name} passed with no spouse.` }));
    }

    for (const ch of livingChildren) {
      ch.traits.thriftiness = Math.round(clamp(ch.traits.thriftiness + 6, 5, 95));
      if (ch.debtProfile) ch.debtProfile.trustInBank = Math.round(clamp(ch.debtProfile.trustInBank - 6, 5, 100));
      appendLedgerEntry(ch, clock.totalDays, dateLabel, 'expense', 'Estate Notice', `${deceased.name}'s estate went to settle debt`, 0);
    }
  }

  recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'companies', subType: 'estate_debt_settlement', subjectId: deceased.id, subjectKind: 'citizen', subjectName: deceased.name, summary: `${deceased.name} estate settled ${formatDelta(repaidTotal)} debt (${formatDelta(remainingDebtTotal)} unpaid)`, detail: { totalDebt, repaidTotal, remainingDebtTotal, hadSpouse: Boolean(spouse?.alive) } });
  return { remainingEstate: estatePool };
}
