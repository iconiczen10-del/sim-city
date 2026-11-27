// cityBaseTypes.ts — Core citizen enumerations, traits, snapshots, and UI filter types

export type EducationLevel =
  | 'none'
  | 'school'
  | 'diploma'
  | 'degree'
  | 'masters'
  | 'professional';

export type RoleLevel =
  | 'CEO'
  | 'Executive'
  | 'Manager'
  | 'Team Lead'
  | 'Staff'
  | 'Entry'
  | 'Unemployed'
  | 'Retired';

export type TierId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
export type HomeType = 'shared_room' | 'small_flat' | 'apartment' | 'villa' | 'mansion';
export type Gender = 'Female' | 'Male' | 'Non-Binary';
export type SimSpeed = 0 | 1 | 2 | 5 | 10 | 20 | 25 | 30 | 40 | 50;
export type NavTab = 'overview' | 'citizens' | 'companies' | 'jobs' | 'mart' | 'housing' | 'sharity' | 'events' | 'settings';
export type CitizenSort = 'richest' | 'happiest' | 'status';
export type DeathCause = 'starvation' | 'dehydration' | 'illness' | 'old_age';

export type EventCategory =
  | 'money' | 'mood' | 'tier' | 'system' | 'stock-out' | 'shortage' | 'spoilage' | 'delivery'
  | 'hunger' | 'thirst' | 'illness' | 'death' | 'simgod' | 'mood-change' | 'late-delivery'
  | 'rationing' | 'contamination' | 'price-shock' | 'hired' | 'fired' | 'quit' | 'promoted'
  | 'layoff' | 'pay-cut' | 'late-pay' | 'company-milestone' | 'bankruptcy' | 'board'
  | 'contribution' | 'investment' | 'sharity' | 'viral' | 'cancelled' | 'argument' | 'tribute'
  | 'city-wave' | 'work-consequence' | 'breakdown' | 'theft-attempt' | 'theft-caught'
  | 'need-critical' | 'emotion-spike' | 'eviction' | 'bought-house' | 'moved'
  | 'homeless' | 'housing-search' | 'roommate-conflict' | 'sold-house' | 'rent-raise'
  | 'electric-bill' | 'power-cut' | 'blackout' | 'plant-built' | 'plant-failed'
  | 'tariff-change' | 'appliance-buy' | 'appliance-broke'
  | 'birthday' | 'retired' | 'courtship' | 'marriage' | 'breakup' | 'pregnancy'
  | 'child-birth' | 'child-adult' | 'family-achievement' | 'subsidy'
  | 'loan' | 'debt-default' | 'inheritance';

export interface CitizenTraits {
  ambition: number;
  greed: number;
  kindness: number;
  loyalty: number;
  sociability: number;
  discipline: number;
  honesty: number;
  courage: number;
  patience: number;
  curiosity: number;
  pride: number;
  thriftiness: number;
  optimism: number;
  resilience: number;
  impulsiveness: number;
  riskTolerance: number;
  neatness: number;
  survivalInstinct: number;
}

export interface CitizenSnapshot {
  totalDay: number;
  label: string;
  savings: number;
  mood: number;
  statusScore: number;
}

export interface CityEvent {
  id: string;
  totalDay: number;
  dateLabel: string;
  type: EventCategory;
  citizenId?: string;
  citizenName?: string;
  companyId?: 'vijtech' | 'vijcapital' | 'vijindustries' | 'vijmart' | 'gjelectricity';
  title: string;
  detail: string;
}

export interface TierMovement {
  citizenId: string;
  citizenName: string;
  fromTier: TierId;
  toTier: TierId;
  direction: 'up' | 'down';
  statusScore: number;
  monthLabel: string;
  day?: number;
  reason?: string;
}

