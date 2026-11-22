// monthlyCycle.ts — End-of-month company payroll, taxes, job market, citizen settlement, and treasury

import type { CompanyBoardState } from './boardTypes';
import { runCompanyMonthlyAI } from './companyAI';
import { runCompanyMonthEndFinances } from './companyPayroll';
import type { Company, CompanyVacancy, JobMarketEvent } from './companyTypes';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta, formatMonthYear, formatSimDate } from './formatters';
import { processJobMarketMonthEnd } from './jobMarket';
import { getMartFloorManager } from './martManager';
import type { MartState } from './martTypes';
import { processLivingCitizenMonthEnd } from './monthlyCitizenStep';
import type { Citizen, CityEvent, TierMovement } from './types';

export function runCityMonthEnd(params: {
  citizens: Citizen[];
  companies: Company[];
  vacancies: CompanyVacancy[];
  jobEvents: JobMarketEvent[];
  treasury: number;
  mart: MartState;
  clock: SimClock;
  events: CityEvent[];
  boardState: CompanyBoardState;
}): {
  citizens: Citizen[];
  vacancies: CompanyVacancy[];
  jobEvents: JobMarketEvent[];
  treasury: number;
  taxCollected: number;
  totalPayroll: number;
  businessTaxCollected: number;
  movements: TierMovement[];
} {
  const { citizens, companies, treasury, mart, clock, events, boardState } = params;
  const dateLabel = formatSimDate(clock.day, clock.month, clock.year);
  let vacancies = [...params.vacancies];
  let jobEvents = [...params.jobEvents];

  const payrollRes = runCompanyMonthEndFinances({ companies, citizens, mart, jobEvents, clock, dateLabel, events, boardState });
  let taxCollected = 0;
  const movements: TierMovement[] = [];

  const nextCitizens = citizens.map((c) => {
    if (!c.alive) return c;
    const res = processLivingCitizenMonthEnd(c, payrollRes.citizenPayMap.get(c.id), clock, events, movements);
    taxCollected += res.taxPaid;
    return res.updated;
  });

  mart.monthlyRevenue = 0;
  mart.monthlyWholesaleSpend = 0;

  const hadMartLead = Boolean(getMartFloorManager(nextCitizens));
  runCompanyMonthlyAI({ companies, citizens: nextCitizens, vacancies, jobEvents, mart, clock, dateLabel, events });
  const jmRes = processJobMarketMonthEnd({ citizens: nextCitizens, companies, vacancies, jobEvents, clock, dateLabel, events });
  if (!hadMartLead && getMartFloorManager(nextCitizens)) {
    mart.managerPerformance = 65;
    mart.managerLowPerfMonths = 0;
    mart.panicFreezeDaysLeft = 0;
  }
  vacancies = jmRes.vacancies;
  jobEvents = jmRes.jobEvents;

  const nextTreasury = treasury + taxCollected + payrollRes.businessTaxCollected;
  const alive = nextCitizens.filter((c) => c.alive);
  const totalSavings = alive.reduce((acc, c) => acc + c.savings, 0);

  events.push(makeCityEvent(clock, 'month_summary', {
    type: 'system', title: `Month-End Summary (${formatMonthYear(clock.month, clock.year)})`,
    detail: `Income Tax +${formatDelta(taxCollected)} · Biz Tax +${formatDelta(payrollRes.businessTaxCollected)} · Payroll ${formatDelta(payrollRes.totalPayroll)} · Treasury ${formatDelta(nextTreasury)} · Savings ${formatDelta(totalSavings)}.`,
  }));

  return {
    citizens: nextCitizens,
    vacancies,
    jobEvents,
    treasury: nextTreasury,
    taxCollected,
    totalPayroll: payrollRes.totalPayroll,
    businessTaxCollected: payrollRes.businessTaxCollected,
    movements,
  };
}
