// housingDecisions.ts — 30-day and event-triggered housing evaluations, upgrade/downgrade choices, and move decisions

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { applyEmotionPulse } from './citizenEmotions';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { HOUSE_SPECS } from './housingCatalog';
import { computeHousingSatisfaction, HOME_TYPE_ORDER, seedHousingPreferences, stepAnnualPreferenceDrift } from './housingPreferences';
import { getTenantMonthlyRent } from './housingScores';
import type { House, HousingState } from './housingTypes';
import type { SharityState } from './sharityTypes';
import type { Citizen } from './types';

export function getMoveCost(from: House | undefined, to: House): number {
  if (!from) return 0;
  return from.district === to.district ? 70 : 160;
}

export function evaluateCitizenHousingDecisions(params: {
  citizens: Citizen[];
  housing: HousingState;
  sharity: SharityState;
  clock: SimClock;
  dateLabel: string;
}): void {
  const { citizens, housing, sharity, clock, dateLabel } = params;
  const byHouse = new Map(housing.houses.map((h) => [h.id, h]));

  for (const c of citizens) {
    if (!c.alive) continue;
    if (!c.housingPrefs) c.housingPrefs = seedHousingPreferences(c);
    const house = c.homeId ? byHouse.get(c.homeId) : undefined;
    stepAnnualPreferenceDrift(c, house, clock.year);
    const sat = computeHousingSatisfaction(c, house, sharity);
    c.housingSatisfaction = sat;

    const jobOrPayShift = c.lastEvalGrossPay !== undefined && Math.abs(c.lastGrossPay - c.lastEvalGrossPay) >= Math.max(120, c.lastEvalGrossPay * 0.2);
    const tierShift = c.lastEvalTier !== undefined && c.lastEvalTier !== c.tier;
    const duePeriodic = (clock.totalDays - (c.lastHousingEvalDay ?? 0)) >= 30;
    const triggerNow = !house || c.housingEvalUrgent || jobOrPayShift || tierShift || duePeriodic;
    if (!triggerNow) continue;

    c.lastHousingEvalDay = clock.totalDays;
    c.lastEvalGrossPay = c.lastGrossPay;
    c.lastEvalTier = c.tier;
    c.housingEvalUrgent = false;

    if (!house) { c.seekingHousing = true; continue; }

    const netPay = Math.max(0, c.lastGrossPay - c.lastTax + (c.lastRentalIncome ?? 0));
    const myRent = house.ownerId === c.id ? 0 : Math.round(getTenantMonthlyRent(house) * (c.friendRentDiscount ?? 1));
    const activeEntry = (c.housingHistory ?? []).find((h) => !h.endDay);
    const yearsHere = activeEntry ? (clock.totalDays - activeEntry.startDay) / 360 : 0;
    const stabilityHold = yearsHere >= 2 ? 12 + c.traits.loyalty * 0.12 : 0;
    const targetRent = HOUSE_SPECS[c.housingPrefs.preferredType].baseRent;

    // Downgrade trigger
    const needsDowngrade = house.ownerId !== c.id && ((netPay > 0 && myRent > netPay * 0.5) || c.roleLevel === 'Unemployed' || c.savings < myRent * 3);
    if (needsDowngrade && myRent > 95) {
      if (c.traits.pride > 70 && c.traits.survivalInstinct <= 60) {
        recordConsequentialDecision({
          citizen: c, clock, dateLabel, kind: 'budget_skip', category: 'housing',
          title: 'Refuse Housing Downgrade', chosenOption: `Keep ${house.name}`, altOption: 'Search Cheaper Housing',
          chosenReason: `Pride (${c.traits.pride}) refused downgrading from ${house.name} despite tight finances.`,
          chosenFactors: [{ label: 'Pride Retention', value: Math.round(c.traits.pride * 0.45) }],
          altFactors: [{ label: 'Rent Burden', value: -25 }],
        });
        continue;
      }
      c.seekingHousing = true;
      applyEmotionPulse(c.emotions, 'shame', 14, `Forced to downsize from ${house.name}`, clock, dateLabel);
      recordConsequentialDecision({
        citizen: c, clock, dateLabel, kind: 'downgrade_upgrade', category: 'housing',
        title: 'Seek Cheaper Housing', chosenOption: 'Downgrade Search', altOption: `Stay in ${house.name}`,
        chosenReason: `Rent ${formatDelta(myRent)}/mo strained budget (Survival ${c.traits.survivalInstinct}).`,
        chosenFactors: [{ label: 'Survival Instinct', value: Math.round(c.traits.survivalInstinct * 0.4) }, { label: 'Satisfaction', value: 100 - sat.total }],
        altFactors: [{ label: 'Moving Cost', value: -10 }],
      });
      continue;
    }

    if (sat.total > 75) continue;

    // Upgrade trigger
    const betterAvail = housing.houses.some((h) => !h.condemned && !h.maintenanceUntilDay && h.occupantIds.length < h.capacity &&
      HOME_TYPE_ORDER.indexOf(h.type) > HOME_TYPE_ORDER.indexOf(house.type) && (c.traits.pride > 70 ? h.rentPrice <= netPay * 0.55 : h.rentPrice <= netPay * c.housingPrefs!.maxRentRatio));
    const wantsUpgrade = sat.total < 70 && c.savings > targetRent * 6 && (c.traits.ambition > 65 || tierShift || jobOrPayShift) && betterAvail;
    if (wantsUpgrade) {
      c.seekingHousing = true;
      recordConsequentialDecision({
        citizen: c, clock, dateLabel, kind: 'downgrade_upgrade', category: 'housing',
        title: 'Upgrade Home Search', chosenOption: `Seek ${HOUSE_SPECS[c.housingPrefs.preferredType].label}`, altOption: `Stay in ${house.name}`,
        chosenReason: `Savings (${formatDelta(c.savings)}) and ambition (${c.traits.ambition}) support a better residence.`,
        chosenFactors: [{ label: 'Savings Runway', value: 32 }, { label: 'Ambition', value: Math.round(c.traits.ambition * 0.3) }],
        altFactors: [{ label: 'Stability', value: Math.round(stabilityHold) }],
      });
      continue;
    }

    // Dissatisfaction move threshold
    const threshold = clamp(40 - stabilityHold * 0.5 + (c.traits.impulsiveness - c.traits.patience) * 0.14, 18, 56);
    if (sat.total < 20 || sat.total < threshold) {
      c.seekingHousing = true;
      recordConsequentialDecision({
        citizen: c, clock, dateLabel, kind: 'housing_move', category: 'housing',
        title: 'Evaluate Moving Out', chosenOption: 'Search New Home', altOption: `Endure ${house.name}`,
        chosenReason: `Satisfaction ${sat.total}/100 dropped below threshold (${Math.round(threshold)}).`,
        chosenFactors: [{ label: 'Dissatisfaction', value: 100 - sat.total }, { label: 'Impulsiveness', value: Math.round(c.traits.impulsiveness * 0.25) }],
        altFactors: [{ label: 'Patience & Stability', value: Math.round(c.traits.patience * 0.25 + stabilityHold) }],
      });
    }
  }
}
