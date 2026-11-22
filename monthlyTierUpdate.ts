// monthlyTierUpdate.ts — Monthly milestones, respect, status score, hysteresis, and tier explanations

import { recordStandardOrTierDecision } from './citizenDecisions';
import { appendChangeExplanation } from './citizenLedger';
import { SAVINGS_MILESTONES } from './constants';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta, formatMonthYear, formatSimDate } from './formatters';
import { computeTargetStatusScore, evaluateTierWithHysteresis, stepMonthlyStatusScore } from './status';
import type { Citizen, CityEvent, TierMovement } from './types';

export function checkMonthlyMilestones(
  citizen: Citizen,
  savings: number,
  clock: SimClock,
  events: CityEvent[]
): number {
  let highestMilestone = citizen.highestMilestone;
  for (const m of SAVINGS_MILESTONES) {
    if (savings >= m && highestMilestone < m) {
      highestMilestone = m;
      events.push(makeCityEvent(clock, `mile_${citizen.id}_${m}`, {
        type: 'money', citizenId: citizen.id, citizenName: citizen.name,
        title: 'Savings Milestone', detail: `${citizen.name} crossed ${formatDelta(m)} in personal savings.`,
      }));
    }
  }
  return highestMilestone;
}

export function applyMonthlyStatusAndTier(
  citizen: Citizen,
  grossPay: number,
  netPay: number,
  fixedCosts: number,
  unableToPay: boolean,
  clock: SimClock,
  events: CityEvent[],
  movements: TierMovement[]
): { respect: number; statusScore: number; tier: Citizen['tier'] } {
  const visiblePrestige = (citizen.standards.clothes >= 4 ? 0.2 : 0) + (citizen.standards.food >= 4 ? 0.1 : 0);
  const respectDelta = (unableToPay ? -0.4 : netPay > fixedCosts ? 0.2 : 0) + visiblePrestige;
  const respect = Math.round(Math.max(5, Math.min(99, citizen.respect + respectDelta)) * 10) / 10;

  const targetScore = computeTargetStatusScore({ savings: citizen.savings, roleLevel: citizen.roleLevel, respect }, grossPay);
  const statusScore = stepMonthlyStatusScore(citizen.statusScore, targetScore);
  const nextTier = evaluateTierWithHysteresis(citizen.tier, statusScore);

  if (nextTier !== citizen.tier) {
    const direction = nextTier < citizen.tier ? 'up' : 'down';
    const dateLabel = formatSimDate(clock.day, clock.month, clock.year);
    const dec = recordStandardOrTierDecision({
      citizen, totalDay: clock.totalDays, dateLabel, kind: 'tier_change', category: 'status',
      title: `Tier ${direction === 'up' ? 'Promotion' : 'Demotion'} (${citizen.tier} → ${nextTier})`,
      chosenOption: `Move to ${nextTier}`, altOption: `Remain ${citizen.tier}`,
      chosenReason: `Status score reached ${statusScore.toFixed(1)} (target ${targetScore.toFixed(1)}, ±2 monthly cap, ±3 hysteresis).`,
      budgetVal: direction === 'up' ? 20 : -20, memVal: 0, traitVal: Math.round((respect - 50) * 0.2), urgencyOrStatusVal: Math.round(statusScore - citizen.statusScore),
    });
    appendChangeExplanation(citizen, clock.totalDays, dateLabel, 'tier_change', `Tier shifted ${citizen.tier} → ${nextTier} at score ${statusScore.toFixed(1)}.`, dec.id);

    movements.push({
      citizenId: citizen.id, citizenName: citizen.name, fromTier: citizen.tier, toTier: nextTier,
      direction, statusScore, monthLabel: formatMonthYear(clock.month, clock.year),
    });
    events.push(makeCityEvent(clock, `tier_${citizen.id}`, {
      type: 'tier', citizenId: citizen.id, citizenName: citizen.name,
      title: direction === 'up' ? 'Tier Promotion' : 'Tier Demotion',
      detail: `${citizen.name} moved ${direction} from ${citizen.tier} to ${nextTier} (score ${statusScore.toFixed(1)}).`,
    }));
  }

  return { respect, statusScore, tier: nextTier };
}
