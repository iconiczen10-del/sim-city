// citizenRebuy.ts — Same-day emergency replacement shopping and downgrade decisions after item loss

import { recordStandardOrTierDecision } from './citizenDecisions';
import { appendChangeExplanation } from './citizenLedger';
import type { SimClock } from './eventFactory';
import { CATEGORY_LABELS, formatPrice } from './formatters';
import { purchaseFromMart } from './martShopping';
import type { LivingStandard, MartState, ShoppingCategory } from './martTypes';
import type { Citizen, CityEvent } from './types';

export function attemptReplacementShopping(
  citizen: Citizen,
  mart: MartState,
  category: ShoppingCategory,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): void {
  if (!citizen.alive || mart.closedDaysLeft > 0 || mart.closedUntilFunded) return;
  const wantQty = category === 'food' ? 6 : category === 'water' ? 3 : 1;
  let std = citizen.standards[category];

  const boughtPreferred = purchaseFromMart(citizen, mart, category, std, wantQty, clock, dateLabel, events);
  if (!boughtPreferred && std > 1 && citizen.savings > 0) {
    const oldStd = std;
    std = (std - 1) as LivingStandard;
    citizen.standards[category] = std;
    const dec = recordStandardOrTierDecision({
      citizen,
      totalDay: clock.totalDays,
      dateLabel,
      kind: 'downgrade_upgrade',
      category,
      title: `Emergency Downgrade (${CATEGORY_LABELS[category]})`,
      chosenOption: `Downgrade to L${std}`,
      altOption: `Stay at L${oldStd}`,
      chosenReason: `Rebuying ${CATEGORY_LABELS[category]} after loss with tight cash (${formatPrice(citizen.savings)}).`,
      budgetVal: -18,
      memVal: -10,
      traitVal: Math.round(citizen.traits.discipline * 0.2),
      urgencyOrStatusVal: 26,
      oldStd,
      newStd: std,
    });
    appendChangeExplanation(
      citizen,
      clock.totalDays,
      dateLabel,
      'standard_downgrade',
      `Downgraded ${CATEGORY_LABELS[category]} L${oldStd} → L${std} to replace lost supplies.`,
      dec.id
    );
    purchaseFromMart(citizen, mart, category, std, wantQty, clock, dateLabel, events);
  }
}
