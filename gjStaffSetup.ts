// gjStaffSetup.ts — Day-1 deterministic skill- and education-matched assignment of GJ Electricity's 6 non-CEO seats

import { computeCitizenPerformance, EDU_RANK } from './companyRules';
import type { Company } from './companyTypes';
import { calculateMarginalTax, calculateMonthlyPay, clamp } from './economy';
import { GJ_STAFF_SPECS } from './gjStaffCatalog';
import { simRandInt } from './rng';
import type { Citizen, RoleLevel } from './types';

const ROLE_MIN_SKILL: Partial<Record<RoleLevel, number>> = {
  Executive: 72,
  Manager: 56,
  'Team Lead': 44,
  Staff: 28,
  Entry: 8,
};

const ROLE_MIN_EDU: Partial<Record<RoleLevel, number>> = {
  Executive: 3,
  Manager: 2,
  'Team Lead': 1,
  Staff: 1,
  Entry: 0,
};

export function assignFoundingGJStaff(citizens: Citizen[], companies: Company[]): void {
  const gj = companies.find((c) => c.id === 'gjelectricity');
  if (!gj) return;

  // Assign order: highest seniority first so high-skill unemployed fill high roles if qualified, else transfer from Vij Industries without refilling vacated seats
  const specsByRank = [
    GJ_STAFF_SPECS.find((s) => s.title === 'Plant Operations Manager')!,
    GJ_STAFF_SPECS.find((s) => s.title === 'Finance Officer')!,
    GJ_STAFF_SPECS.find((s) => s.title === 'Customer Relations Officer')!,
    GJ_STAFF_SPECS.find((s) => s.title === 'Plant Engineer')!,
    GJ_STAFF_SPECS.find((s) => s.title === 'Billing Clerk')!,
    GJ_STAFF_SPECS.find((s) => s.title === 'Grid Technician')!,
  ];

  const assignedIds = new Set<string>();
  const scoreMatch = (c: Citizen) => c.skill * 2 + EDU_RANK[c.education] * 12 + c.experience * 1.5;

  for (const spec of specsByRank) {
    const role = spec.roleLevel;
    const minSkill = ROLE_MIN_SKILL[role] ?? 8;
    const minEdu = ROLE_MIN_EDU[role] ?? 0;

    const unempQual = citizens
      .filter((c) => c.alive && c.roleLevel === 'Unemployed' && !assignedIds.has(c.id) && c.skill >= minSkill && EDU_RANK[c.education] >= minEdu)
      .sort((a, b) => scoreMatch(b) - scoreMatch(a));

    const transferQual = citizens
      .filter((c) => c.alive && c.employerId === 'vijindustries' && c.roleLevel === role && !assignedIds.has(c.id) && c.skill >= minSkill && EDU_RANK[c.education] >= minEdu)
      .sort((a, b) => scoreMatch(b) - scoreMatch(a));

    const fallbackPool = citizens
      .filter((c) => c.alive && c.employerId !== 'gjelectricity' && c.roleLevel === role && !assignedIds.has(c.id) && c.skill >= minSkill && EDU_RANK[c.education] >= minEdu)
      .sort((a, b) => scoreMatch(b) - scoreMatch(a));

    const pick = unempQual[0] ?? transferQual[0] ?? fallbackPool[0];
    if (!pick) continue;

    assignedIds.add(pick.id);
    pick.employerId = 'gjelectricity';
    pick.roleLevel = role;
    pick.gjJobTitle = spec.title;
    pick.bankJobTitle = undefined;
    pick.tenureMonths = 6 + simRandInt(0, 18);
    pick.bossRelationship = Math.round(clamp((pick.traits.kindness + pick.traits.loyalty - 100) * 0.4 + 18, -30, 65));
    pick.lastGrossPay = calculateMonthlyPay(pick, 0.96, gj.industryMultiplier);
    pick.lastTax = calculateMarginalTax(pick.lastGrossPay);
    pick.performanceScore = computeCitizenPerformance(pick);
    pick.workHistory = [{
      id: `wh_init_gj_${pick.id}`,
      dateLabel: '1 Jan, Year 1',
      companyId: 'gjelectricity',
      companyName: gj.name,
      role,
      kind: 'hired',
      note: `Founding ${spec.title} at ${gj.name}.`,
    }];
  }
}
