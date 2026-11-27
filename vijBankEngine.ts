// vijBankEngine.ts — Daily debt warnings/coping and Month-End Vij Bank orchestration

import type { Company } from './companyTypes';
import type { SimClock } from './eventFactory';
import type { HousingState } from './housingTypes';
import { recordSimEvent } from './recordsStore';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';
import { evaluateCitizenBorrowing } from './vijBankBorrowing';
import { applyCitizenDebtCoping } from './vijBankConsequences';
import { syncCitizenDebtMetrics } from './vijBankCredit';
import { stepVijBankPersonalityDrift } from './vijBankPersonality';
import { collectMonthlyLoanInstalments } from './vijBankRepayment';
import { ensureCitizenDebtProfile } from './vijBankSetup';
import type { VijBankState } from './vijBankTypes';

export function stepVijBankDaily(params: {
  bank: VijBankState;
  vijCapital: Company | undefined;
  citizens: Citizen[];
  housing: HousingState;
  sharity?: SharityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { bank, vijCapital, citizens, housing, sharity, clock, dateLabel, events } = params;
  // Emergency mid-month coping and urgent food/water micro-borrowing
  for (const c of citizens) {
    if (!c.alive) continue;
    ensureCitizenDebtProfile(c);
    if ((c.hunger < 38 || c.thirst < 38) && c.savings < 25) {
      evaluateCitizenBorrowing({ citizen: c, bank, vijCapital, allCitizens: citizens, housing, sharity, clock, dateLabel, events });
    }
    if (clock.day % 6 === 0) applyCitizenDebtCoping(c, clock, dateLabel);
  }
}

export function processVijBankMonthEnd(params: {
  bank: VijBankState;
  companies: Company[];
  citizens: Citizen[];
  housing: HousingState;
  sharity?: SharityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { bank, companies, citizens, housing, sharity, clock, dateLabel, events } = params;
  const vijCapital = companies.find((c) => c.id === 'vijcapital');

  for (const c of citizens) {
    if (!c.alive) continue;
    ensureCitizenDebtProfile(c);
    syncCitizenDebtMetrics(c, bank.loans, citizens, bank);
  }

  stepVijBankPersonalityDrift({ bank, vijCapital, citizens, clock, dateLabel, events });
  collectMonthlyLoanInstalments({ bank, vijCapital, citizens, housing, clock, dateLabel, events });

  for (const c of citizens) {
    if (!c.alive) continue;
    evaluateCitizenBorrowing({ citizen: c, bank, vijCapital, allCitizens: citizens, housing, sharity, clock, dateLabel, events });
    applyCitizenDebtCoping(c, clock, dateLabel);
    syncCitizenDebtMetrics(c, bank.loans, citizens, bank);
  }

  bank.activeLoanCount = bank.loans.filter((l) => l.status === 'active' || l.status === 'restructured').length;
  bank.defaultedLoanCount = bank.loans.filter((l) => l.status === 'defaulted' || l.status === 'written_off').length;

  recordSimEvent({
    simDay: clock.totalDays, dateLabel, category: 'companies', subType: 'vijbank_month_end',
    subjectId: 'vijcapital', subjectKind: 'company', subjectName: 'Vij Capital (Vij Bank)',
    summary: `Vij Bank (${bank.personality}): ${bank.activeLoanCount} active loans, ${bank.defaultedLoanCount} defaulted/written off, Cash ∆${Math.round(vijCapital?.cash ?? 0)}`,
    detail: { personality: bank.personality, reserveRatio: bank.reserveRatio, activeLoans: bank.activeLoanCount, defaultedLoans: bank.defaultedLoanCount, totalLoaned: bank.totalLoaned, totalRepaid: bank.totalRepaid, totalDefaultsLoss: bank.totalDefaultsLoss, cash: vijCapital?.cash ?? 0 },
  });
}
