// monthlyCitizenStep.ts — Per-citizen month-end salary settlement, taxes, fixed bills, standards, and tier updates

import { recordStandardOrTierDecision } from './citizenDecisions';
import { appendChangeExplanation, appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { calculateFixedMonthlyCosts, calculateMarginalTax, selectHomeType } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { CATEGORY_LABELS, formatDelta, formatMonthYear, formatSimDate, HOME_LABELS } from './formatters';
import type { LivingStandard } from './martTypes';
import { applyMonthlyStatusAndTier, checkMonthlyMilestones } from './monthlyTierUpdate';
import { chooseLivingStandards } from './standards';
import type { Citizen, CityEvent, TierMovement } from './types';

export function processLivingCitizenMonthEnd(
  citizen: Citizen,
  payOverride: { grossPay: number; tax: number; payRatio: number } | undefined,
  clock: SimClock,
  events: CityEvent[],
  movements: TierMovement[]
): { updated: Citizen; taxPaid: number } {
  const dateLabel = formatSimDate(clock.day, clock.month, clock.year);
  const grossPay = payOverride ? payOverride.grossPay : 0;
  const tax = payOverride ? payOverride.tax : calculateMarginalTax(grossPay);
  const netPay = grossPay - tax;
  const homeType = selectHomeType(netPay, citizen.savings, citizen.traits.greed, citizen.traits.discipline);
  const fixed = calculateFixedMonthlyCosts(homeType);

  appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'income', 'Salary', `${citizen.roleLevel} Monthly Pay`, grossPay);
  appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'expense', 'Tax', 'Marginal Income Tax', tax);
  appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'expense', 'Housing', `Rent (${HOME_LABELS[homeType]})`, fixed.rent);
  appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'expense', 'Fixed Living', 'Transport, Utilities, Health, Net', fixed.nonRent);
  appendLifeLog(citizen, clock.totalDays, dateLabel, 'money', `Payday +${formatDelta(netPay)} net; paid ${formatDelta(fixed.total)} rent & bills.`);

  const rawBalance = citizen.savings + netPay - fixed.total;
  const hitZero = rawBalance <= 0 && citizen.savings > 0;
  const unableToPay = rawBalance < 0;
  const savings = Math.max(0, Math.round(rawBalance));
  const mood = unableToPay ? Math.max(0, Math.round((citizen.mood - 12) * 10) / 10) : citizen.mood;

  if (hitZero || unableToPay) {
    addCitizenMemory(citizen, clock, dateLabel, 'broke', `Ran out of money after ${formatDelta(fixed.total)} monthly bills.`, -38);
    if (hitZero) {
      events.push(makeCityEvent(clock, `zero_${citizen.id}`, {
        type: 'money', citizenId: citizen.id, citizenName: citizen.name,
        title: 'Savings Depleted', detail: `${citizen.name} hit ∆0 after fixed monthly costs of ${formatDelta(fixed.total)}.`,
      }));
    }
  }

  const highestMilestone = checkMonthlyMilestones(citizen, savings, clock, events);
  const nextStandards = chooseLivingStandards({
    roleLevel: citizen.roleLevel, netPay, savings, homeType, traits: citizen.traits, allowImpulse: true,
  });
  if (citizen.giftShieldDays > 0 && nextStandards.food < citizen.standards.food) nextStandards.food = citizen.standards.food;

  const draft: Citizen = { ...citizen, savings, standards: nextStandards };
  if (nextStandards.food !== citizen.standards.food) {
    const down = nextStandards.food < citizen.standards.food;
    const dec = recordStandardOrTierDecision({
      citizen: draft, totalDay: clock.totalDays, dateLabel,
      kind: down ? 'downgrade_upgrade' : 'standard_choice', category: 'food',
      title: `Month-End ${CATEGORY_LABELS.food} Standard`,
      chosenOption: `Set Food to L${nextStandards.food}`, altOption: `Keep L${citizen.standards.food}`,
      chosenReason: down ? `Adjusted down after net pay ${formatDelta(netPay)} and savings ${formatDelta(savings)}.` : `Affordability allowed upgrade with savings ${formatDelta(savings)}.`,
      budgetVal: down ? -18 : 22, memVal: citizen.giftShieldDays > 0 ? 10 : 0,
      traitVal: Math.round((citizen.traits.discipline - 50) * 0.2), urgencyOrStatusVal: down ? 16 : 12,
      oldStd: citizen.standards.food as LivingStandard, newStd: nextStandards.food as LivingStandard,
    });
    if (down) appendChangeExplanation(draft, clock.totalDays, dateLabel, 'standard_downgrade', `Month-end ${CATEGORY_LABELS.food} cut L${citizen.standards.food} → L${nextStandards.food}.`, dec.id);
  }

  const tierRes = applyMonthlyStatusAndTier(draft, grossPay, netPay, fixed.total, unableToPay, clock, events, movements);
  return {
    taxPaid: tax,
    updated: {
      ...draft, mood, respect: tierRes.respect, statusScore: tierRes.statusScore, tier: tierRes.tier, homeType,
      lastGrossPay: grossPay, lastTax: tax, lastFixedCosts: fixed.total, highestMilestone,
      history: [...citizen.history.slice(-59), { totalDay: clock.totalDays, label: formatMonthYear(clock.month, clock.year), savings, mood, statusScore: tierRes.statusScore }],
    },
  };
}
