// gjStaffCatalog.ts — GJ Electricity 1-6 non-CEO staff specs, hiring priority, and skill/exp pay formula

import { clamp } from './economy';
import type { GJRoleSpec, GJStaffTitle } from './gjSubsidyTypes';
import type { Citizen } from './types';

export const GJ_STAFF_SPECS: GJRoleSpec[] = [
  {
    title: 'Plant Engineer',
    roleLevel: 'Staff',
    minPay: 800,
    maxPay: 1250,
    priority: 1,
    duty: 'Gas plant reliability & fuel efficiency',
  },
  {
    title: 'Finance Officer',
    roleLevel: 'Team Lead',
    minPay: 1250,
    maxPay: 1750,
    priority: 2,
    duty: 'Grid revenue, arrears & backup subsidy review',
  },
  {
    title: 'Customer Relations Officer',
    roleLevel: 'Team Lead',
    minPay: 1250,
    maxPay: 1750,
    priority: 3,
    duty: 'Subsidy scoring, outreach & payment plans',
  },
  {
    title: 'Plant Operations Manager',
    roleLevel: 'Manager',
    minPay: 2300,
    maxPay: 2900,
    priority: 4,
    duty: 'Multi-plant dispatch & grid capacity',
  },
  {
    title: 'Billing Clerk',
    roleLevel: 'Entry',
    minPay: 410,
    maxPay: 555,
    priority: 5,
    duty: 'Monthly billing & household notice outreach',
  },
  {
    title: 'Grid Technician',
    roleLevel: 'Entry',
    minPay: 410,
    maxPay: 555,
    priority: 6,
    duty: 'Line maintenance, reconnects & tap inspections',
  },
];

export const GJ_SPEC_BY_TITLE: Record<Exclude<GJStaffTitle, 'CEO'>, GJRoleSpec> = {
  'Plant Engineer': GJ_STAFF_SPECS[0],
  'Finance Officer': GJ_STAFF_SPECS[1],
  'Customer Relations Officer': GJ_STAFF_SPECS[2],
  'Plant Operations Manager': GJ_STAFF_SPECS[3],
  'Billing Clerk': GJ_STAFF_SPECS[4],
  'Grid Technician': GJ_STAFF_SPECS[5],
};

export function inferGJTitle(citizen: Pick<Citizen, 'roleLevel' | 'gjJobTitle'>): GJStaffTitle {
  if (citizen.roleLevel === 'CEO') return 'CEO';
  if (citizen.gjJobTitle && citizen.gjJobTitle !== 'CEO') return citizen.gjJobTitle;
  if (citizen.roleLevel === 'Staff') return 'Plant Engineer';
  if (citizen.roleLevel === 'Team Lead') return 'Finance Officer';
  if (citizen.roleLevel === 'Manager') return 'Plant Operations Manager';
  return 'Billing Clerk';
}

export function calculateGJTitlePay(
  citizen: Pick<Citizen, 'skill' | 'experience' | 'traits'>,
  title: Exclude<GJStaffTitle, 'CEO'>,
  companyHealthMult = 1.0
): number {
  const spec = GJ_SPEC_BY_TITLE[title];
  const skillFactor = clamp((citizen.skill - 10) / 80, 0, 1);
  const expFactor = clamp(citizen.experience / 12, 0, 1);
  const merit = skillFactor * 0.65 + expFactor * 0.35;
  const healthBias = clamp(companyHealthMult, 0.85, 1.08);
  const raw = spec.minPay + (spec.maxPay - spec.minPay) * clamp(merit * healthBias, 0, 1);
  return Math.round(clamp(raw, spec.minPay, spec.maxPay));
}
