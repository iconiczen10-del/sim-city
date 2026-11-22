// companySetup.ts — Initializes the 4 Vij companies, assigns 41 workers into seats, and builds boss links

import { computeCitizenPerformance, syncMartPersonalityFromCeo } from './companyRules';
import type { Company, CompanyId } from './companyTypes';
import { COMPANY_INITIAL_CASH } from './constants';
import { calculateMarginalTax, calculateMonthlyPay, clamp } from './economy';
import type { MartState } from './martTypes';
import { simRandInt } from './rng';
import type { Citizen, RoleLevel } from './types';

export function createInitialCompanies(): Company[] {
  const base = {
    cash: COMPANY_INITIAL_CASH,
    monthlyRevenue: 0,
    monthlyPayrollCost: 0,
    monthlyOtherCost: 0,
    monthlyBusinessTax: 0,
    lastMonthRevenue: 0,
    lastMonthCosts: 0,
    lastMonthProfit: 0,
    reputation: 70,
    ceoId: null as string | null,
    direction: 'conservative' as const,
    payFreeze: false,
    positiveProfitStreak: 0,
    negativeProfitStreak: 0,
    negativeCashStreak: 0,
    bankrupt: false,
    history: [{ label: '1 Jan', revenue: 0, costs: 0, profit: 0, cash: COMPANY_INITIAL_CASH }],
  };

  return [
    { ...base, id: 'vijtech', name: 'Vijtech Systems', sector: 'Software & IT', industryMultiplier: 1.15 },
    { ...base, id: 'vijcapital', name: 'Vij Capital', sector: 'Finance & Banking', industryMultiplier: 1.1 },
    { ...base, id: 'vijindustries', name: 'Vij Industries', sector: 'Manufacturing & Export', industryMultiplier: 1.0 },
    { ...base, id: 'vijmart', name: 'Vij Mart', sector: 'Retail & Essentials', industryMultiplier: 0.9 },
  ];
}

const SEAT_QUOTAS: Record<Exclude<RoleLevel, 'Unemployed'>, [CompanyId, number][]> = {
  CEO: [['vijtech', 1], ['vijcapital', 1], ['vijindustries', 1], ['vijmart', 1]],
  Executive: [['vijtech', 1], ['vijcapital', 1], ['vijindustries', 2]],
  Manager: [['vijtech', 1], ['vijcapital', 1], ['vijindustries', 3]],
  'Team Lead': [['vijtech', 1], ['vijcapital', 1], ['vijindustries', 3], ['vijmart', 1]],
  Staff: [['vijtech', 2], ['vijcapital', 1], ['vijindustries', 7]],
  Entry: [['vijindustries', 10], ['vijmart', 2]],
};

export function rebuildCompanyBossTree(companyId: CompanyId, citizens: Citizen[]): void {
  const staff = citizens.filter((c) => c.alive && c.employerId === companyId);
  const byRole = (r: RoleLevel) => staff.filter((c) => c.roleLevel === r);
  const ceo = byRole('CEO')[0] ?? null;
  const execs = byRole('Executive');
  const mgrs = byRole('Manager');
  const leads = byRole('Team Lead');

  for (const c of staff) {
    if (c.roleLevel === 'CEO') c.bossId = null;
    else if (c.roleLevel === 'Executive') c.bossId = ceo?.id ?? null;
    else if (c.roleLevel === 'Manager') c.bossId = execs[0]?.id ?? ceo?.id ?? null;
    else if (c.roleLevel === 'Team Lead') c.bossId = mgrs[0]?.id ?? execs[0]?.id ?? ceo?.id ?? null;
    else c.bossId = leads[0]?.id ?? mgrs[0]?.id ?? execs[0]?.id ?? ceo?.id ?? null;
  }
}

export function assignInitialCitizensToCompanies(
  citizens: Citizen[],
  companies: Company[],
  mart: MartState
): void {
  const pools: Record<Exclude<RoleLevel, 'Unemployed'>, CompanyId[]> = {
    CEO: [], Executive: [], Manager: [], 'Team Lead': [], Staff: [], Entry: [],
  };
  for (const role of Object.keys(SEAT_QUOTAS) as Exclude<RoleLevel, 'Unemployed'>[]) {
    for (const [cid, count] of SEAT_QUOTAS[role]) {
      for (let i = 0; i < count; i++) pools[role].push(cid);
    }
  }

  for (const c of citizens) {
    if (c.roleLevel === 'Unemployed') {
      c.employerId = null;
      c.bossId = null;
      c.performanceScore = 0;
      continue;
    }
    const cid = pools[c.roleLevel].shift() ?? 'vijindustries';
    const comp = companies.find((co) => co.id === cid)!;
    c.employerId = cid;
    c.tenureMonths = 6 + simRandInt(0, 23);
    c.bossRelationship = Math.round(clamp((c.traits.kindness + c.traits.loyalty - 100) * 0.4 + 18, -30, 65));
    c.lastGrossPay = calculateMonthlyPay(c, 0.96, comp.industryMultiplier);
    c.lastTax = calculateMarginalTax(c.lastGrossPay);
    c.performanceScore = computeCitizenPerformance(c);
    c.workHistory = [{
      id: `wh_init_${c.id}`,
      dateLabel: '1 Jan, Year 1',
      companyId: cid,
      companyName: comp.name,
      role: c.roleLevel,
      kind: 'hired',
      note: `Founding ${c.roleLevel} at ${comp.name}.`,
    }];
    if (c.roleLevel === 'CEO') {
      comp.ceoId = c.id;
      comp.direction = c.traits.ambition + c.traits.greed >= 115 ? 'aggressive' : 'conservative';
    }
  }

  for (const comp of companies) rebuildCompanyBossTree(comp.id, citizens);
  syncMartPersonalityFromCeo(mart, citizens);
}
