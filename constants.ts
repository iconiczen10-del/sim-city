// constants.ts — Economic bands, fixed monthly costs, Mart AI parameters, and tier rules

import type { LivingStandard, MarginMood, ShoppingCategory } from './martTypes';
import type { EducationLevel, HomeType, RoleLevel, TierId } from './types';

export const APP_VERSION = '0.5.6';
export const STORAGE_KEY = 'vij_city_state_v5_6';
export const LEGACY_STORAGE_KEYS = ['vij_city_state_v5_5', 'vij_city_state_v5_4', 'vij_city_state_v5_3', 'vij_city_state_v5_2', 'vij_city_state_v5_1', 'vij_city_state_v5_0'] as const;
export const INITIAL_TREASURY = 20000;
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;
export const LIFE_LOG_RETENTION_DAYS = 60;

export const COMPANY_INITIAL_CASH = 40000;
export const BUSINESS_TAX_RATE = 0.05;
export const MART_INITIAL_CASH = 40000;
export const MART_CASH_RESERVE = 2250;
export const MART_MONTHLY_OP_COST = 0;
export const MART_WHOLESALE_RATIO = 0.65;
export const OUTSIDE_WHOLESALE_MULT = 1.24;
export const MART_SUPPLIER = 'Vij Industries';
export const MART_TRIP_FEE = 40;
export const MART_RUSH_FEE = 100;
export const MART_BULK_DISCOUNT_THRESHOLD = 1500;
export const MART_BULK_DISCOUNT_RATE = 0.04;
export const MART_LEAD_TIME_DAYS = 2;
export const FOOD_SPOIL_DAYS = 4;
export const OUTFIT_WEAR_DAYS = 120;
export const HOUSEHOLD_PACK_DAYS = 30;

export const MOOD_MARGIN_RANGES: Record<MarginMood, [number, number]> = {
  clearance: [0.02, 0.05],
  generous: [0.16, 0.2],
  good: [0.28, 0.32],
  typical: [0.46, 0.5],
  greedy: [0.65, 0.71],
  gouging: [1.1, 1.25],
};

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const ROLE_SEED_COUNTS: Record<RoleLevel, number> = {
  CEO: 4, Executive: 4, Manager: 5, 'Team Lead': 6, Staff: 10, Entry: 12, Unemployed: 9,
};

export const ROLE_PAY_BANDS: Record<RoleLevel, { min: number; max: number; expectedMult: number }> = {
  CEO: { min: 4000, max: 7000, expectedMult: 2.0 },
  Executive: { min: 2800, max: 4500, expectedMult: 1.85 },
  Manager: { min: 1800, max: 2800, expectedMult: 1.6 },
  'Team Lead': { min: 1200, max: 1800, expectedMult: 1.38 },
  Staff: { min: 700, max: 1100, expectedMult: 1.12 },
  Entry: { min: 400, max: 600, expectedMult: 0.92 },
  Unemployed: { min: 0, max: 0, expectedMult: 1 },
};

export const EDUCATION_MULTIPLIERS: Record<EducationLevel, number> = {
  none: 0.9, school: 1.0, diploma: 1.05, degree: 1.15, masters: 1.25, professional: 1.35,
};

export const ROLE_STATUS_SCORES: Record<RoleLevel, number> = {
  CEO: 100, Executive: 88, Manager: 74, 'Team Lead': 58, Staff: 40, Entry: 20, Unemployed: 0,
};

export const FIXED_NON_RENT_COSTS = {
  transport: 45, utilities: 30, healthcare: 15, phoneInternet: 10, total: 100,
} as const;

export const RENT_COSTS: Record<HomeType, number> = {
  shared_room: 80, small_flat: 150, apartment: 300, villa: 700, mansion: 1500,
};

export const SHOPPING_CATEGORIES: ShoppingCategory[] = ['food', 'water', 'clothes', 'household'];
export const LIVING_STANDARDS: LivingStandard[] = [1, 2, 3, 4, 5];

export const MART_BASE_PRICES: Record<ShoppingCategory, Record<LivingStandard, number>> = {
  food: { 1: 2, 2: 3, 3: 4, 4: 6, 5: 10 },
  water: { 1: 0.5, 2: 0.8, 3: 1, 4: 1.5, 5: 3 },
  clothes: { 1: 40, 2: 60, 3: 100, 4: 200, 5: 480 },
  household: { 1: 10, 2: 20, 3: 40, 4: 90, 5: 250 },
};

export const SAVINGS_MILESTONES = [1000, 5000, 10000, 25000, 50000] as const;
export const TIER_ORDER: TierId[] = ['T1', 'T2', 'T3', 'T4', 'T5'];
export const TIER_THRESHOLDS: Record<TierId, number> = { T1: 80, T2: 60, T3: 40, T4: 20, T5: 0 };
export const TIER_HYSTERESIS = 3;
export const MAX_MONTHLY_STATUS_DELTA = 2;
