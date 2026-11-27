// familyHousingMove.ts — Keep dependent youth with parents/guardians and find bigger homes (or overcrowd) on child birth

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { appendLifeLog } from './citizenLedger';
import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { tryBuyBiggerHouseWithLoan } from './familyHousingLoan';
import { formatDelta } from './formatters';
import { getMoveCost } from './housingDecisions';
import { computeLandlordRent, syncCitizenHousingLinks } from './housingScores';
import type { House, HousingState } from './housingTypes';
import { recordSimEvent } from './recordsStore';
import { simRandFloat } from './rng';
import type { Citizen, CityEvent, CityState } from './types';

function closeChildHistory(c: Citizen, day: number, dateLabel: string, reason: string): void {
  const open = (c.housingHistory ?? []).find((h) => !h.endDay);
  if (open) { open.endDay = day; open.endDate = dateLabel; open.reason = reason; }
}

export function moveDependentsWithCaregiver(params: {
  caregiver: Citizen;
  oldHouseId: string | null;
  target: House;
  housing: HousingState;
  allCitizens: Citizen[];
  clock: SimClock;
  dateLabel: string;
}): void {
  const { caregiver, oldHouseId, target, housing, allCitizens, clock, dateLabel } = params;
  const reason = `Moved with parent/guardian ${caregiver.name}`;
  for (const dep of allCitizens) {
    if (!dep.alive || dep.youngAdultPhase !== 'dependent_youth' || dep.id === caregiver.id) continue;
    const belongs = (dep.parentIds ?? []).includes(caregiver.id) || dep.guardianId === caregiver.id;
    if (!belongs) continue;
    if (dep.homeId && dep.homeId !== oldHouseId && dep.homeId !== target.id) continue;
    if (dep.homeId && dep.homeId !== target.id) {
      const prevH = housing.houses.find((h) => h.id === dep.homeId);
      if (prevH) prevH.occupantIds = prevH.occupantIds.filter((id) => id !== dep.id);
      closeChildHistory(dep, clock.totalDays, dateLabel, reason);
    }
    if (!target.occupantIds.includes(dep.id)) target.occupantIds.push(dep.id);
    dep.seekingHousing = false;
    dep.homelessDays = 0;
    if (dep.homeId !== target.id) {
      dep.housingHistory = [{ houseId: target.id, houseName: target.name, type: target.type, district: target.district, ownership: 'rented' as const, startDay: clock.totalDays, startDate: dateLabel, reason }, ...(dep.housingHistory ?? [])].slice(0, 30);
      appendLifeLog(dep, clock.totalDays, dateLabel, 'money', `Moved into ${target.name} with ${caregiver.name}.`);
    }
  }
}

export function releaseDependentsFromLostHouse(caregiver: Citizen, house: House, allCitizens: Citizen[]): void {
  for (const dep of allCitizens) {
    if (!dep.alive || dep.youngAdultPhase !== 'dependent_youth') continue;
    const isMyDep = (dep.parentIds ?? []).includes(caregiver.id) || dep.guardianId === caregiver.id;
    if (!isMyDep || !house.occupantIds.includes(dep.id)) continue;
    const otherParentInside = (dep.parentIds ?? []).some((pid) => pid !== caregiver.id && house.occupantIds.includes(pid));
    if (otherParentInside) continue;
    house.occupantIds = house.occupantIds.filter((id) => id !== dep.id);
    dep.homeId = null;
    dep.ownershipType = 'homeless';
    dep.seekingHousing = false;
  }
}

export function handleFamilyHousingOnBirth(params: {
  livingParent: Citizen;
  otherParent: Citizen;
  child: Citizen;
  city: CityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
  moveFn: (args: { citizen: Citizen; target: House; housing: HousingState; allCitizens: Citizen[]; clock: SimClock; dateLabel: string; reason: string; events: CityEvent[] }) => void;
}): void {
  const { livingParent, otherParent, child, city, clock, dateLabel, events, moveFn } = params;
  const curHouse = livingParent.homeId ? city.housing.houses.find((h) => h.id === livingParent.homeId) : undefined;
  if (curHouse && curHouse.occupantIds.length + 1 <= curHouse.capacity) {
    curHouse.occupantIds.push(child.id);
    return;
  }

  const coParents = otherParent.alive && otherParent.id !== livingParent.id && (!otherParent.homeId || otherParent.homeId === curHouse?.id)
    ? [livingParent, otherParent] : [livingParent];
  const existingDeps = city.citizens.filter((k) => k.alive && k.youngAdultPhase === 'dependent_youth' && ((k.parentIds ?? []).some((pid) => coParents.some((p) => p.id === pid)) || coParents.some((p) => k.guardianId === p.id)) && (!k.homeId || k.homeId === curHouse?.id));
  const neededCap = Math.max(coParents.length + existingDeps.length + 1, (curHouse?.occupantIds.length ?? 0) + 1);
  const netPay = coParents.reduce((s, p) => s + Math.max(0, p.lastGrossPay - p.lastTax + (p.lastRentalIncome ?? 0)), 0);
  const candidates = city.housing.houses
    .filter((h) => !h.condemned && !h.maintenanceUntilDay && h.occupantIds.length === 0 && h.capacity >= neededCap && h.id !== curHouse?.id)
    .map((h) => {
      const mCost = getMoveCost(curHouse, h);
      const rentOk = livingParent.savings >= h.rentPrice + mCost && h.rentPrice <= Math.max(netPay * 0.55, livingParent.savings * 0.3);
      const buyCashOk = Boolean(h.forSale && h.buyPrice !== null && h.ownerId === 'gov' && livingParent.savings >= h.buyPrice * 1.12 + mCost);
      const vijCap = city.companies.find((co) => co.id === 'vijcapital');
      const buyLoanCand = Boolean(h.forSale && h.buyPrice !== null && h.ownerId === 'gov' && city.bank && vijCap && !vijCap.bankrupt && livingParent.savings >= h.buyPrice * 0.15 + mCost);
      const distBonus = livingParent.housingPrefs?.preferredDistrict === h.district ? 14 : 4;
      const traitFit = (livingParent.traits.ambition + livingParent.traits.pride - livingParent.traits.thriftiness) * 0.12;
      const affordScore = buyCashOk ? 36 : rentOk ? 30 : buyLoanCand ? 20 : -80;
      const score = Math.round(affordScore + distBonus + h.scores.safety * 0.18 + h.scores.comfort * 0.15 + traitFit + simRandFloat(-4, 4));
      return { h, score, mCost, rentOk, buyCashOk, buyLoanCand };
    })
    .filter((x) => x.rentOk || x.buyCashOk || x.buyLoanCand)
    .sort((a, b) => b.score - a.score);

  for (const cand of candidates) {
    let acquiredMode: 'rent' | 'buy_cash' | 'buy_loan' | null = null;
    if (cand.buyCashOk && cand.h.buyPrice !== null) {
      livingParent.savings = Math.round((livingParent.savings - cand.h.buyPrice) * 100) / 100;
      city.treasury = Math.round((city.treasury + cand.h.buyPrice) * 100) / 100;
      cand.h.ownerId = livingParent.id; cand.h.originalBuyPrice = cand.h.buyPrice; cand.h.forSale = false;
      cand.h.rentPrice = computeLandlordRent(cand.h.baseRent, livingParent);
      acquiredMode = 'buy_cash';
    } else if (cand.rentOk) {
      acquiredMode = 'rent';
    } else if (cand.buyLoanCand && tryBuyBiggerHouseWithLoan({ buyer: livingParent, house: cand.h, moveCost: cand.mCost, city, clock, dateLabel, events })) {
      acquiredMode = 'buy_loan';
    }
    if (!acquiredMode) continue;

    if (cand.mCost > 0) livingParent.savings = Math.max(0, Math.round((livingParent.savings - cand.mCost) * 100) / 100);
    const reason = `Upgraded home (${acquiredMode.replace('_', ' ')}) for newborn ${child.name}`;
    for (const par of coParents) moveFn({ citizen: par, target: cand.h, housing: city.housing, allCitizens: city.citizens, clock, dateLabel, reason, events });
    if (!cand.h.occupantIds.includes(child.id)) cand.h.occupantIds.push(child.id);
    syncCitizenHousingLinks(city.citizens, city.housing.houses, city.sharity);
    recordConsequentialDecision({
      citizen: livingParent, clock, dateLabel, kind: 'housing_move', category: 'housing',
      title: `Family Move for ${child.name}`, chosenOption: `Move to ${cand.h.name} (cap ${cand.h.capacity})`, altOption: 'Stay Overcrowded',
      chosenReason: `${reason}; fit score ${cand.score} (income ${formatDelta(netPay)}, savings ${formatDelta(livingParent.savings)}).`,
      chosenFactors: [{ label: 'Family Capacity', value: 42 }], altFactors: [{ label: 'Moving Cost', value: -Math.round(cand.mCost * 0.1) }],
      diarySentence: `Moved family to ${cand.h.name} for newborn ${child.name}.`,
    });
    recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'housing', subType: 'family_upgrade_birth', subjectId: livingParent.id, subjectKind: 'citizen', subjectName: livingParent.name, summary: `${livingParent.name} moved family (${neededCap}) to ${cand.h.name} (${acquiredMode}) for ${child.name}`, detail: { houseId: cand.h.id, mode: acquiredMode, capacity: cand.h.capacity, neededCap, score: cand.score, why: `House capacity full on ${child.name} birth`, what: `Moved family to ${cand.h.name} (cap ${cand.h.capacity})`, how: `${acquiredMode} (score ${cand.score})` } });
    return;
  }

  // No affordable bigger home: keep family together (temporarily overcrowded above capacity) & keep searching
  if (curHouse && !curHouse.occupantIds.includes(child.id)) curHouse.occupantIds.push(child.id);
  for (const par of coParents) { par.seekingHousing = true; par.housingEvalUrgent = true; }
  const summary = curHouse ? `${livingParent.name}'s family (${neededCap}) overcrowded in ${curHouse.name} (cap ${curHouse.capacity}); keeps searching` : `${livingParent.name} searching for family shelter for ${child.name}`;
  recordConsequentialDecision({
    citizen: livingParent, clock, dateLabel, kind: 'budget_skip', category: 'housing',
    title: `Family Overcrowded After ${child.name}'s Birth`, chosenOption: 'Keep Family Together & Search', altOption: 'Force Separate Placement',
    chosenReason: `No affordable house with capacity >= ${neededCap}; kept child with parents and marked searching.`,
    chosenFactors: [{ label: 'Family Unity', value: 45 }], altFactors: [{ label: 'Overcrowding Stress', value: -20 }],
  });
  events.push(makeCityEvent(clock, `overcrowd_${child.id}`, { type: 'housing-search', citizenId: livingParent.id, citizenName: livingParent.name, title: 'Family Needs Bigger Home', detail: summary }));
  recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'housing', subType: 'family_overcrowded', subjectId: livingParent.id, subjectKind: 'citizen', subjectName: livingParent.name, summary, detail: { houseId: curHouse?.id ?? null, neededCap, currentCap: curHouse?.capacity ?? 0, why: 'No affordable bigger house', what: 'Kept family together overcrowded', how: 'Set seekingHousing=true to keep searching' } });
}
