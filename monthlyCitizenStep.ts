// monthlyCitizenStep.ts — Per-citizen month-end salary settlement, taxes, fixed bills, standards, and tier updates

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { recordStandardOrTierDecision } from './citizenDecisions';
import { appendChangeExplanation, appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { calculateFixedMonthlyCosts, calculateMarginalTax, selectHomeType } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { CATEGORY_LABELS, formatDelta, formatMonthYear, formatSimDate, HOME_LABELS } from './formatters';
import type { LivingStandard } from './martTypes';
import { applyMonthlyStatusAndTier, checkMonthlyMilestones } from './monthlyTierUpdate';
import { chooseLivingStandards, getCategoryMonthlyCost } from './standards';
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

  const survivalReserve = Math.round(getCategoryMonthlyCost('food', 1) + getCategoryMonthlyCost('water', 1));
  const afterTaxCash = citizen.savings + netPay;
  const availableForBills = Math.max(0, afterTaxCash - survivalReserve);
  const nonRentPaid = Math.min(availableForBills, fixed.nonRent);
  const remAfterNonRent = Math.max(0, availableForBills - nonRentPaid);
  const hasRealHousing = citizen.homeId !== undefined;
  const rentDue = hasRealHousing ? 0 : fixed.rent + citizen.rentArrears;
  const rentPaid = Math.min(remAfterNonRent, rentDue);
  const rentArrears = hasRealHousing ? citizen.rentArrears : Math.round(Math.max(0, rentDue - rentPaid));
  const totalPaidBills = Math.round(nonRentPaid + rentPaid);

  appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'income', 'Salary', `${citizen.roleLevel} Monthly Pay`, grossPay);
  appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'expense', 'Tax', 'Marginal Income Tax', tax);
  if (!hasRealHousing) appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'expense', 'Housing', `Rent (${HOME_LABELS[homeType]})`, rentPaid);
  appendLedgerEntry(citizen, clock.totalDays, dateLabel, 'expense', 'Fixed Living', 'Transport, Utilities, Health, Net', nonRentPaid);
  appendLifeLog(citizen, clock.totalDays, dateLabel, 'money', `Payday +${formatDelta(netPay)} net; paid ${formatDelta(totalPaidBills)} fixed bills.`);

  const savings = Math.max(0, Math.round(afterTaxCash - totalPaidBills));
  const hitZero = savings <= 0 && citizen.savings > 0;
  const unableToPay = (!hasRealHousing && rentArrears > 0) || nonRentPaid < fixed.nonRent;
  const mood = unableToPay ? Math.max(0, Math.round((citizen.mood - 10) * 10) / 10) : citizen.mood;

  if (hitZero || unableToPay) {
    const detail = rentArrears > 0
      ? `Rent fell into ${formatDelta(rentArrears)} arrears while protecting food & water money.`
      : `Ran out of money after ${formatDelta(totalPaidBills)} monthly bills.`;
    addCitizenMemory(citizen, clock, dateLabel, 'broke', detail, -34);
    if (hitZero || rentArrears >= fixed.rent) {
      events.push(makeCityEvent(clock, `zero_${citizen.id}`, {
        type: 'money', citizenId: citizen.id, citizenName: citizen.name,
        title: rentArrears > 0 ? 'Rent Arrears' : 'Savings Depleted',
        detail: rentArrears > 0 ? `${citizen.name} kept food/water money and owes ${formatDelta(rentArrears)} rent.` : `${citizen.name} hit ∆0 after monthly bills.`,
      }));
    }
  }

  const highestMilestone = checkMonthlyMilestones(citizen, savings, clock, events);
  const nextStandards = chooseLivingStandards({
    roleLevel: citizen.roleLevel, netPay, savings, homeType, traits: citizen.traits, allowImpulse: true,
  });
  if (citizen.giftShieldDays > 0 && nextStandards.food < citizen.standards.food) nextStandards.food = citizen.standards.food;

  const draft: Citizen = { ...citizen, savings, rentArrears, standards: nextStandards };
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
  if (!hasRealHousing && homeType !== citizen.homeType) {
    recordConsequentialDecision({
      citizen: draft, clock, dateLabel, kind: 'downgrade_upgrade', category: 'housing',
      title: 'Housing Adjustment', chosenOption: `Move to ${HOME_LABELS[homeType]}`, altOption: `Stay in ${HOME_LABELS[citizen.homeType]}`,
      chosenReason: `Adjusted housing based on net pay ${formatDelta(netPay)} and savings ${formatDelta(savings)}.`,
      chosenFactors: [{ label: 'Housing Budget', value: 20 }, { label: 'Pride', value: Math.round((citizen.traits.pride ?? 50) * 0.2) }],
      altFactors: [{ label: 'Status Continuity', value: 12 }],
      diarySentence: `Moved from ${HOME_LABELS[citizen.homeType]} to ${HOME_LABELS[homeType]}.`,
    });
  }

  const tierRes = applyMonthlyStatusAndTier(draft, grossPay, netPay, totalPaidBills, unableToPay, clock, events, movements);
  return {
    taxPaid: tax,
    updated: {
      ...draft, mood, respect: tierRes.respect, statusScore: tierRes.statusScore, tier: tierRes.tier, homeType,
      lastGrossPay: grossPay, lastTax: tax, lastFixedCosts: totalPaidBills, highestMilestone,
      history: [...citizen.history.slice(-59), { totalDay: clock.totalDays, label: formatMonthYear(clock.month, clock.year), savings, mood, statusScore: tierRes.statusScore }],
    },
  };
}
