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
  | 'Unemployed';

export type TierId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
export type HomeType = 'shared_room' | 'small_flat' | 'apartment' | 'villa' | 'mansion';
export type Gender = 'Female' | 'Male' | 'Non-Binary';
export type SimSpeed = 0 | 1 | 5 | 20;
export type NavTab = 'overview' | 'citizens' | 'companies' | 'jobs' | 'mart' | 'events';
export type CitizenSort = 'richest' | 'happiest' | 'status';
export type DeathCause = 'starvation' | 'dehydration' | 'illness';

export type EventCategory =
  | 'money'
  | 'mood'
  | 'tier'
  | 'system'
  | 'stock-out'
  | 'shortage'
  | 'spoilage'
  | 'delivery'
  | 'hunger'
  | 'thirst'
  | 'illness'
  | 'death'
  | 'simgod'
  | 'mood-change'
  | 'late-delivery'
  | 'rationing'
  | 'contamination'
  | 'price-shock'
  | 'hired'
  | 'fired'
  | 'quit'
  | 'promoted'
  | 'layoff'
  | 'pay-cut'
  | 'late-pay'
  | 'company-milestone'
  | 'bankruptcy'
  | 'board'
  | 'contribution'
  | 'investment';

export interface CitizenTraits {
  ambition: number;
  greed: number;
  kindness: number;
  loyalty: number;
  sociability: number;
  discipline: number;
}

export interface CitizenSnapshot {
  totalDay: number;
  label: string;
  savings: number;
  mood: number;
  statusScore: number;
}
