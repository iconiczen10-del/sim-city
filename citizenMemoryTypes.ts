// citizenMemoryTypes.ts — Memory types and data interfaces for citizen recall and emotional impact

export type LossCause = 'fire' | 'flood' | 'theft' | 'rats' | 'power_cut' | 'spoilage' | 'random';

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
  | 'sharity_tribute'
  | 'theft_guilt'
  | 'theft_victim'
  | 'breakdown'
  | 'helped'
  | 'marriage'
  | 'widowed'
  | 'orphan'
  | 'child_birth'
  | 'retired'
  | 'heartbreak'
  | 'family_pride'
  | 'bill_shock'
  | 'subsidy_help'
  | 'debt_stress'
  | 'loan_default'
  | 'inherited_debt';

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
