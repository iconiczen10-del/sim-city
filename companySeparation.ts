// companySeparation.ts — Employee firing, quitting, and layoff state cleanup and records

import { addCitizenMemory } from './citizenMemory';
import type { Company, CompanyVacancy, JobMarketEvent } from './companyTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { openVacancy } from './jobScoring';
import type { Citizen, CityEvent } from './types';

export interface ReleaseEmployeeParams {
  emp: Citizen;
  comp: Company;
  kind: 'fired' | 'quit' | 'layoff';
  reason: string;
  vacancies: CompanyVacancy[];
  jobEvents: JobMarketEvent[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}

export function releaseEmployee(params: ReleaseEmployeeParams): void {
  const { emp, comp, kind, reason, vacancies, jobEvents, clock, dateLabel, events } = params;
  const oldRole = emp.roleLevel;
  const oldTitle = emp.gjJobTitle;
  const oldBankTitle = emp.bankJobTitle;
  if (oldRole !== 'Unemployed' && oldRole !== 'Retired' && kind !== 'layoff') {
    openVacancy(
      vacancies,
      comp,
      oldRole,
      `${emp.name} (${kind})`,
      clock,
      dateLabel,
      comp.id === 'gjelectricity' ? oldTitle : undefined,
      comp.id === 'vijcapital' ? oldBankTitle : undefined,
    );
  }
  emp.employerId = null;
  emp.bossId = null;
  emp.gjJobTitle = undefined;
  emp.bankJobTitle = undefined;
  emp.roleLevel = 'Unemployed';
  emp.lastGrossPay = 0;
  emp.lastTax = 0;
  emp.performanceScore = 0;
  emp.tenureMonths = 0;
  emp.monthsSincePromotion = 0;

  if (kind !== 'quit') {
    addCitizenMemory(emp, clock, dateLabel, 'loss', `${kind === 'fired' ? 'Fired' : 'Laid off'} from ${comp.name} (${oldRole}).`, -35);
    comp.reputation = Math.round(clamp(comp.reputation - (kind === 'layoff' ? 4 : 1.5), 0, 100) * 10) / 10;
  }

  emp.workHistory = [
    { id: `wh_${kind}_${clock.totalDays}_${emp.id}_${emp.workHistory.length}`, dateLabel, companyId: comp.id, companyName: comp.name, role: oldRole, kind, note: reason },
    ...emp.workHistory,
  ].slice(0, 24);
  jobEvents.unshift({
    id: `je_${kind}_${clock.totalDays}_${emp.id}_${jobEvents.length}`,
    dateLabel,
    kind,
    citizenId: emp.id,
    citizenName: emp.name,
    companyId: comp.id,
    companyName: comp.name,
    role: oldRole,
    detail: reason,
  });
  events.push(makeCityEvent(clock, `${kind}_${emp.id}_${jobEvents.length}`, {
    type: kind,
    citizenId: emp.id,
    citizenName: emp.name,
    companyId: comp.id,
    title: kind === 'fired' ? 'Citizen Fired' : kind === 'layoff' ? 'Company Layoff' : 'Citizen Quit Job',
    detail: reason,
  }));
}
