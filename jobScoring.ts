// jobScoring.ts — Vacancy creation, role qualification checks, and applicant scoring queues

import { EDU_RANK, ROLE_RANK, ROLE_REQUIREMENTS } from './companyRules';
import type { Company, CompanyVacancy, VacancyApplicant } from './companyTypes';
import type { SimClock } from './eventFactory';
import { simIdSuffix } from './rng';
import type { Citizen, RoleLevel } from './types';

export function openVacancy(
  vacancies: CompanyVacancy[],
  company: Company,
  role: Exclude<RoleLevel, 'Unemployed' | 'Retired'>,
  reason: string,
  clock: SimClock,
  dateLabel: string
): void {
  if (company.bankrupt) return;
  const dup = vacancies.filter((v) => v.companyId === company.id && v.role === role).length;
  if (dup >= 2) return;
  const req = ROLE_REQUIREMENTS[role];
  vacancies.push({
    id: `vac_${clock.totalDays}_${company.id}_${role}_${simIdSuffix()}`,
    companyId: company.id,
    companyName: company.name,
    role,
    minSkill: req.minSkill,
    minExp: req.minExp,
    minEdu: req.minEdu,
    openedDay: clock.totalDays,
    openedDate: dateLabel,
    reason,
    applicants: [],
  });
}

export function meetsRoleRequirements(c: Citizen, role: Exclude<RoleLevel, 'Unemployed' | 'Retired'>): boolean {
  const req = ROLE_REQUIREMENTS[role];
  return (
    EDU_RANK[c.education] >= EDU_RANK[req.minEdu] &&
    c.skill >= req.minSkill &&
    c.experience >= req.minExp
  );
}

export function scoreCandidate(
  c: Citizen,
  vacancy: CompanyVacancy,
  comp: Company,
  isInternal: boolean
): number {
  const req = ROLE_REQUIREMENTS[vacancy.role];
  const eduScore = (EDU_RANK[c.education] - EDU_RANK[req.minEdu]) * 8 + 15;
  const skillScore = (c.skill - req.minSkill) * 0.7;
  const expScore = Math.min(24, c.experience * 1.8);
  const hopperPenalty = c.workHistory.filter((w) => w.kind === 'quit').length * (100 - c.traits.loyalty) * 0.12;
  const loyaltyScore = c.traits.loyalty * 0.25 - hopperPenalty;
  const internalBonus = isInternal ? 18 + Math.min(18, c.tenureMonths * 0.8) : 0;
  const desperateBonus = c.roleLevel === 'Unemployed' && c.unemployedDays >= 60 ? 12 : 0;
  const repPull = (comp.reputation - 50) * 0.12;
  const housingPenalty = (c.homeId === null ? -15 : 0) + ((c.evictionRecords?.length ?? 0) > 0 ? -10 : 0);
  return Math.round((eduScore + skillScore + expScore + loyaltyScore + internalBonus + desperateBonus + repPull + housingPenalty) * 10) / 10;
}

export function collectApplicantsForVacancy(
  citizens: Citizen[],
  vacancy: CompanyVacancy,
  comp: Company,
  totalDays = 0
): VacancyApplicant[] {
  const apps: VacancyApplicant[] = [];
  for (const c of citizens) {
    if (!c.alive || c.roleLevel === 'Retired' || c.retired || c.age < 25) continue;
    if (!meetsRoleRequirements(c, vacancy.role)) continue;
    if (c.healthProfile?.breakdownUntilDay && totalDays > 0 && totalDays <= c.healthProfile.breakdownUntilDay) continue;
    const isInternal = c.employerId === comp.id;
    const roleDiff = ROLE_RANK[vacancy.role] - ROLE_RANK[c.roleLevel];
    if (c.roleLevel === 'Unemployed') {
      if (c.unemployedDays < 60 && ROLE_RANK[vacancy.role] === 1 && c.skill > 65 && c.traits.survivalInstinct <= 70) continue;
    } else if (isInternal) {
      if (roleDiff !== 1) continue;
      if (c.promotionBlockedUntilDay && totalDays > 0 && totalDays <= c.promotionBlockedUntilDay) continue;
    } else {
      if (c.traits.ambition < 58 || roleDiff < 1) continue;
    }
    apps.push({
      citizenId: c.id,
      citizenName: c.name,
      currentRole: c.roleLevel,
      currentCompanyId: c.employerId,
      score: scoreCandidate(c, vacancy, comp, isInternal),
      qualified: true,
    });
  }
  return apps.sort((a, b) => b.score - a.score).slice(0, 8);
}
