// citizenEmotions.ts — 10-emotion definitions, seeding, trigger history, and mood contribution helpers

import type { CitizenEmotion, EmotionId } from './citizenRealTypes';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { simRandInt } from './rng';
import type { CitizenTraits } from './types';

export interface EmotionMeta {
  id: EmotionId;
  label: string;
  polarity: 'positive' | 'negative';
  color: string;
}

export const EMOTION_META: EmotionMeta[] = [
  { id: 'joy', label: 'Joy', polarity: 'positive', color: '#34d399' },
  { id: 'hope', label: 'Hope', polarity: 'positive', color: '#38bdf8' },
  { id: 'gratitude', label: 'Gratitude', polarity: 'positive', color: '#2dd4bf' },
  { id: 'sadness', label: 'Sadness', polarity: 'negative', color: '#818cf8' },
  { id: 'anger', label: 'Anger', polarity: 'negative', color: '#f87171' },
  { id: 'fear', label: 'Fear', polarity: 'negative', color: '#fb923c' },
  { id: 'loneliness', label: 'Loneliness', polarity: 'negative', color: '#a78bfa' },
  { id: 'shame', label: 'Shame', polarity: 'negative', color: '#f472b6' },
  { id: 'envy', label: 'Envy', polarity: 'negative', color: '#facc15' },
  { id: 'boredom', label: 'Boredom', polarity: 'negative', color: '#94a3b8' },
];

export function createSeedEmotions(traits: CitizenTraits): Record<EmotionId, CitizenEmotion> {
  const optBias = Math.round((traits.optimism - 50) * 0.25);
  const make = (id: EmotionId, label: string, val: number, decay: number): CitizenEmotion => ({
    id, label, value: Math.round(clamp(val, -100, 100)), decayRate: decay, triggers: [],
  });
  return {
    joy: make('joy', 'Joy', simRandInt(4, 18) + optBias, 0.82),
    hope: make('hope', 'Hope', simRandInt(6, 20) + optBias, 0.85),
    gratitude: make('gratitude', 'Gratitude', simRandInt(2, 14), 0.84),
    sadness: make('sadness', 'Sadness', simRandInt(-4, 8), 0.82),
    anger: make('anger', 'Anger', simRandInt(-4, 8), 0.78),
    fear: make('fear', 'Fear', simRandInt(-2, 10), 0.8),
    loneliness: make('loneliness', 'Loneliness', simRandInt(-4, 8), 0.84),
    shame: make('shame', 'Shame', simRandInt(-4, 6), 0.82),
    envy: make('envy', 'Envy', simRandInt(-2, 10), 0.83),
    boredom: make('boredom', 'Boredom', simRandInt(-4, 10), 0.82),
  };
}

export function applyEmotionPulse(
  emotions: Record<EmotionId, CitizenEmotion>,
  id: EmotionId,
  delta: number,
  summary: string,
  clock: SimClock,
  dateLabel: string
): void {
  const em = emotions[id];
  if (!em || Math.abs(delta) < 0.5) return;
  em.value = Math.round(clamp(em.value + delta, -100, 100) * 10) / 10;
  if (Math.abs(delta) >= 3) {
    em.triggers = [{ day: clock.totalDays, dateLabel, summary, delta: Math.round(delta * 10) / 10 }, ...em.triggers].slice(0, 5);
  }
}

export function topDrivingEmotions(emotions: Record<EmotionId, CitizenEmotion>, count = 2): CitizenEmotion[] {
  return EMOTION_META
    .map((m) => emotions[m.id])
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, count);
}
