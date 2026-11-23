// citizenSurvivalEngine.ts — Daily 8-need survival priority ladder, survival state, and high/low instinct overrides

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { applyEmotionPulse } from './citizenEmotions';
import { appendChangeExplanation } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import type { NeedId, SurvivalPriorityEntry, SurvivalState } from './citizenRealTypes';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import type { SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { simPick, simRand } from './rng';
import { estimateMonthlyShoppingCost } from './standards';
import type { Citizen } from './types';

const LADDER_ORDER: NeedId[] = ['thirst', 'hunger', 'energy', 'shelter', 'hygiene', 'safety', 'social', 'fun'];
const LADDER_WEIGHT: Record<NeedId, number> = {
  thirst: 1.5, hunger: 1.35, energy: 1.15, shelter: 1.0, hygiene: 0.85, safety: 0.8, social: 0.7, fun: 0.55,
};

export function evaluateSurvivalLadder(c: Citizen): { ladder: SurvivalPriorityEntry[]; state: SurvivalState } {
  const siBoost = 0.7 + (c.traits.survivalInstinct / 100) * 0.75;
  const ladder = LADDER_ORDER.map((id, idx) => {
    const need = c.needs[id];
    const urgency = Math.round((100 - need.value) * LADDER_WEIGHT[id] + (8 - idx) * 2);
    const amplifiedUrgency = Math.round(urgency * (idx < 3 ? siBoost : 1));
    return { needId: id, name: need.name, value: need.value, urgency, amplifiedUrgency };
  }).sort((a, b) => b.amplifiedUrgency - a.amplifiedUrgency);

  const worst = Math.min(c.thirst, c.hunger, c.needs.energy.value, c.healthProfile.physical, c.healthProfile.mental);
  const fixed = calculateFixedMonthlyCosts(c.homeType).total + estimateMonthlyShoppingCost(c.standards);
  const runway = fixed > 0 ? c.savings / fixed : 0;

  let state: SurvivalState = 'Stable';
  if (worst < 12 || (c.savings <= 0 && worst < 28)) state = 'Desperate';
  else if (worst < 28 || runway < 0.25) state = 'Critical';
  else if (worst < 52 || runway < 0.8 || c.rentArrears > 0) state = 'Struggling';
  else if (worst >= 72 && runway >= 2.5 && c.mood >= 62) state = 'Thriving';

  c.survivalPriority = ladder;
  c.survivalState = state;
  return { ladder, state };
}

export function applySurvivalInstinctBehavior(
  c: Citizen,
  allCitizens: Citizen[],
  clock: SimClock,
  dateLabel: string
): void {
  const { state } = evaluateSurvivalLadder(c);

  // High survival instinct overrides pride when desperate/critical
  if (c.traits.survivalInstinct > 70 && (state === 'Desperate' || state === 'Critical')) {
    if (c.standards.food > 1 || c.standards.water > 1) {
      const prev = c.standards.food;
      c.standards = { food: 1, water: 1, clothes: 1, household: 1 };
      const dec = recordConsequentialDecision({
        citizen: c, clock, dateLabel, kind: 'downgrade_upgrade', category: 'survival',
        title: 'Emergency Survival Standard Cut', chosenOption: 'Cut All Standards to L1', altOption: `Keep L${prev} Pride`,
        chosenReason: `Survival instinct (${c.traits.survivalInstinct}) overrode pride during ${state.toLowerCase()} need crisis.`,
        chosenFactors: [{ label: 'Survival Instinct', value: Math.round(c.traits.survivalInstinct * 0.5) }, { label: 'Critical Need', value: 35 }],
        altFactors: [{ label: 'Pride Pull', value: Math.round(c.traits.pride * 0.35 - 35) }],
        diarySentence: `Swallowed my pride and dropped all living standards to L1 to survive.`,
      });
      appendChangeExplanation(c, clock.totalDays, dateLabel, 'standard_downgrade', `Survival instinct forced L1 cut during ${state.toLowerCase()} state.`, dec.id);
    }

    if ((c.hunger < 20 || c.thirst < 20) && c.savings <= 35 && c.giftShieldDays === 0 && simRand() < 0.45) {
      const helpers = allCitizens.filter((o) => o.alive && o.id !== c.id && o.savings >= 1200 && o.traits.kindness >= 58);
      if (helpers.length > 0) {
        const helper = simPick(helpers);
        const gift = Math.min(45, Math.round(helper.savings * 0.015));
        helper.savings = Math.round((helper.savings - gift) * 100) / 100;
        c.savings = Math.round((c.savings + gift) * 100) / 100;
        c.giftShieldDays = 2;
        addCitizenMemory(c, clock, dateLabel, 'helped', `${helper.name} shared ${formatDelta(gift)} during an emergency.`, 26);
        applyEmotionPulse(c.emotions, 'gratitude', 16, `Emergency help from ${helper.name}`, clock, dateLabel);
        applyEmotionPulse(c.emotions, 'shame', (c.traits.pride - 30) * 0.14, 'Had to ask for help', clock, dateLabel);
        recordConsequentialDecision({
          citizen: c, clock, dateLabel, kind: 'help_choice', category: 'social',
          title: 'Ask Neighbor for Emergency Help', chosenOption: `Asked ${helper.name} (+${formatDelta(gift)})`, altOption: 'Suffer Alone',
          chosenReason: `Survival instinct (${c.traits.survivalInstinct}) outweighed pride (${c.traits.pride}) with ∆${Math.round(c.savings)} cash.`,
          chosenFactors: [{ label: 'Survival Need', value: 45 }, { label: 'Pride Resistance', value: -Math.round(c.traits.pride * 0.25) }],
          altFactors: [{ label: 'Pride Preservation', value: Math.round(c.traits.pride * 0.2 - 35) }],
          diarySentence: `Asked ${helper.name} for help and received ${formatDelta(gift)} for food and water.`,
        });
      }
    }
  } else if (c.traits.survivalInstinct < 30 && c.traits.pride > 58 && c.savings < 120 && c.standards.food >= 3 && clock.totalDays % 7 === 0) {
    // Low survival instinct neglects urgent conservation out of status/pride
    c.needs.fun.value = clamp(c.needs.fun.value - 2, 0, 100);
    recordConsequentialDecision({
      citizen: c, clock, dateLabel, kind: 'budget_skip', category: 'status',
      title: 'Refused to Downgrade Standards', chosenOption: `Keep L${c.standards.food} Status`, altOption: 'Cut to L1 to Save Cash',
      chosenReason: `Low survival instinct (${c.traits.survivalInstinct}) and high pride (${c.traits.pride}) refused cuts despite low cash.`,
      chosenFactors: [{ label: 'Pride & Image', value: Math.round(c.traits.pride * 0.45) }, { label: 'Low Survival Drive', value: 18 }],
      altFactors: [{ label: 'Budget Prudence', value: Math.round(c.traits.thriftiness * 0.3 - 10) }],
    });
  }
}
