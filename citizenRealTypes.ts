// citizenRealTypes.ts — Data types for 8 citizen needs, 4-part health, 10 emotions, and survival ladder

export type NeedId = 'thirst' | 'hunger' | 'energy' | 'hygiene' | 'shelter' | 'safety' | 'social' | 'fun';

export interface CitizenNeed {
  id: NeedId;
  name: string;
  value: number;
  drainRate: number;
  lastRestoredDay: number;
}

export interface HealthProfile {
  physical: number;
  mental: number;
  immunity: number;
  fitness: number;
  illnessName?: string;
  illnessDaysLeft?: number;
  breakdownUntilDay?: number;
}

export type EmotionId =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'loneliness'
  | 'shame'
  | 'envy'
  | 'gratitude'
  | 'boredom'
  | 'hope';

export interface EmotionTrigger {
  day: number;
  dateLabel: string;
  summary: string;
  delta: number;
}

export interface CitizenEmotion {
  id: EmotionId;
  label: string;
  value: number;
  decayRate: number;
  triggers: EmotionTrigger[];
}

export interface EmotionSnapshot {
  totalDay: number;
  label: string;
  values: Record<EmotionId, number>;
}

export type SurvivalState = 'Thriving' | 'Stable' | 'Struggling' | 'Critical' | 'Desperate';

export interface SurvivalPriorityEntry {
  needId: NeedId;
  name: string;
  value: number;
  urgency: number;
  amplifiedUrgency: number;
}
