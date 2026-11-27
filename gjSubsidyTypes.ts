// gjSubsidyTypes.ts — Types for GJ Electricity staffing titles, subsidy packages, logs, and NPC billing awareness

import type { RoleLevel } from './cityBaseTypes';

export type GJStaffTitle =
  | 'CEO'
  | 'Plant Engineer'
  | 'Finance Officer'
  | 'Customer Relations Officer'
  | 'Plant Operations Manager'
  | 'Billing Clerk'
  | 'Grid Technician';

export type GJSubsidyMood = 'strict' | 'balanced' | 'generous';
export type SimGodSubsidyLevel = 'auto' | 'none' | 'low' | 'medium' | 'high' | 'full';
export type LifelineMode = 'none' | 'free_0' | 'low_020' | 'tapered';
export type SubsidyLearnSource = 'none' | 'gj_notice' | 'coworker' | 'neighbor' | 'sharity';

export interface GJRoleSpec {
  title: GJStaffTitle;
  roleLevel: Exclude<RoleLevel, 'Unemployed' | 'Retired'>;
  minPay: number;
  maxPay: number;
  priority: number;
  duty: string;
}

export interface HouseSubsidyPackage {
  id: string;
  month: number;
  year: number;
  dateLabel: string;
  houseId: string;
  houseName: string;
  score: number;
  assessorTitle: GJStaffTitle | 'None';
  enrolled: boolean;
  outreachDiscovered: boolean;
  lifelineMode: LifelineMode;
  lifelineUnitLimit: number;
  waiverPct: number; // 0 to 100 (100 = free bill)
  incomeCapPct: number | null; // e.g., 4..10 (% of pay)
  paymentPlanMonths: number; // 0 or 2..4
  lateFeeWaived: boolean;
  coldSnapRelief: number;
  monthlyAbsorbed: number;
  status: 'active' | 'lifeline' | 'free_bill' | 'payment_plan' | 'refused' | 'unreached' | 'ineligible';
  reasonTags: string[];
  reasonSummary: string;
}

export interface GJSubsidyLogEntry {
  id: string;
  day: number;
  dateLabel: string;
  houseId: string;
  houseName: string;
  status: HouseSubsidyPackage['status'];
  amountAbsorbed: number;
  assessor: string;
  reason: string;
}

export interface CitizenSubsidyHistoryEntry {
  id: string;
  day: number;
  dateLabel: string;
  houseName: string;
  status: HouseSubsidyPackage['status'];
  amountSaved: number;
  sharePaid: number;
  billChoice: 'paid_in_full' | 'asked_for_plan' | 'skipped_bill' | 'waived_free';
  reason: string;
}

export interface ElectricityAwarenessProfile {
  knowsTariffBands: boolean;
  tariffBeliefAccuracy: 'accurate' | 'vague' | 'wrong';
  knowsLateFee: boolean;
  knowsDisconnectRule: boolean;
  knowsReconnectFine: boolean;
  knowsSubsidy: boolean;
  subsidySource: SubsidyLearnSource;
  subsidyLearnedDay?: number;
  pendingSubsidyLearnDay?: number;
  pendingSubsidySource?: SubsidyLearnSource;
  refusedSubsidy: boolean;
  askedForPlan: boolean;
  trustInGJ: number; // 0..100
  lastKnownBill: number;
  monthlyConservationPct: number; // 0..28% usage reduction
  lastReactionNote: string;
}
