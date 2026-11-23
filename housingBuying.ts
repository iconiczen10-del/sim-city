// housingBuying.ts — Cash-only primary home and second investment property purchasing for Vij citizens

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { applyEmotionPulse } from './citizenEmotions';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { type SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { formatDelta } from './formatters';
import { HOUSE_SPECS } from './housingCatalog';
import { computeLandlordRent, syncCitizenHousingLinks } from './housingScores';
import type { House, HousingState } from './housingTypes';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

export function stepHousingBuying(params: {
  citizens: Citizen[];
  housing: HousingState;
  sharity: SharityState;
  treasury: number;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): number {
  const { citizens, housing, sharity, clock, dateLabel, events } = params;
  let treasury = params.treasury;

  for (const c of citizens) {
    if (!c.alive || !c.homeId) continue;
    const ownedCount = housing.houses.filter((h) => h.ownerId === c.id).length;
    const curHouse = housing.houses.find((h) => h.id === c.homeId);
    if (!curHouse) continue;

    const netPay = Math.max(0, c.lastGrossPay - c.lastTax + (c.lastRentalIncome ?? 0));
    const triggerReady = c.traits.pride > 70 || c.traits.thriftiness > 65 || c.highestMilestone >= 10000 || c.tenureMonths >= 6 || c.traits.impulsiveness > 70;
    if (!triggerReady) continue;

    let target: House | undefined;
    if (ownedCount === 0 && curHouse.ownerId === 'gov' && curHouse.forSale && curHouse.buyPrice !== null) {
      const cushion = c.traits.impulsiveness > 70 ? 1.02 : c.traits.thriftiness > 65 ? 1.2 : 1.3;
      const maint = HOUSE_SPECS[curHouse.type].citMaint;
      if (c.savings >= curHouse.buyPrice * cushion && (netPay >= maint * 2 || c.savings - curHouse.buyPrice >= 2000)) {
        target = curHouse;
      }
    } else if (ownedCount === 1 && (c.traits.greed > 55 || c.traits.thriftiness > 60)) {
      const invCand = housing.houses
        .filter((h) => h.ownerId === 'gov' && h.forSale && !h.condemned && h.buyPrice !== null && h.occupantIds.length === 0 && c.savings >= h.buyPrice * 1.45)
        .sort((a, b) => (b.buyPrice ?? 0) - (a.buyPrice ?? 0))[0];
      if (invCand) target = invCand;
    }

    if (target && target.buyPrice !== null) {
      const price = target.buyPrice;
      const prevSav = c.savings;
      c.savings = Math.round((c.savings - price) * 100) / 100;
      treasury = Math.round((treasury + price) * 100) / 100;
      target.ownerId = c.id;
      target.originalBuyPrice = price;
      target.leaseStartDay = clock.totalDays;
      target.forSale = false;
      target.rentPrice = computeLandlordRent(target.baseRent, c);
      syncCitizenHousingLinks(citizens, housing.houses, sharity);

      const reason = ownedCount >= 1 ? 'Investment property rental income' : c.traits.pride > 70 ? 'Pride in owning a home' : 'Long-term stability and zero rent';
      const msg = `Bought ${target.name} for ${formatDelta(price)}. Savings went from ${formatDelta(prevSav)} to ${formatDelta(c.savings)}. Motivation: ${reason}.`;
      recordConsequentialDecision({
        citizen: c, clock, dateLabel, kind: 'housing_buy', category: 'housing',
        title: `Buy ${target.name}`, chosenOption: `Buy for ${formatDelta(price)}`, altOption: 'Keep Renting',
        chosenReason: msg, chosenFactors: [{ label: 'Savings Cushion', value: 40 }, { label: ownedCount >= 1 ? 'Greed / Yield' : 'Ownership Pride', value: 28 }],
        altFactors: [{ label: 'Liquidity Preference', value: 18 }], diarySentence: msg,
      });
      appendLedgerEntry(c, clock.totalDays, dateLabel, 'expense', 'Housing Purchase', `Bought ${target.name}`, price);
      appendLifeLog(c, clock.totalDays, dateLabel, 'money', msg);
      applyEmotionPulse(c.emotions, 'joy', 24, `Purchased ${target.name}`, clock, dateLabel);
      housing.transactions.unshift({
        id: `htx_buy_${clock.totalDays}_${c.id}_${target.id}`,
        day: clock.totalDays, dateLabel, kind: 'bought', citizenId: c.id, citizenName: c.name,
        houseId: target.id, houseName: target.name, amount: price, note: reason,
      });
      events.push(makeCityEvent(clock, `buy_${c.id}_${target.id}`, {
        type: 'bought-house', citizenId: c.id, citizenName: c.name,
        title: ownedCount >= 1 ? 'Investment Property Bought' : 'Citizen Bought Home',
        detail: `${c.name} purchased ${target.name} for ${formatDelta(price)} cash.`,
      }));
    }
  }
  return treasury;
}
