// housingMarketDynamics.ts — Monthly district rent drift, buying price drift, 6-month lease raises, and crisis sell-backs

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { applyEmotionPulse } from './citizenEmotions';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta, formatMonthYear } from './formatters';
import { DISTRICT_ORDER, HOUSE_SPECS } from './housingCatalog';
import { computeLandlordRent, syncCitizenHousingLinks } from './housingScores';
import type { DistrictId, DistrictMarketMetric, House, HousingState, TypePricePoint } from './housingTypes';
import { simRand } from './rng';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

function avgTypePrice(houses: House[], t: House['type']): number {
  const list = houses.filter((h) => h.type === t && h.buyPrice !== null);
  if (list.length === 0) return Math.round((houses.filter((h) => h.type === t).reduce((s, h) => s + h.rentPrice, 0) / Math.max(1, houses.filter((h) => h.type === t).length)) * 100);
  return Math.round(list.reduce((s, h) => s + (h.buyPrice ?? 0), 0) / list.length);
}

export function stepMonthlyMarketDynamics(params: {
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
  const byCit = new Map(citizens.map((c) => [c.id, c]));

  // 1. Crisis sell-back to government at 85% original price
  for (const c of citizens) {
    if (!c.alive) continue;
    const owned = housing.houses.filter((h) => h.ownerId === c.id);
    if (owned.length === 0) continue;
    const monthlyCosts = calculateFixedMonthlyCosts(c.homeType).total + 150;
    const inCrisis = c.savings < monthlyCosts * 2;
    const shouldSell = c.traits.pride > 70 ? c.savings <= 0 : c.traits.thriftiness > 65 ? inCrisis : c.savings < monthlyCosts;
    if (!shouldSell) continue;

    const target = owned.sort((a, b) => (b.buyPrice ?? 0) - (a.buyPrice ?? 0))[0];
    const orig = target.originalBuyPrice ?? target.buyPrice ?? HOUSE_SPECS[target.type].baseBuyPrice ?? 15000;
    const payout = Math.round(orig * 0.85);
    c.savings = Math.round((c.savings + payout) * 100) / 100;
    treasury = Math.round((treasury - payout) * 100) / 100;
    target.ownerId = 'gov';
    target.forSale = target.type !== 'shared_room' && !target.condemned;
    const reason = `Financial crisis (savings fell to ${formatDelta(c.savings - payout)})`;
    const msg = `Sold ${target.name} back to government for ${formatDelta(payout)}. Reason: ${reason}.`;
    recordConsequentialDecision({
      citizen: c, clock, dateLabel, kind: 'housing_buy', category: 'housing',
      title: `Sell ${target.name}`, chosenOption: `Sell for ${formatDelta(payout)}`, altOption: 'Hold Property',
      chosenReason: msg, chosenFactors: [{ label: 'Cash Crisis', value: 45 }], altFactors: [{ label: 'Ownership Pride', value: Math.round(c.traits.pride * 0.3 - 30) }],
      diarySentence: msg,
    });
    appendLedgerEntry(c, clock.totalDays, dateLabel, 'income', 'Property Sale', `Sold ${target.name} to Gov`, payout);
    appendLifeLog(c, clock.totalDays, dateLabel, 'money', msg);
    applyEmotionPulse(c.emotions, 'sadness', 18, `Forced to sell ${target.name}`, clock, dateLabel);
    housing.transactions.unshift({
      id: `htx_sell_${clock.totalDays}_${c.id}_${target.id}`, day: clock.totalDays, dateLabel, kind: 'sold',
      citizenId: c.id, citizenName: c.name, houseId: target.id, houseName: target.name, amount: payout, note: reason,
    });
    events.push(makeCityEvent(clock, `sell_${c.id}_${target.id}`, {
      type: 'sold-house', citizenId: c.id, citizenName: c.name, title: 'Property Sold Back', detail: `${c.name} sold ${target.name} back for ${formatDelta(payout)}.`,
    }));
  }

  // 2. District vacancy & rent drift + 6-month lease raises
  const metrics = {} as Record<DistrictId, DistrictMarketMetric>;
  const ownedRatio = housing.houses.filter((h) => h.ownerId !== 'gov').length / housing.houses.length;
  const priceDrift = clamp((ownedRatio - 0.1) * 0.18 + (simRand() - 0.5) * 0.04, -0.1, 0.1);

  for (const dist of DISTRICT_ORDER) {
    const dHouses = housing.houses.filter((h) => h.district === dist && !h.condemned);
    const vacCount = dHouses.filter((h) => h.occupantIds.length === 0).length;
    const vacRate = dHouses.length > 0 ? vacCount / dHouses.length : 0;
    const driftPct = vacRate < 0.1 ? 0.02 + simRand() * 0.03 : vacRate > 0.3 ? -(0.02 + simRand() * 0.02) : 0;

    for (const h of dHouses) {
      let hDrift = driftPct;
      if (h.condition < 50) hDrift = Math.min(hDrift, -0.025);
      h.baseRent = Math.max(40, Math.round(h.baseRent * (1 + hDrift)));
      if (h.ownerId === 'gov' || h.occupantIds.length === 0) {
        h.rentPrice = h.ownerId === 'gov' ? h.baseRent : computeLandlordRent(h.baseRent, byCit.get(h.ownerId));
      } else if (clock.totalDays - (h.leaseStartDay ?? 1) >= 180) {
        h.leaseStartDay = clock.totalDays;
        const oldRent = h.rentPrice;
        const target = computeLandlordRent(h.baseRent, byCit.get(h.ownerId));
        if (target > oldRent) {
          h.rentPrice = target;
          const pct = (target - oldRent) / Math.max(1, oldRent);
          if (pct > 0.15) {
            for (const occId of h.occupantIds) {
              const occ = byCit.get(occId);
              if (!occ || !occ.alive) continue;
              occ.seekingHousing = true;
              occ.housingEvalUrgent = true;
              applyEmotionPulse(occ.emotions, 'anger', 18, `${h.name} lease raised ${Math.round(pct * 100)}%`, clock, dateLabel);
            }
            events.push(makeCityEvent(clock, `rraise_${h.id}`, {
              type: 'rent-raise', title: 'Lease Rent Raised', detail: `${h.name} rent rose ${formatDelta(oldRent)} → ${formatDelta(target)} (+${Math.round(pct * 100)}%).`,
            }));
          }
        }
      }
      if (h.buyPrice !== null) h.buyPrice = Math.max(4000, Math.round(h.buyPrice * (1 + priceDrift)));
    }
    const avgRent = dHouses.length > 0 ? Math.round(dHouses.reduce((s, h) => s + h.rentPrice, 0) / dHouses.length) : 0;
    metrics[dist] = {
      district: dist, vacancyRate: Math.round(vacRate * 100), avgRent,
      rentTrend: driftPct > 0.005 ? 'up' : driftPct < -0.005 ? 'down' : 'flat', lastDriftPct: Math.round(driftPct * 1000) / 10,
    };
  }
  housing.districtMetrics = metrics;
  const pt: TypePricePoint = {
    label: formatMonthYear(clock.month, clock.year),
    shared_room: avgTypePrice(housing.houses, 'shared_room'), small_flat: avgTypePrice(housing.houses, 'small_flat'),
    apartment: avgTypePrice(housing.houses, 'apartment'), villa: avgTypePrice(housing.houses, 'villa'), mansion: avgTypePrice(housing.houses, 'mansion'),
  };
  housing.typePriceHistory = [...(housing.typePriceHistory ?? []).slice(-23), pt];
  syncCitizenHousingLinks(citizens, housing.houses, sharity);
  return treasury;
}
