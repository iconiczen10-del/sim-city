// companyAI.ts — Monthly boss relationships, performance, quits, firings, layoffs, and CEO AI

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { addCitizenMemory } from './citizenMemory';
import { computeCitizenPerformance, ROLE_RANK, syncMartPersonalityFromCeo } from './companyRules';
import { rebuildCompanyBossTree } from './companySetup';
import type { Company, CompanyVacancy, JobMarketEvent } from './companyTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { openVacancy } from './jobScoring';
import { evaluateMartManagerMonthly, getMartFloorManager } from './martManager';
import type { MartState } from './martTypes';
import { simRand } from './rng';
import type { Citizen, CityEvent, RoleLevel } from './types';

function releaseEmployee(params: {
  emp: Citizen;
  comp: Company;
  kind: 'fired' | 'quit' | 'layoff';
  reason: string;
  vacancies: CompanyVacancy[];
  jobEvents: JobMarketEvent[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { emp, comp, kind, reason, vacancies, jobEvents, clock, dateLabel, events } = params;
  const oldRole = emp.roleLevel;
  if (oldRole !== 'Unemployed' && kind !== 'layoff') {
    openVacancy(vacancies, comp, oldRole, `${emp.name} (${kind})`, clock, dateLabel);
  }
  emp.employerId = null;
  emp.bossId = null;
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

  emp.workHistory = [{ id: `wh_${kind}_${clock.totalDays}_${emp.id}_${emp.workHistory.length}`, dateLabel, companyId: comp.id, companyName: comp.name, role: oldRole, kind, note: reason }, ...emp.workHistory].slice(0, 24);
  jobEvents.unshift({ id: `je_${kind}_${clock.totalDays}_${emp.id}_${jobEvents.length}`, dateLabel, kind, citizenId: emp.id, citizenName: emp.name, companyId: comp.id, companyName: comp.name, role: oldRole, detail: reason });
  events.push(makeCityEvent(clock, `${kind}_${emp.id}_${jobEvents.length}`, {
    type: kind, citizenId: emp.id, citizenName: emp.name, companyId: comp.id,
    title: kind === 'fired' ? 'Citizen Fired' : kind === 'layoff' ? 'Company Layoff' : 'Citizen Quit Job',
    detail: reason,
  }));
}

export function runCompanyMonthlyAI(params: {
  companies: Company[];
  citizens: Citizen[];
  vacancies: CompanyVacancy[];
  jobEvents: JobMarketEvent[];
  mart: MartState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { companies, citizens, vacancies, jobEvents, mart, clock, dateLabel, events } = params;
  const byId = new Map(citizens.map((c) => [c.id, c]));

  for (const comp of companies) {
    if (comp.bankrupt) continue;
    const ceo = citizens.find((c) => c.alive && c.employerId === comp.id && c.roleLevel === 'CEO') ?? null;
    comp.ceoId = ceo?.id ?? null;
    if (!ceo) openVacancy(vacancies, comp, 'CEO', 'Missing CEO', clock, dateLabel);
    else comp.direction = ceo.traits.ambition + ceo.traits.greed >= 115 ? 'aggressive' : 'conservative';

    comp.payFreeze = comp.lastMonthProfit < 0;
    const employees = citizens.filter((c) => c.alive && c.employerId === comp.id);

    for (const emp of employees) {
      emp.tenureMonths += 1;
      emp.monthsSincePromotion += 1;
      emp.skill = Math.round(clamp(emp.skill + (0.08 + ((emp.traits.curiosity ?? 50) / 100) * 0.42) * (emp.housingSkillMult ?? 1), 0, 100) * 10) / 10;
      const boss = emp.bossId ? byId.get(emp.bossId) : null;
      if (boss && boss.alive) {
        const bossPush = (boss.traits.kindness - boss.traits.greed) * 0.12;
        const slow = 1 - emp.traits.loyalty * 0.005;
        emp.bossRelationship = Math.round(clamp(emp.bossRelationship + bossPush * slow + (simRand() - 0.5) * 3, -100, 100));
      }
      emp.performanceScore = computeCitizenPerformance(emp, clock.totalDays);
    }

    // Voluntary quitting
    for (const emp of employees) {
      if (emp.roleLevel === 'CEO') continue;
      const lowMental = (emp.healthProfile?.mental ?? 70) < 22;
      if (!emp.jobHunting && !lowMental && (emp.traits.ambition < 55 || emp.traits.loyalty > 72)) continue;
      let quitProb = emp.jobHunting ? 0.14 : 0.01;
      if (emp.mood < 42) quitProb += 0.05;
      if (lowMental) quitProb += 0.09;
      if (emp.bossRelationship < -20) quitProb += 0.07;
      if (emp.monthsSincePromotion >= 6) quitProb += 0.04;
      if (comp.payFreeze) quitProb += 0.04;
      if (simRand() < quitProb * ((100 - emp.traits.loyalty) / 100)) {
        emp.jobHunting = false;
        const reason = `${emp.name} quit ${comp.name} (${emp.roleLevel}) ${lowMental ? 'due to burnout' : 'seeking better prospects'}.`;
        releaseEmployee({ emp, comp, kind: 'quit', reason, vacancies, jobEvents, clock, dateLabel, events });
        recordConsequentialDecision({ citizen: emp, clock, dateLabel, kind: 'job_choice', category: 'work', title: `Quit ${comp.name}`, chosenOption: 'Resign Role', altOption: 'Keep Enduring', chosenReason: reason, chosenFactors: [{ label: 'Burnout / Strain', value: lowMental ? 30 : 16 }, { label: 'Boss Friction', value: emp.bossRelationship < 0 ? 15 : 0 }], altFactors: [{ label: 'Loyalty', value: Math.round(emp.traits.loyalty * 0.3) }], diarySentence: `Resigned from ${comp.name}.` });
      }
    }

    // Performance firing (below Executive; skip vijindustries when handled by board cooldowns)
    const active = citizens.filter((c) => c.alive && c.employerId === comp.id && ROLE_RANK[c.roleLevel] <= 4);
    for (const emp of active) {
      if (comp.id === 'vijmart' && emp.roleLevel === 'Team Lead') continue;
      if (emp.performanceScore < 32 && emp.bossRelationship < 10 && simRand() < 0.35) {
        releaseEmployee({ emp, comp, kind: 'fired', reason: `${emp.name} was fired from ${comp.name} for low performance (${emp.performanceScore}/100).`, vacancies, jobEvents, clock, dateLabel, events });
      }
    }
    if (comp.id === 'vijmart') {
      const floorMgr = getMartFloorManager(citizens);
      const review = evaluateMartManagerMonthly(mart, comp, floorMgr);
      if (review.shouldFire && floorMgr) {
        releaseEmployee({ emp: floorMgr, comp, kind: 'fired', reason: `${floorMgr.name} was fired as Vij Mart manager after 2 months below 30 performance (${Math.round(mart.managerPerformance)}/100).`, vacancies, jobEvents, clock, dateLabel, events });
      }
    }

    // 2-month negative profit layoffs starting from Entry
    if (comp.id !== 'vijindustries' && comp.negativeProfitStreak >= 2) {
      const layoffPool = citizens
        .filter((c) => c.alive && c.employerId === comp.id && c.roleLevel !== 'CEO')
        .sort((a, b) => ROLE_RANK[a.roleLevel] - ROLE_RANK[b.roleLevel] || a.performanceScore - b.performanceScore);
      const cut = layoffPool[0];
      if (cut) {
        releaseEmployee({ emp: cut, comp, kind: 'layoff', reason: `${comp.name} laid off ${cut.name} (${cut.roleLevel}) after ${comp.negativeProfitStreak} unprofitable months.`, vacancies, jobEvents, clock, dateLabel, events });
      }
    } else if (comp.id !== 'vijindustries' && comp.positiveProfitStreak >= 2 && comp.direction === 'aggressive' && comp.cash > 25000) {
      if (comp.id === 'gjelectricity' && employees.length >= 3) continue;
      const openRole: Exclude<RoleLevel, 'Unemployed'> = comp.id === 'vijtech' || comp.id === 'vijcapital' || comp.id === 'gjelectricity' ? 'Staff' : 'Entry';
      openVacancy(vacancies, comp, openRole, `${comp.name} growth expansion`, clock, dateLabel);
    }

    rebuildCompanyBossTree(comp.id, citizens);
  }

  syncMartPersonalityFromCeo(mart, citizens);
}
