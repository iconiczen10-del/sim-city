// companyRules.ts — Role requirements, company health multiplier, performance, and Mart CEO trait sync

import type { EducationLevel, RoleLevel } from './cityBaseTypes';
import type { Company } from './companyTypes';
import { clamp } from './economy';
import type { ManagerStyle, MartState } from './martTypes';
import type { Citizen } from './types';

export const WORKING_ROLES_DESC: Exclude<RoleLevel, 'Unemployed' | 'Retired'>[] = [
  'CEO',
  'Executive',
  'Manager',
  'Team Lead',
  'Staff',
  'Entry',
];

export const ROLE_RANK: Record<RoleLevel, number> = {
  CEO: 6,
  Executive: 5,
  Manager: 4,
  'Team Lead': 3,
  Staff: 2,
  Entry: 1,
  Unemployed: 0,
  Retired: 0,
};

export const EDU_RANK: Record<EducationLevel, number> = {
  none: 0,
  school: 1,
  diploma: 2,
  degree: 3,
  masters: 4,
  professional: 5,
};

export const ROLE_REQUIREMENTS: Record<
  Exclude<RoleLevel, 'Unemployed' | 'Retired'>,
  { minEdu: EducationLevel; minSkill: number; minExp: number }
> = {
  Entry: { minEdu: 'none', minSkill: 0, minExp: 0 },
  Staff: { minEdu: 'none', minSkill: 20, minExp: 0 },
  'Team Lead': { minEdu: 'none', minSkill: 35, minExp: 1 },
  Manager: { minEdu: 'diploma', minSkill: 50, minExp: 2 },
  Executive: { minEdu: 'degree', minSkill: 65, minExp: 4 },
  CEO: { minEdu: 'degree', minSkill: 80, minExp: 6 },
};

export function getCompanyHealthMultiplier(company: Company): number {
  if (company.bankrupt) return 0.75;
  if (company.positiveProfitStreak >= 3) {
    return company.direction === 'aggressive' ? 1.12 : 1.07;
  }
  if (company.cash < 5000 || company.negativeCashStreak > 0 || company.negativeProfitStreak >= 2) {
    return clamp(0.75 + (company.cash / 20000) * 0.15, 0.75, 0.9);
  }
  return clamp(0.92 + (company.reputation / 100) * 0.08, 0.9, 1.0);
}

export function computeCitizenPerformance(citizen: Citizen, totalDays = 0): number {
  if (!citizen.alive || citizen.roleLevel === 'Unemployed' || citizen.roleLevel === 'Retired') return 0;
  if (citizen.healthProfile?.breakdownUntilDay && totalDays > 0 && citizen.healthProfile.breakdownUntilDay >= totalDays) {
    return 5;
  }
  const skillPart = citizen.skill * 0.42;
  const discPart = citizen.traits.discipline * 0.34;
  const stressPenalty = citizen.stress * 0.2;
  const energyVal = citizen.needs?.energy?.value ?? 80;
  const energyPenalty = energyVal < 40 ? (40 - energyVal) * 0.35 : 0;
  const bossBonus = (citizen.bossRelationship / 100) * 14;
  const moodBonus = ((citizen.mood - 50) / 50) * 8;
  const hSat = citizen.housingSatisfaction?.total ?? 50;
  const housingPerf = hSat > 75 ? 4 : hSat < 30 ? -6 : 0;
  const agePenalty = citizen.age >= 56 ? (citizen.age - 55) * 1.15 : 0;
  return Math.round(clamp(28 + skillPart + discPart - stressPenalty - energyPenalty + bossBonus + moodBonus + housingPerf - agePenalty, 5, 99));
}

export function syncMartPersonalityFromCeo(mart: MartState, citizens: Citizen[]): void {
  const ceo = citizens.find((c) => c.alive && c.employerId === 'vijmart' && c.roleLevel === 'CEO');
  if (!ceo) return;
  const { greed, discipline } = ceo.traits;
  let style: ManagerStyle = 'balanced';
  if (greed >= 62 && discipline < 60) style = 'aggressive';
  else if (discipline >= 62 && greed < 60) style = 'cautious';
  const greedyLean = Math.round(clamp((greed - discipline) * 0.65, -50, 50));
  mart.personality = { style, greedyLean };
}
