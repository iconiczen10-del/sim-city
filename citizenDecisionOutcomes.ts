// citizenDecisionOutcomes.ts — Automatic 7-day and 30-day decision outcome evaluation and consequential diary logs

import { pushDecision, sumDecisionFactors } from './citizenDecisions';
import type { DecisionKind, DecisionOption, DecisionRecord, SignedFactor } from './citizenInspectorTypes';
import { appendLifeLog } from './citizenLedger';
import type { SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { Citizen } from './types';

function evaluateOutcome(c: Citizen, dec: DecisionRecord, clock: SimClock, windowDays: 7 | 30): { day: number; summary: string; worked: boolean } {
  const baseSavings = dec.baselineSavings ?? c.savings;
  const baseMood = dec.baselineMood ?? c.mood;
  const dSav = Math.round(c.savings - baseSavings);
  const dMood = Math.round((c.mood - baseMood) * 10) / 10;

  if (dec.kind === 'theft_choice') {
    const fed = c.hunger > 30 && c.thirst > 30;
    const caught = c.memories.some((m) => m.totalDay === dec.totalDay && m.kind === 'breakdown');
    return { day: clock.totalDays, worked: fed && !caught, summary: `${windowDays}d check: hunger ${Math.round(c.hunger)}/100, mood ${dMood >= 0 ? `+${dMood}` : dMood}.` };
  }
  if (dec.kind === 'job_choice' || dec.kind === 'help_choice') {
    const worked = c.savings >= baseSavings || c.mood >= baseMood - 2 || c.hunger > 50;
    return {
      day: clock.totalDays,
      worked,
      summary: `${windowDays}d check: savings ${dSav >= 0 ? `+${formatDelta(dSav)}` : formatDelta(dSav)}, mood ${dMood >= 0 ? `+${dMood}` : dMood}.`,
    };
  }
  const worked = c.hunger >= 35 && c.thirst >= 35 && (dSav >= -120 || dMood >= -3);
  return {
    day: clock.totalDays,
    worked,
    summary: `${windowDays}d result: savings ${dSav >= 0 ? `+${formatDelta(dSav)}` : formatDelta(dSav)}, mood ${dMood >= 0 ? `+${dMood}` : dMood}.`,
  };
}

export function stepCitizenDecisionOutcomes(c: Citizen, clock: SimClock): void {
  for (const dec of c.decisions) {
    if (!dec.outcome7d && clock.totalDays >= dec.totalDay + 7) {
      dec.outcome7d = evaluateOutcome(c, dec, clock, 7);
    }
    if (!dec.outcome30d && clock.totalDays >= dec.totalDay + 30) {
      dec.outcome30d = evaluateOutcome(c, dec, clock, 30);
    }
  }
}

export function recordConsequentialDecision(params: {
  citizen: Citizen;
  clock: SimClock;
  dateLabel: string;
  kind: DecisionKind;
  category: DecisionRecord['category'];
  title: string;
  chosenOption: string;
  altOption: string;
  chosenReason: string;
  chosenFactors: SignedFactor[];
  altFactors: SignedFactor[];
  diarySentence?: string;
}): DecisionRecord {
  const { citizen, clock, dateLabel, kind, category, title, chosenOption, altOption, chosenReason, chosenFactors, altFactors, diarySentence } = params;
  const options: DecisionOption[] = [
    { label: chosenOption, totalScore: sumDecisionFactors(chosenFactors), chosen: true, factors: chosenFactors },
    { label: altOption, totalScore: sumDecisionFactors(altFactors), chosen: false, factors: altFactors },
  ];
  const rec = pushDecision(citizen, {
    totalDay: clock.totalDays,
    dateLabel,
    kind,
    category,
    title,
    chosenOption,
    chosenReason,
    linkedMemoryIds: [],
    options,
  });
  if (diarySentence) {
    const logCat = kind === 'theft_choice' ? 'health' : kind === 'help_choice' ? 'gift' : 'money';
    appendLifeLog(citizen, clock.totalDays, dateLabel, logCat, diarySentence);
  }
  return rec;
}
