// housingMarket.ts — Daily housing decision evaluation, search with roommate & move-cost checks, and friend rescue

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { stepHousingBuying } from './housingBuying';
import { evaluateCitizenHousingDecisions, getMoveCost } from './housingDecisions';
import { moveCitizenToHouse } from './housingEviction';
import { HOME_TYPE_ORDER } from './housingPreferences';
import { canJoinAsRoommate, tryAskFriendForShelter } from './housingRoommates';
import { getTenantMonthlyRent } from './housingScores';
import type { House, HousingState } from './housingTypes';
import { getAffinity } from './sharityAffinity';
import type { SharityState } from './sharityTypes';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent } from './types';

function scoreVacancyForCitizen(c: Citizen, h: House, citizens: Citizen[], sharity: SharityState): number {
  const netPay = Math.max(0, c.lastGrossPay - c.lastTax + (c.lastRentalIncome ?? 0));
  const estRent = h.type === 'shared_room' ? h.rentPrice : Math.round(h.rentPrice / Math.max(1, h.occupantIds.length + 1));
  const maxRatio = c.housingPrefs?.maxRentRatio ?? 0.4;
  const affRatio = netPay > 0 ? estRent / netPay : estRent / Math.max(120, c.savings);
  const affordScore = affRatio <= maxRatio * 0.85 ? 40 : affRatio <= maxRatio ? 26 : affRatio <= 0.65 ? 10 : -25;

  const prefType = c.housingPrefs?.preferredType ?? 'small_flat';
  const gap = Math.abs(HOME_TYPE_ORDER.indexOf(h.type) - HOME_TYPE_ORDER.indexOf(prefType));
  const typeFit = Math.max(0, 20 - gap * 6);
  const distBonus = c.housingPrefs?.preferredDistrict === h.district ? 12 : 4;
  const safetyScore = (h.scores.safety / 100) * 16;

  let roomieScore = 14;
  if (h.occupantIds.length > 0) {
    const avgAff = h.occupantIds.reduce((s, id) => s + getAffinity(sharity, c.id, id), 0) / h.occupantIds.length;
    roomieScore = clamp(10 + avgAff * 0.1, 0, 20);
  }
  const evictPenalty = (c.evictionRecords?.length ?? 0) > 0 ? -20 : 0;
  const depCount = citizens.filter((k) => k.alive && k.youngAdultPhase === 'dependent_youth' && ((k.parentIds ?? []).includes(c.id) || k.guardianId === c.id)).length;
  const capBonus = depCount > 0 ? (h.capacity >= 1 + depCount ? 14 : -18) : 0;
  return Math.round(affordScore + typeFit + distBonus + safetyScore + roomieScore + evictPenalty + capBonus);
}

function landlordAcceptsApplicant(h: House, c: Citizen, citizens: Citizen[], score: number): boolean {
  if (score < 12) return false;
  if (h.ownerId === 'gov') return true;
  const landlord = citizens.find((x) => x.id === h.ownerId && x.alive);
  if (!landlord) return true;
  const evicted = (c.evictionRecords?.length ?? 0) > 0;
  if (evicted && landlord.traits.honesty > 55 && landlord.traits.greed < 60) return false;
  if (evicted && landlord.traits.greed >= 65) return true;
  return score >= 18;
}

export function stepHousingMarketDaily(params: {
  citizens: Citizen[];
  housing: HousingState;
  sharity: SharityState;
  treasury: number;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): number {
  const { citizens, housing, sharity, clock, dateLabel, events } = params;
  for (const h of housing.houses) h.applications = [];
  evaluateCitizenHousingDecisions({ citizens, housing, sharity, clock, dateLabel });

  const byHouse = new Map(housing.houses.map((h) => [h.id, h]));
  const byCit = new Map(citizens.map((c) => [c.id, c]));
  const searchers = citizens.filter((c) => c.alive && c.youngAdultPhase !== 'dependent_youth' && (!c.homeId || c.seekingHousing));

  for (const c of searchers) {
    const curHouse = c.homeId ? byHouse.get(c.homeId) : undefined;
    const netPay = Math.max(0, c.lastGrossPay - c.lastTax + (c.lastRentalIncome ?? 0));
    const vacs = housing.houses.filter((h) => !h.condemned && !h.maintenanceUntilDay && h.id !== c.homeId && h.occupantIds.length < h.capacity && h.ownerId !== c.id);
    const ranked = vacs
      .filter((h) => canJoinAsRoommate(c, h, h.occupantIds.map((id) => byCit.get(id)!).filter(Boolean), sharity))
      .map((h) => ({ house: h, score: scoreVacancyForCitizen(c, h, citizens, sharity) }))
      .filter((x) => {
        const rentPer = x.house.type === 'shared_room' ? x.house.rentPrice : getTenantMonthlyRent({ ...x.house, occupantIds: [...x.house.occupantIds, c.id] });
        const mCost = c.homeId ? getMoveCost(curHouse, x.house) : 0;
        return (c.savings >= rentPer + mCost) || (c.homeId === null && netPay >= rentPer * 1.05);
      })
      .sort((a, b) => b.score - a.score);

    for (const cand of ranked.slice(0, 3)) {
      cand.house.applications.push({
        citizenId: c.id, citizenName: c.name, score: cand.score,
        evictionCount: c.evictionRecords?.length ?? 0, monthlyIncome: netPay, appliedDay: clock.totalDays,
      });
    }
    const chosen = ranked.find((r) => landlordAcceptsApplicant(r.house, c, citizens, r.score));
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'housing', subType: 'search',
      subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
      summary: chosen ? `${c.name} searched ${ranked.length} open house(s) and picked ${chosen.house.name} (score ${chosen.score})` : `${c.name} searched ${ranked.length} house(s) with no accepted match`,
      detail: { vacanciesChecked: vacs.length, affordableRanked: ranked.slice(0, 3).map((r) => ({ houseId: r.house.id, name: r.house.name, score: r.score })), chosenHouseId: chosen?.house.id ?? null, chosenScore: chosen?.score ?? null },
    });
    if (chosen) {
      const mCost = c.homeId ? getMoveCost(curHouse, chosen.house) : 0;
      if (mCost > 0) c.savings = Math.max(0, Math.round((c.savings - mCost) * 100) / 100);
      moveCitizenToHouse({ citizen: c, target: chosen.house, housing, allCitizens: citizens, clock, dateLabel, reason: curHouse ? `Moved (${formatDelta(mCost)} moving cost)` : 'Found housing via search', events });
      recordConsequentialDecision({
        citizen: c, clock, dateLabel, kind: 'housing_move', category: 'housing',
        title: `Move to ${chosen.house.name}`, chosenOption: `Move (${formatDelta(chosen.house.rentPrice)}/mo)`, altOption: 'Keep Searching',
        chosenReason: `Score ${chosen.score}, moving cost ${formatDelta(mCost)}, safety ${chosen.house.scores.safety}.`,
        chosenFactors: [{ label: 'Housing Fit Score', value: chosen.score }, { label: 'Moving Cost', value: -Math.round(mCost * 0.1) }],
        altFactors: [{ label: 'Wait Cost', value: -15 }], diarySentence: `Moved into ${chosen.house.name}.`,
      });
    } else if (!c.homeId) {
      const rescued = tryAskFriendForShelter({ seeker: c, housing, allCitizens: citizens, sharity, clock, dateLabel, events });
      if (!rescued && clock.day % 10 === 1) {
        events.push(makeCityEvent(clock, `hsearch_${c.id}`, {
          type: 'housing-search', citizenId: c.id, citizenName: c.name,
          title: 'Housing Search', detail: `${c.name} searched vacancies & asked friends with no accepted opening.`,
        }));
      }
    }
  }

  return stepHousingBuying(params);
}
