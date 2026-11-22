// citizenDecisions.ts — Core decision recording, factor summing, and standard/tier decision builders

import type {
  DecisionKind,
  DecisionRecord,
  SignedFactor,
} from './citizenInspectorTypes';
import { getMemorySignals, linkMemoriesToDecision } from './citizenMemory';
import { STANDARD_LABELS } from './formatters';
import type { LivingStandard, ShoppingCategory } from './martTypes';
import type { Citizen } from './types';

export function pushDecision(
  citizen: Citizen,
  record: Omit<DecisionRecord, 'id'>
): DecisionRecord {
  const full: DecisionRecord = {
    ...record,
    id: `dec_${record.totalDay}_${citizen.id}_${record.kind}_${Math.random().toString(36).slice(2, 6)}`,
  };
  citizen.decisions = [full, ...citizen.decisions].slice(0, 70);
  linkMemoriesToDecision(citizen, full.linkedMemoryIds, full.id);
  return full;
}

export function sumDecisionFactors(factors: SignedFactor[]): number {
  return Math.round(factors.reduce((s, f) => s + f.value, 0) * 10) / 10;
}

export function recordStandardOrTierDecision(params: {
  citizen: Citizen;
  totalDay: number;
  dateLabel: string;
  kind: Extract<DecisionKind, 'standard_choice' | 'downgrade_upgrade' | 'tier_change'>;
  category: ShoppingCategory | 'status';
  title: string;
  chosenOption: string;
  altOption: string;
  chosenReason: string;
  budgetVal: number;
  memVal: number;
  traitVal: number;
  urgencyOrStatusVal: number;
  altScoreDelta?: number;
  oldStd?: LivingStandard;
  newStd?: LivingStandard;
}): DecisionRecord {
  const {
    citizen, totalDay, dateLabel, kind, category, title, chosenOption, altOption,
    chosenReason, budgetVal, memVal, traitVal, urgencyOrStatusVal, altScoreDelta = -12,
  } = params;
  const mem = getMemorySignals(citizen);
  const factors: SignedFactor[] = [
    { label: 'Budget & Savings', value: Math.round(budgetVal) },
    { label: 'Active Memories & Shield', value: Math.round(memVal) },
    { label: 'Traits & Stress', value: Math.round(traitVal) },
    { label: category === 'status' ? 'Score Trajectory' : 'Need & Price Impact', value: Math.round(urgencyOrStatusVal) },
  ];
  const score = sumDecisionFactors(factors);
  const altFactors: SignedFactor[] = [{ label: 'Alternative Baseline', value: Math.round(score + altScoreDelta) }];
  const linked = mem.recentLossOrStockoutIds.length > 0 ? mem.recentLossOrStockoutIds : mem.positiveIds;

  return pushDecision(citizen, {
    totalDay,
    dateLabel,
    kind,
    category,
    title: params.oldStd && params.newStd
      ? `${title}: ${STANDARD_LABELS[params.oldStd]} → ${STANDARD_LABELS[params.newStd]}`
      : title,
    chosenOption,
    chosenReason,
    linkedMemoryIds: linked,
    options: [
      { label: chosenOption, totalScore: score, chosen: true, factors },
      { label: altOption, totalScore: sumDecisionFactors(altFactors), chosen: false, factors: altFactors },
    ],
  });
}
