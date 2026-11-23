// jobMarket.ts — Month-end hiring, internal promotion cascades, and vacancy queue resolution

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { computeCitizenPerformance } from './companyRules';
import { rebuildCompanyBossTree } from './companySetup';
import type { Company, CompanyVacancy, JobMarketEvent } from './companyTypes';
import { calculateMarginalTax, calculateMonthlyPay, clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { collectApplicantsForVacancy, openVacancy } from './jobScoring';
import type { Citizen, CityEvent } from './types';

export function processJobMarketMonthEnd(params: {
  citizens: Citizen[];
  companies: Company[];
  vacancies: CompanyVacancy[];
  jobEvents: JobMarketEvent[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): { vacancies: CompanyVacancy[]; jobEvents: JobMarketEvent[] } {
  const { citizens, companies, jobEvents, clock, dateLabel, events } = params;
  const remaining: CompanyVacancy[] = [];
  const queue = [...params.vacancies];

  let safety = 0;
  while (queue.length > 0 && safety < 40) {
    safety += 1;
    const vac = queue.shift()!;
    const comp = companies.find((co) => co.id === vac.companyId);
    if (!comp || comp.bankrupt) continue;

    const applicants = collectApplicantsForVacancy(citizens, vac, comp, clock.totalDays);
    vac.applicants = applicants;
    if (applicants.length === 0) {
      remaining.push(vac);
      continue;
    }

    // Internal candidate priority
    const internalTop = applicants.find((a) => a.currentCompanyId === comp.id);
    const picked = internalTop ?? applicants[0];
    const hiree = citizens.find((c) => c.id === picked.citizenId && c.alive);
    if (!hiree) {
      remaining.push(vac);
      continue;
    }

    const prevRole = hiree.roleLevel;
    const prevCompId = hiree.employerId;
    const wasInternal = prevCompId === comp.id;

    if (prevCompId && prevRole !== 'Unemployed') {
      const oldComp = companies.find((co) => co.id === prevCompId);
      if (oldComp) {
        openVacancy(queue, oldComp, prevRole, wasInternal ? `${hiree.name} promoted` : `${hiree.name} departed`, clock, dateLabel);
      }
    }

    hiree.employerId = comp.id;
    hiree.roleLevel = vac.role;
    hiree.monthsSincePromotion = 0;
    hiree.unemployedDays = 0;
    if (!wasInternal) {
      hiree.tenureMonths = 0;
      hiree.bossRelationship = Math.round(clamp(15 + (hiree.traits.loyalty - 50) * 0.2, -20, 45));
    }
    hiree.lastGrossPay = calculateMonthlyPay(hiree, 1.0, comp.industryMultiplier);
    hiree.lastTax = calculateMarginalTax(hiree.lastGrossPay);
    hiree.performanceScore = computeCitizenPerformance(hiree, clock.totalDays);
    if (vac.role === 'CEO') comp.ceoId = hiree.id;

    const kind: JobMarketEvent['kind'] = wasInternal ? 'promoted' : 'hired';
    const detail = wasInternal
      ? `${hiree.name} promoted from ${prevRole} to ${vac.role} at ${comp.name}.`
      : `${hiree.name} hired as ${vac.role} at ${comp.name} (score ${picked.score}).`;

    hiree.workHistory = [{ id: `wh_${clock.totalDays}_${hiree.id}_${safety}`, dateLabel, companyId: comp.id, companyName: comp.name, role: vac.role, kind, note: detail }, ...hiree.workHistory].slice(0, 24);
    jobEvents.unshift({ id: `je_${clock.totalDays}_${hiree.id}_${safety}`, dateLabel, kind, citizenId: hiree.id, citizenName: hiree.name, companyId: comp.id, companyName: comp.name, role: vac.role, detail });
    events.push(makeCityEvent(clock, `${kind}_${hiree.id}_${safety}`, { type: kind, citizenId: hiree.id, citizenName: hiree.name, companyId: comp.id, title: wasInternal ? 'Citizen Promoted' : 'Citizen Hired', detail }));
    comp.reputation = Math.round(clamp(comp.reputation + (wasInternal ? 1.2 : 0.4), 0, 100) * 10) / 10;
    recordConsequentialDecision({
      citizen: hiree, clock, dateLabel, kind: 'job_choice', category: 'work',
      title: wasInternal ? `Accept Promotion (${vac.role})` : `Accept Offer (${vac.role} @ ${comp.name})`,
      chosenOption: `Accept ${vac.role} @ ${comp.name}`, altOption: 'Decline & Wait',
      chosenReason: `Role fit score ${picked.score} and pay multiplier ${comp.industryMultiplier.toFixed(2)}x.`,
      chosenFactors: [{ label: 'Candidate Fit', value: Math.round(picked.score) }, { label: 'Ambition', value: Math.round(hiree.traits.ambition * 0.3) }],
      altFactors: [{ label: 'Stay Current', value: Math.round(hiree.traits.patience * 0.25) }],
      diarySentence: wasInternal ? `Accepted promotion to ${vac.role} at ${comp.name}.` : `Took a new role as ${vac.role} at ${comp.name}.`,
    });
  }

  for (const comp of companies) rebuildCompanyBossTree(comp.id, citizens);
  for (const v of remaining) {
    const comp = companies.find((co) => co.id === v.companyId);
    if (comp) v.applicants = collectApplicantsForVacancy(citizens, v, comp, clock.totalDays);
  }
  return { vacancies: remaining.slice(0, 40), jobEvents: jobEvents.slice(0, 120) };
}
