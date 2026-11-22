// seedProfiles.ts — Role-specific attribute bounds and tier-calibrated seed templates

import type { EducationLevel, RoleLevel, TierId } from './types';

export interface RoleSeedConfig {
  edus: EducationLevel[];
  skillRange: [number, number];
  expRange: [number, number];
  ageRange: [number, number];
  respectBase: number;
}

export const ROLE_CONFIGS: Record<RoleLevel, RoleSeedConfig> = {
  CEO: {
    edus: ['degree', 'masters', 'professional'],
    skillRange: [81, 97],
    expRange: [12, 28],
    ageRange: [38, 63],
    respectBase: 82,
  },
  Executive: {
    edus: ['degree', 'masters', 'professional'],
    skillRange: [72, 90],
    expRange: [9, 22],
    ageRange: [33, 59],
    respectBase: 72,
  },
  Manager: {
    edus: ['diploma', 'degree', 'masters', 'professional'],
    skillRange: [56, 80],
    expRange: [6, 17],
    ageRange: [28, 55],
    respectBase: 60,
  },
  'Team Lead': {
    edus: ['school', 'diploma', 'degree', 'masters'],
    skillRange: [44, 70],
    expRange: [3, 12],
    ageRange: [25, 49],
    respectBase: 50,
  },
  Staff: {
    edus: ['school', 'diploma', 'degree'],
    skillRange: [28, 58],
    expRange: [1, 9],
    ageRange: [21, 52],
    respectBase: 40,
  },
  Entry: {
    edus: ['none', 'school', 'diploma'],
    skillRange: [8, 38],
    expRange: [0, 3],
    ageRange: [18, 36],
    respectBase: 30,
  },
  Unemployed: {
    edus: ['none', 'school', 'diploma', 'degree'],
    skillRange: [8, 62],
    expRange: [0, 14],
    ageRange: [19, 64],
    respectBase: 22,
  },
};

export interface SeedSlot {
  role: RoleLevel;
  targetTier: TierId;
  savingsRange: [number, number];
}

// Exact role counts: CEO 4, Exec 4, Mgr 5, TL 6, Staff 10, Entry 12, Unemployed 9
// Exact tier spread: T1 3, T2 7, T3 17, T4 14, T5 9
export const SEED_ROSTER: SeedSlot[] = [
  { role: 'CEO', targetTier: 'T1', savingsRange: [9000, 19500] },
  { role: 'CEO', targetTier: 'T1', savingsRange: [8500, 17000] },
  { role: 'CEO', targetTier: 'T1', savingsRange: [7500, 15000] },
  { role: 'CEO', targetTier: 'T2', savingsRange: [2200, 3600] },
  { role: 'Executive', targetTier: 'T2', savingsRange: [2400, 4800] },
  { role: 'Executive', targetTier: 'T2', savingsRange: [2000, 4400] },
  { role: 'Executive', targetTier: 'T2', savingsRange: [1800, 4000] },
  { role: 'Executive', targetTier: 'T2', savingsRange: [1600, 3800] },
  { role: 'Manager', targetTier: 'T2', savingsRange: [2800, 4600] },
  { role: 'Manager', targetTier: 'T2', savingsRange: [2600, 4400] },
  { role: 'Manager', targetTier: 'T3', savingsRange: [700, 1400] },
  { role: 'Manager', targetTier: 'T3', savingsRange: [600, 1300] },
  { role: 'Manager', targetTier: 'T3', savingsRange: [550, 1250] },
  ...Array.from({ length: 6 }, (): SeedSlot => ({
    role: 'Team Lead', targetTier: 'T3', savingsRange: [550, 1450],
  })),
  ...Array.from({ length: 8 }, (): SeedSlot => ({
    role: 'Staff', targetTier: 'T3', savingsRange: [750, 1480],
  })),
  ...Array.from({ length: 2 }, (): SeedSlot => ({
    role: 'Staff', targetTier: 'T4', savingsRange: [120, 340],
  })),
  ...Array.from({ length: 11 }, (): SeedSlot => ({
    role: 'Entry', targetTier: 'T4', savingsRange: [140, 390],
  })),
  { role: 'Entry', targetTier: 'T5', savingsRange: [200, 290] },
  { role: 'Unemployed', targetTier: 'T4', savingsRange: [300, 500] },
  ...Array.from({ length: 8 }, (): SeedSlot => ({
    role: 'Unemployed', targetTier: 'T5', savingsRange: [300, 500],
  })),
];
