// citizenEmotionEngine.ts — Daily 10-emotion evolution, trait filtering, 60-day history, and aggregate mood target

import { applyEmotionPulse, EMOTION_META } from './citizenEmotions';
import type { EmotionId } from './citizenRealTypes';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatMonthYear } from './formatters';
import { estimateMonthlyShoppingCost } from './standards';
import type { Citizen, CityEvent } from './types';

function r1(n: number): number { return Math.round(n * 10) / 10; }

export function stepCitizenEmotionsDaily(
  c: Citizen,
  netPay: number,
  hadShortageToday: boolean,
  martReputation: number,
  griefPenalty: number,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): number {
  const em = c.emotions;
  const t = c.traits;
  const n = c.needs;
  const resDecay = 1 - (t.resilience - 50) * 0.0018;
  const optBias = (t.optimism - 50) * 0.08;

  for (const m of EMOTION_META) {
    const row = em[m.id];
    const rate = m.polarity === 'negative' ? clamp(row.decayRate * resDecay, 0.65, 0.92) : row.decayRate;
    const base = m.id === 'hope' || m.id === 'joy' ? optBias : 0;
    row.value = r1(clamp(base + (row.value - base) * rate, -100, 100));
  }

  const fixed = calculateFixedMonthlyCosts(c.homeType).total;
  const estLiving = fixed + estimateMonthlyShoppingCost(c.standards);
  const runway = estLiving > 0 ? c.savings / estLiving : 0;

  if (n.fun.value >= 68 && n.social.value >= 60 && c.hunger > 60) applyEmotionPulse(em, 'joy', 3.5, 'Good social life & recreation', clock, dateLabel);
  if (clock.day === 30 && netPay > estLiving) applyEmotionPulse(em, 'joy', 5, 'Strong payday surplus', clock, dateLabel);
  if (hadShortageToday) applyEmotionPulse(em, 'anger', 5, 'Vij Mart stock-out frustration', clock, dateLabel);
  if (griefPenalty > 0) applyEmotionPulse(em, 'sadness', 8 + griefPenalty * 1.5, 'Mourning citizen loss', clock, dateLabel);

  const sadScale = 1.25 - t.optimism * 0.005;
  if (c.hunger < 30 || c.thirst < 30) applyEmotionPulse(em, 'sadness', 7 * sadScale, 'Unmet food or water need', clock, dateLabel);
  if (c.roleLevel === 'Unemployed') applyEmotionPulse(em, 'sadness', 3.2 * sadScale, 'Ongoing unemployment weight', clock, dateLabel);

  if (runway < 0.35 || n.safety.value < 45 || (c.healthProfile.illnessDaysLeft ?? 0) > 0) {
    const fearBoost = runway < 0.35 ? 6 : n.safety.value < 45 ? 5 : 4;
    applyEmotionPulse(em, 'fear', fearBoost * (1.2 - t.courage * 0.004), runway < 0.35 ? 'Low savings runway anxiety' : n.safety.value < 45 ? 'Neighborhood safety worry' : 'Illness vulnerability', clock, dateLabel);
  }
  if (n.social.value < 42) applyEmotionPulse(em, 'loneliness', (45 - n.social.value) * 0.28, 'Low daily social contact', clock, dateLabel);
  else if (n.social.value >= 72) applyEmotionPulse(em, 'loneliness', -4, 'Connected with community', clock, dateLabel);

  const prideMult = 0.7 + (t.pride / 100) * 0.9;
  if (c.rentArrears > 0 || (c.savings <= 0 && clock.totalDays % 3 === 0)) {
    applyEmotionPulse(em, 'shame', 6 * prideMult, c.rentArrears > 0 ? 'Unpaid rent arrears' : 'Empty savings strain', clock, dateLabel);
  }
  if ((c.cancelledUntilDay ?? 0) >= clock.totalDays) applyEmotionPulse(em, 'shame', 5 * prideMult, 'Public Sharity backlash', clock, dateLabel);

  if (t.greed >= 58 && c.tier !== 'T1' && c.tier !== 'T2' && clock.totalDays % 4 === 0) {
    applyEmotionPulse(em, 'envy', (t.greed - 45) * 0.14, 'Comparing status against wealthier peers', clock, dateLabel);
  }
  if (c.giftShieldDays > 0) applyEmotionPulse(em, 'gratitude', 5 + t.kindness * 0.04, 'Helped by generosity', clock, dateLabel);

  const curCushion = 1.2 - (t.curiosity / 100) * 0.75;
  if (n.fun.value < 44) applyEmotionPulse(em, 'boredom', (48 - n.fun.value) * 0.25 * curCushion, 'Low daily recreation / routine', clock, dateLabel);
  if (runway >= 2 || (c.roleLevel !== 'Unemployed' && c.performanceScore >= 72)) {
    applyEmotionPulse(em, 'hope', 3.5 + t.optimism * 0.05, 'Stable outlook and savings growth', clock, dateLabel);
  }
  if (martReputation < 45) applyEmotionPulse(em, 'anger', 2.5, 'Frustration with Vij Mart conditions', clock, dateLabel);

  if (clock.totalDays % 7 === 0) {
    const spike = EMOTION_META.map((m) => em[m.id]).find((row) => Math.abs(row.value) >= 75);
    if (spike) {
      events.push(makeCityEvent(clock, `emspk_${spike.id}_${c.id}`, {
        type: 'emotion-spike', citizenId: c.id, citizenName: c.name,
        title: `${spike.label} Spike`, detail: `${c.name} is experiencing intense ${spike.label.toLowerCase()} (${Math.round(spike.value)}).`,
      }));
    }
  }

  const snapVals = {} as Record<EmotionId, number>;
  for (const m of EMOTION_META) snapVals[m.id] = r1(em[m.id].value);
  c.emotionHistory = [...(c.emotionHistory ?? []).slice(-59), { totalDay: clock.totalDays, label: formatMonthYear(clock.month, clock.year), values: snapVals }];

  const posSum = em.joy.value * 0.42 + em.hope.value * 0.34 + em.gratitude.value * 0.24;
  const negRaw = em.sadness.value * 0.24 + em.anger.value * 0.17 + em.fear.value * 0.18 + em.loneliness.value * 0.14 + em.shame.value * 0.12 + em.envy.value * 0.07 + em.boredom.value * 0.08;
  const resDampen = 1 - (t.resilience - 50) * 0.003;
  const optMoodBias = (t.optimism - 50) * 0.12;
  return r1(clamp(54 + posSum * 0.55 - negRaw * 0.55 * resDampen + optMoodBias, 4, 98));
}
