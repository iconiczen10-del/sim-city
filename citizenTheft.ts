// citizenTheft.ts — Rare desperate food/water stealing between citizens with caught/uncaught consequences

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { applyEmotionPulse } from './citizenEmotions';
import { appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { recordSimEvent } from './recordsStore';
import { simPick, simRand, simRandInt } from './rng';
import { adjustAffinity } from './sharityAffinity';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

export function maybeAttemptDesperateTheft(params: {
  thief: Citizen;
  allCitizens: Citizen[];
  sharity: SharityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { thief, allCitizens, sharity, clock, dateLabel, events } = params;
  const homeless = thief.homeId === null;
  if (homeless) {
    if (thief.savings > 20 || (thief.hunger >= 22 && thief.thirst >= 22)) return;
    if (thief.traits.honesty >= 52 || thief.traits.riskTolerance <= 38 || thief.traits.survivalInstinct <= 45) return;
  } else {
    if (thief.savings > 0 || (thief.hunger >= 10 && thief.thirst >= 10)) return;
    if (thief.traits.honesty >= 35 || thief.traits.riskTolerance <= 55 || thief.traits.survivalInstinct <= 60) return;
  }

  const recentTheft = thief.decisions.some((d) => d.kind === 'theft_choice' && clock.totalDays - d.totalDay < (homeless ? 5 : 10));
  if (recentTheft) return;

  const targets = allCitizens.filter((o) =>
    o.alive && o.id !== thief.id && (o.inventory.food.reduce((s, b) => s + b.meals, 0) >= 2 || o.inventory.water.reduce((s, w) => s + w.days, 0) >= 1)
  );
  if (targets.length === 0) return;

  const target = simPick(targets);
  const stealFood = thief.hunger <= thief.thirst;
  let stolenDesc = '';
  if (stealFood && target.inventory.food.length > 0) {
    const qty = Math.min(simRandInt(1, 3), target.inventory.food[0].meals);
    target.inventory.food[0].meals -= qty;
    target.inventory.food = target.inventory.food.filter((b) => b.meals > 0);
    thief.inventory.food.push({ standard: 1, meals: qty, daysOld: 0 });
    thief.hunger = clamp(thief.hunger + qty * 14, 0, 100);
    stolenDesc = `${qty} meal(s)`;
  } else if (target.inventory.water.length > 0) {
    const qty = Math.min(simRandInt(1, 2), target.inventory.water[0].days);
    target.inventory.water[0].days -= qty;
    target.inventory.water = target.inventory.water.filter((w) => w.days > 0);
    thief.inventory.water.push({ standard: 1, days: qty });
    thief.thirst = clamp(thief.thirst + qty * 38, 0, 100);
    stolenDesc = `${qty}d water`;
  } else return;

  events.push(makeCityEvent(clock, `theft_try_${thief.id}`, {
    type: 'theft-attempt', citizenId: thief.id, citizenName: thief.name,
    title: 'Desperate Theft Attempt', detail: `${thief.name} crept into ${target.name}'s pantry for ${stolenDesc}.`,
  }));

  const catchProb = clamp(0.2 + target.traits.curiosity * 0.003 + target.traits.courage * 0.003, 0.25, 0.85);
  const caught = simRand() < catchProb;

  recordConsequentialDecision({
    citizen: thief, clock, dateLabel, kind: 'theft_choice', category: 'survival',
    title: `Steal ${stolenDesc} from Neighbor`,
    chosenOption: caught ? `Stole ${stolenDesc} (Caught!)` : `Stole ${stolenDesc} (Unnoticed)`,
    altOption: 'Go Without Food/Water',
    chosenReason: `Desperate need (savings ∆0, honesty ${thief.traits.honesty}, risk ${thief.traits.riskTolerance}, survival ${thief.traits.survivalInstinct}).`,
    chosenFactors: [{ label: 'Survival Urgency', value: 48 }, { label: 'Risk Tolerance', value: Math.round(thief.traits.riskTolerance * 0.35) }, { label: 'Low Honesty', value: Math.round((50 - thief.traits.honesty) * 0.5) }],
    altFactors: [{ label: 'Honesty Pull', value: Math.round(thief.traits.honesty - 40) }],
    diarySentence: caught ? `Tried to steal ${stolenDesc} from ${target.name} and got caught.` : `Desperately took ${stolenDesc} from ${target.name} unnoticed.`,
  });

  if (caught) {
    applyEmotionPulse(target.emotions, 'anger', 36, `Caught ${thief.name} stealing ${stolenDesc}`, clock, dateLabel);
    applyEmotionPulse(thief.emotions, 'shame', 34 + thief.traits.pride * 0.15, `Caught stealing from ${target.name}`, clock, dateLabel);
    applyEmotionPulse(thief.emotions, 'fear', 26, 'Caught committing theft', clock, dateLabel);
    addCitizenMemory(target, clock, dateLabel, 'theft_victim', `Caught ${thief.name} stealing ${stolenDesc}.`, -32);
    addCitizenMemory(thief, clock, dateLabel, 'breakdown', `Humiliated after getting caught stealing from ${target.name}.`, -36);
    adjustAffinity(sharity, target.id, thief.id, -45);
    adjustAffinity(sharity, thief.id, target.id, -22);
    if (thief.employerId && thief.employerId === target.employerId) {
      thief.bossRelationship = Math.round(clamp(thief.bossRelationship - 12, -100, 100));
    }
    appendLifeLog(target, clock.totalDays, dateLabel, 'loss', `Caught ${thief.name} stealing ${stolenDesc}!`);
    events.push(makeCityEvent(clock, `theft_cat_${thief.id}_${target.id}`, {
      type: 'theft-caught', citizenId: thief.id, citizenName: thief.name,
      title: 'Theft Caught', detail: `${target.name} caught ${thief.name} taking ${stolenDesc}; trust shattered.`,
    }));
  } else {
    thief.traits.honesty = Math.max(2, Math.round(thief.traits.honesty - 1.5));
    addCitizenMemory(thief, clock, dateLabel, 'theft_guilt', `Felt guilty taking ${stolenDesc} unseen.`, -12);
    appendLifeLog(target, clock.totalDays, dateLabel, 'loss', `Noticed ${stolenDesc} missing; assumed spoilage or Vij Mart short-weight.`);
  }
  recordSimEvent({
    simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'theft',
    subjectId: thief.id, subjectKind: 'citizen', subjectName: thief.name,
    summary: `${thief.name} stole ${stolenDesc} from ${target.name} (${caught ? 'Caught' : 'Undetected'})`,
    detail: { thiefId: thief.id, victimId: target.id, victimName: target.name, stolenDesc, caught, catchProb: Math.round(catchProb * 100) / 100, homeless },
  });
}
