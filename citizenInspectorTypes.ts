// citizenInspectorTypes.ts — Data types for citizen memory, stress, decisions, breakdowns, ledger, and life log

import type { ShoppingCategory } from './inventoryTypes';
export type { CitizenMemory, LossCause, MemoryKind } from './citizenMemoryTypes';

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
  | 'board_vote'
  | 'job_choice'
  | 'help_choice'
  | 'theft_choice'
  | 'budget_skip'
  | 'risk_choice'
  | 'housing_buy'
  | 'housing_move'
  | 'retirement_choice'
  | 'marriage_proposal'
  | 'cohabitation'
  | 'child_launch'
  | 'child_tuition'
  | 'breakup'
  | 'electric_bill_choice'
  | 'subsidy_response'
  | 'loan_borrow'
  | 'debt_repay'
  | 'debt_coping'
  | 'inherited_debt_choice';

export interface DecisionOutcome {
  day: number;
  summary: string;
  worked: boolean;
}

export interface DecisionRecord {
  id: string;
  totalDay: number;
  dateLabel: string;
  kind: DecisionKind;
  category?: ShoppingCategory | 'survival' | 'status' | 'work' | 'social' | 'security' | 'fun' | 'housing' | 'family';
  title: string;
  chosenOption: string;
  chosenReason: string;
  linkedMemoryIds: string[];
  options: DecisionOption[];
  outcome7d?: DecisionOutcome;
  outcome30d?: DecisionOutcome;
  baselineMood?: number;
  baselineSavings?: number;
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
