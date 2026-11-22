// boardLayoffs.ts — Targeted board layoff helper protecting critical roles with no severance

import { addCitizenMemory } from './citizenMemory';
import { ROLE_RANK } from './companyRules';
import type { Company, JobMarketEvent } from './companyTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import type { Citizen, CityEvent } from './types';

export function layoffOneEmployee(
  comp: Company,
  citizens: Citizen[],
  jobEvents: JobMarketEvent[],
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): Citizen | null {
  const leads = citizens.filter((c) => c.alive && c.employerId === comp.id && c.roleLevel === 'Team Lead').length;
  const pool = citizens
    .filter((c) => {
      if (!c.alive || c.employerId !== comp.id) return false;
      if (['CEO', 'Executive', 'Manager'].includes(c.roleLevel)) return false;
      if (c.roleLevel === 'Team Lead' && leads <= 1) return false;
      return true;
    })
    .sort((a, b) => a.performanceScore - b.performanceScore || ROLE_RANK[a.roleLevel] - ROLE_RANK[b.roleLevel]);
  const cut = pool[0] ?? null;
  if (!cut) return null;

  const oldRole = cut.roleLevel;
  cut.employerId = null;
  cut.bossId = null;
  cut.roleLevel = 'Unemployed';
  cut.lastGrossPay = 0;
  cut.lastTax = 0;
  cut.performanceScore = 0;
  cut.tenureMonths = 0;
  cut.monthsSincePromotion = 0;
  addCitizenMemory(cut, clock, dateLabel, 'loss', `Laid off without severance by ${comp.name} board (${oldRole}).`, -38);
  cut.workHistory = [{ id: `wh_blo_${clock.totalDays}_${cut.id}`, dateLabel, companyId: comp.id, companyName: comp.name, role: oldRole, kind: 'layoff' as const, note: 'Board layoff (no severance).' }, ...cut.workHistory].slice(0, 24);
  jobEvents.unshift({ id: `je_blo_${clock.totalDays}_${cut.id}`, dateLabel, kind: 'layoff', citizenId: cut.id, citizenName: cut.name, companyId: comp.id, companyName: comp.name, role: oldRole, detail: `${cut.name} laid off by ${comp.name} board (no severance).` });
  events.push(makeCityEvent(clock, `blo_${cut.id}`, { type: 'layoff', citizenId: cut.id, citizenName: cut.name, companyId: comp.id, title: 'Board Layoff', detail: `${cut.name} (${oldRole}) laid off by ${comp.name} with no severance.` }));
  comp.reputation = Math.round(clamp(comp.reputation - 3.5, 0, 100) * 10) / 10;
  return cut;
}
