// citizenInspectorTypes.ts — Data types for citizen memory, stress, decisions, breakdowns, ledger, and life log

import type { LivingStandard, ShoppingCategory } from './inventoryTypes';

export type LossCause =
  | 'fire'
  | 'flood'
  | 'theft'
  | 'rats'
  | 'power_cut'
  | 'spoilage'
  | 'random';

export type MemoryKind =
  | 'loss'
  | 'gift'
  | 'theft_gain'
  | 'stockout'
  | 'price_shock'
  | 'hunger'
  | 'thirst'
  | 'illness'
  | 'death'
  | 'broke'
  | 'big_buy'
  | 'rationing'
  | 'board_contribution'
  | 'employee_investment'
  | 'investment_repaid'
  | 'investment_lost'
  | 'sharity_praise'
  | 'sharity_humiliation'
  | 'sharity_shade'
  | 'sharity_tribute';

export interface CitizenMemory {
  id: string;
  totalDay: number;
  dateLabel: string;
  kind: MemoryKind;
  summary: string;
  initialWeight: number;
  currentWeight: number;
  decayRate: number;
  linkedDecisionIds: string[];
}

export interface SignedFactor {
  label: string;
  value: number;
  detail?: string;
}

export interface SharityFactorLine {
  id: string;
  label: string;
  value: number;
  decayRate: number;
  postId?: string;
}

export interface DecisionOption {
  label: string;
  totalScore: number;
  chosen: boolean;
  factors: SignedFactor[];
}

export type DecisionKind =
  | 'daily_shopping'
  | 'standard_choice'
  | 'meal_choice'
  | 'downgrade_upgrade'
  | 'tier_change'
  | 'employee_investment'
  | 'board_vote';

export interface DecisionRecord {
  id: string;
  totalDay: number;
  dateLabel: string;
  kind: DecisionKind;
  category?: ShoppingCategory | 'survival' | 'status';
  title: string;
  chosenOption: string;
  chosenReason: string;
  linkedMemoryIds: string[];
  options: DecisionOption[];
}

export interface ChangeExplanation {
  id: string;
  totalDay: number;
  dateLabel: string;
  kind: 'standard_downgrade' | 'mood_drop' | 'tier_change' | 'social_shift';
  summary: string;
  decisionId?: string;
  postId?: string;
}

export interface LedgerEntry {
  id: string;
  totalDay: number;
  dateLabel: string;
  kind: 'income' | 'expense';
  category: string;
  label: string;
  amount: number;
}

export type LifeLogCategory = 'meal' | 'shop' | 'loss' | 'gift' | 'health' | 'mood' | 'money' | 'sharity';

export interface LifeLogEntry {
  id: string;
  totalDay: number;
  dateLabel: string;
  category: LifeLogCategory;
  summary: string;
}

export type MassTargetScope = 'single' | 'tier' | 'role' | 'all' | 'random';

export interface SimGodInvSelection {
  scope: MassTargetScope;
  citizenId?: string;
  tier?: 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
  role?: string;
  randomCount?: number;
  category: ShoppingCategory;
  standard: LivingStandard;
  quantity: number;
}
