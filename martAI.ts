// martAI.ts — Trait-driven category margin mood selection and daily SKU pricing

import { MOOD_MARGIN_RANGES, SHOPPING_CATEGORIES } from './constants';
import { makeCityEvent, type SimClock } from './eventFactory';
import { CATEGORY_LABELS, MOOD_META } from './formatters';
import { getManagerTraitProfile, getMartFloorManager, type MartManagerTraits } from './martManager';
import { computeSkuPrice } from './martPricing';
import type { CategoryMoodState, MarginMood, MartState, ShoppingCategory } from './martTypes';
import { simRand, simRandInt } from './rng';
import type { Citizen, CityEvent } from './types';

const MOOD_LADDER: MarginMood[] = ['clearance', 'generous', 'good', 'typical', 'greedy', 'gouging'];
const WATER_MOOD_LADDER: MarginMood[] = ['good', 'typical', 'greedy', 'gouging'];

function shiftMoodGreedier(mood: MarginMood, cat: ShoppingCategory): MarginMood {
  const ladder = cat === 'water' ? WATER_MOOD_LADDER : MOOD_LADDER;
  const idx = ladder.indexOf(mood);
  if (idx === -1) return 'typical';
  return ladder[Math.min(ladder.length - 1, idx + 1)];
}

function pickCategoryMood(
  mart: MartState,
  cat: ShoppingCategory,
  avgDaysLeft: number,
  avgCitizenMood: number,
  profile: MartManagerTraits
): { state: CategoryMoodState; traitNote: string } {
  if (profile.kindnessOverride && avgCitizenMood < 40) {
    const picked: MarginMood = cat === 'water' ? 'good' : 'generous';
    const finalMood = profile.resentfulMood ? shiftMoodGreedier(picked, cat) : picked;
    const [minM, maxM] = MOOD_MARGIN_RANGES[finalMood];
    return {
      state: { mood: finalMood, marginPct: Math.round(((minM + maxM) / 2) * 100), daysRemaining: 2, reason: 'Kindness eased margins during low city mood' },
      traitNote: 'Kindness trait >65',
    };
  }
  if (avgDaysLeft < 1.6 || (mart.cash < 1600 && avgDaysLeft < 4)) {
    const pct = mart.personality.style === 'aggressive' ? 120 : 112;
    return {
      state: { mood: 'gouging', marginPct: pct, daysRemaining: 2, reason: avgDaysLeft < 1.6 ? 'Severe scarcity' : 'Cash crisis' },
      traitNote: 'Scarcity pricing response',
    };
  }
  if (avgDaysLeft > 8 && cat !== 'water' && cat !== 'clothes') {
    const [minM, maxM] = MOOD_MARGIN_RANGES.clearance;
    return {
      state: { mood: 'clearance', marginPct: Math.round(((minM + maxM) / 2) * 100), daysRemaining: 2, reason: 'Surplus stock >8d supply' },
      traitNote: 'Overstock clearance >8d',
    };
  }

  const baseTypical = Math.max(20, 55 - profile.greedyBonus - profile.gougingBonus);
  const weights: [MarginMood, number, string][] = cat === 'water'
    ? [
        ['typical', baseTypical, 'Routine market conditions'],
        ['good', 20 + profile.generousBonus + (mart.reputation > 72 ? 4 : 0), 'Steady city supply'],
        ['greedy', 15 + profile.greedyBonus, 'Strong water demand'],
        ['gouging', 5 + profile.gougingBonus, 'Opportunistic markup'],
      ]
    : [
        ['typical', baseTypical, 'Routine market conditions'],
        ['good', 15 + (mart.reputation > 72 ? 4 : 0), 'Steady city supply'],
        ['greedy', 12 + profile.greedyBonus, 'Strong shopper demand'],
        ['generous', 8 + profile.generousBonus + (mart.reputation < 50 ? 5 : 0), 'Reputation & city goodwill'],
        ['clearance', avgDaysLeft > 8 ? 5 : 0, 'Surplus rotation discount'],
        ['gouging', 5 + profile.gougingBonus, 'Opportunistic markup'],
      ];

  const total = weights.reduce((s, w) => s + w[1], 0);
  let roll = simRand() * total;
  let picked = weights[0];
  for (const w of weights) {
    roll -= w[1];
    if (roll <= 0) { picked = w; break; }
  }
  const finalMood = profile.resentfulMood ? shiftMoodGreedier(picked[0], cat) : picked[0];
  const [minM, maxM] = MOOD_MARGIN_RANGES[finalMood];
  const pct = Math.round(((minM + maxM) / 2) * 100);
  const traitNote = profile.resentfulMood ? 'Low mood (<40) resentment shift' : profile.greedyBonus > 0 ? 'Greed trait >70' : profile.generousBonus > 0 ? 'Low greed (<30)' : 'Routine market balance';
  return {
    state: { mood: finalMood, marginPct: pct, daysRemaining: 2 + simRandInt(0, 2), reason: profile.resentfulMood ? `${picked[2]} (resentment shift)` : picked[2] },
    traitNote,
  };
}

export function updateMartMoodsAndPrices(
  mart: MartState,
  citizens: Citizen[],
  avgCitizenSavings: number,
  avgCitizenMood: number,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[],
  outsideSupplierActive = false
): void {
  const manager = getMartFloorManager(citizens);
  const profile = getManagerTraitProfile(manager);
  const delayRate = mart.totalDeliveryCount > 0 ? mart.lateDeliveryCount / mart.totalDeliveryCount : 0;

  for (const cat of SHOPPING_CATEGORIES) {
    const items = mart.stock.filter((s) => s.category === cat);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const totalForecast = items.reduce((s, i) => s + i.dailyForecast, 0);
    const avgDaysLeft = totalQty / Math.max(0.5, totalForecast);

    const current = mart.categoryMoods[cat];
    const urgent = avgDaysLeft < 1.5 || mart.cash < 1500;
    if (current.daysRemaining <= 1 || urgent || (cat === 'water' && current.mood === 'clearance')) {
      const { state: next, traitNote } = pickCategoryMood(mart, cat, avgDaysLeft, avgCitizenMood, profile);
      if (next.mood !== current.mood) {
        events.push(makeCityEvent(clock, `moodchg_${cat}`, {
          type: 'mood-change',
          title: `Mart Mood: ${CATEGORY_LABELS[cat]} → ${MOOD_META[next.mood].label}`,
          detail: `${profile.managerName} shifted ${CATEGORY_LABELS[cat]} to ${MOOD_META[next.mood].label} (${next.marginPct}%): ${next.reason}.`,
        }));
        mart.decisionLog.unshift({
          id: `dec_m_${clock.totalDays}_${cat}`,
          dateLabel,
          category: cat,
          managerName: profile.managerName,
          summary: `${profile.managerName} set ${CATEGORY_LABELS[cat]} mood → ${MOOD_META[next.mood].label}`,
          reason: `${next.reason} (${traitNote}).`,
        });
      }
      mart.categoryMoods[cat] = next;
    } else {
      current.daysRemaining -= 1;
    }

    const moodState = mart.categoryMoods[cat];
    const override = mart.overrides[cat];
    if (override) {
      override.daysLeft -= 1;
      if (override.daysLeft <= 0) delete mart.overrides[cat];
    }
    for (const item of items) {
      item.sellPrice = computeSkuPrice(item, moodState, mart, avgCitizenSavings, avgCitizenMood, delayRate, override, outsideSupplierActive);
    }
  }
}
