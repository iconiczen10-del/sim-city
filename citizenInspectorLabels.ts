// citizenInspectorLabels.ts — Display labels for loss causes, memories, decisions, and life logs

import type {
  DecisionKind,
  LifeLogCategory,
  LossCause,
  MemoryKind,
} from './citizenInspectorTypes';

export const LOSS_CAUSE_LABELS: Record<LossCause, string> = {
  fire: 'Fire',
  flood: 'Flood',
  theft: 'Theft',
  rats: 'Rats',
  power_cut: 'Power Cut',
  spoilage: 'Spoilage',
  random: 'Random Disaster',
};

export const NATURAL_LOSS_CAUSES: Exclude<LossCause, 'random'>[] = [
  'fire',
  'flood',
  'theft',
  'rats',
  'power_cut',
  'spoilage',
];

export const MEMORY_KIND_LABELS: Record<MemoryKind, string> = {
  loss: 'Property Loss',
  gift: 'Gift Received',
  theft_gain: 'Stolen Goods Received',
  stockout: 'Mart Stock-Out',
  price_shock: 'Price Shock',
  hunger: 'Severe Hunger',
  thirst: 'Severe Thirst',
  illness: 'Illness',
  death: 'City Loss',
  broke: 'Ran Out of Money',
  big_buy: 'Big Purchase',
  rationing: 'Mart Rationing',
  board_contribution: 'Board Capital Call',
  employee_investment: 'Staff Investment',
  investment_repaid: 'Investment Repaid',
  investment_lost: 'Investment Lost',
};

export const DECISION_KIND_LABELS: Record<DecisionKind, string> = {
  daily_shopping: 'Daily Shopping',
  standard_choice: 'Living Standard',
  meal_choice: 'Daily Meal',
  downgrade_upgrade: 'Standard Shift',
  tier_change: 'Status Tier',
  employee_investment: 'Staff Investment',
  board_vote: 'Board Vote',
};

export const LIFE_LOG_LABELS: Record<LifeLogCategory, string> = {
  meal: 'Meals',
  shop: 'Shopping',
  loss: 'Loss',
  gift: 'Received',
  health: 'Health',
  mood: 'Mood & Stress',
  money: 'Money',
};
