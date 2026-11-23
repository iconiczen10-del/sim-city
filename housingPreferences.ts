// housingPreferences.ts — Seeded housing preference profiles, 5-factor satisfaction scoring, annual drift, and move summary

import { clamp } from './economy';
import { DISTRICTS, DISTRICT_ORDER, HOUSE_SPECS } from './housingCatalog';
import { getTenantMonthlyRent } from './housingScores';
import type { CitizenHousingPreferences, DistrictId, House, HousingSatisfactionBreakdown, RoommateTolerance } from './housingTypes';
import { simPick } from './rng';
import { getAffinity } from './sharityAffinity';
import type { SharityState } from './sharityTypes';
import type { Citizen, HomeType } from './types';

export const HOME_TYPE_ORDER: HomeType[] = ['shared_room', 'small_flat', 'apartment', 'villa', 'mansion'];
const DIST_LIST: DistrictId[] = ['old_town', 'mill_quarter', 'greenfield', 'riverside', 'hilltop'];

export function seedHousingPreferences(c: Citizen): CitizenHousingPreferences {
  let typeIdx = c.tier === 'T1' || c.tier === 'T2' ? (c.savings >= 60000 ? 4 : 3) : c.tier === 'T3' ? 2 : c.tier === 'T4' ? 1 : (c.savings >= 900 ? 1 : 0);
  if (c.traits.ambition > 65) typeIdx += 1;
  if (c.traits.thriftiness > 65) typeIdx -= 1;
  const preferredType = HOME_TYPE_ORDER[Math.max(0, Math.min(4, typeIdx))];

  let preferredDistrict: DistrictId = 'old_town';
  if (c.traits.neatness > 68) preferredDistrict = c.tier === 'T1' || c.tier === 'T2' ? 'hilltop' : 'greenfield';
  else if (c.traits.sociability > 65) preferredDistrict = 'old_town';
  else if (c.traits.riskTolerance > 68 && c.tier !== 'T1') preferredDistrict = 'mill_quarter';
  else if (c.traits.curiosity > 60) preferredDistrict = 'riverside';
  else preferredDistrict = simPick(DIST_LIST);

  let maxRentRatio = 0.4;
  if (c.traits.pride > 68) maxRentRatio = 0.5;
  else if (c.traits.thriftiness > 68) maxRentRatio = 0.28;

  const roommateTolerance: RoommateTolerance =
    c.traits.sociability > 60 && c.traits.neatness < 50 ? 'welcomes' : c.traits.neatness > 70 || c.traits.pride > 70 ? 'prefers_alone' : 'neutral';

  return { preferredType, preferredDistrict, maxRentRatio, roommateTolerance, lastDriftYear: 1 };
}

export function computeHousingSatisfaction(
  c: Citizen,
  house: House | null | undefined,
  sharity?: SharityState
): HousingSatisfactionBreakdown {
  if (!house || house.condemned) {
    return { total: 0, affordability: 0, typeMatch: 0, districtMatch: 0, condition: 0, roommates: 0 };
  }
  const prefs = c.housingPrefs ?? seedHousingPreferences(c);
  const netPay = Math.max(1, c.lastGrossPay - c.lastTax + (c.lastRentalIncome ?? 0));
  const monthlyOut = house.ownerId === c.id ? 0 : Math.round(getTenantMonthlyRent(house) * (c.friendRentDiscount ?? 1));
  const rentRatio = monthlyOut / netPay;
  const affordability = house.ownerId === c.id
    ? 95
    : clamp(100 - Math.max(0, (rentRatio - prefs.maxRentRatio * 0.7) / Math.max(0.15, prefs.maxRentRatio * 0.8)) * 85, 5, 100);

  const curIdx = HOME_TYPE_ORDER.indexOf(house.type);
  const prefIdx = HOME_TYPE_ORDER.indexOf(prefs.preferredType);
  const typeGap = Math.abs(curIdx - prefIdx);
  const typeMatch = curIdx >= prefIdx ? Math.max(60, 100 - typeGap * 14) : Math.max(15, 100 - typeGap * 28);

  const distIdxDiff = Math.abs(DISTRICT_ORDER.indexOf(house.district) - DISTRICT_ORDER.indexOf(prefs.preferredDistrict));
  const districtMatch = house.district === prefs.preferredDistrict ? 100 : clamp(85 - distIdxDiff * 14, 30, 85);

  const condition = clamp(house.condition, 0, 100);

  let roommates = 85;
  const peers = c.roommateIds ?? [];
  if (peers.length === 0) {
    roommates = prefs.roommateTolerance === 'prefers_alone' ? 100 : prefs.roommateTolerance === 'welcomes' ? 70 : 88;
  } else {
    const avgAff = sharity ? peers.reduce((s, id) => s + getAffinity(sharity, c.id, id), 0) / peers.length : 25;
    roommates = clamp(55 + avgAff * 0.45 - (prefs.roommateTolerance === 'prefers_alone' ? 25 : 0), 5, 100);
  }

  const total = Math.round(clamp(affordability * 0.4 + typeMatch * 0.2 + districtMatch * 0.15 + condition * 0.1 + roommates * 0.15, 0, 100));
  return {
    total, affordability: Math.round(affordability), typeMatch: Math.round(typeMatch),
    districtMatch: Math.round(districtMatch), condition: Math.round(condition), roommates: Math.round(roommates),
  };
}

export function stepAnnualPreferenceDrift(c: Citizen, house: House | undefined, year: number): void {
  const prefs = c.housingPrefs ?? seedHousingPreferences(c);
  c.housingPrefs = prefs;
  if (prefs.lastDriftYear >= year) return;
  prefs.lastDriftYear = year;

  if (c.tier === 'T1' || c.tier === 'T2') {
    const idx = HOME_TYPE_ORDER.indexOf(prefs.preferredType);
    if (idx < 4) prefs.preferredType = HOME_TYPE_ORDER[idx + 1];
  }
  const latestEvict = c.evictionRecords?.[0];
  if (latestEvict) {
    const alt = DIST_LIST.find((d) => d !== house?.district);
    if (alt) prefs.preferredDistrict = alt;
  }
  const activeEntry = (c.housingHistory ?? []).find((h) => !h.endDay);
  if (house && activeEntry && (c.housingSatisfaction?.total ?? 50) > 72 && year - Math.floor(activeEntry.startDay / 360) >= 2) {
    const curIdx = HOME_TYPE_ORDER.indexOf(house.type);
    const prefIdx = HOME_TYPE_ORDER.indexOf(prefs.preferredType);
    if (curIdx > prefIdx) prefs.preferredType = house.type;
  }
}

export function buildWouldMoveSummary(c: Citizen, house: House | null | undefined): string {
  if (!house) return 'Homeless — moves immediately into any safe, affordable opening or friend shelter.';
  const prefs = c.housingPrefs ?? seedHousingPreferences(c);
  const sat = c.housingSatisfaction?.total ?? 60;
  const limit = Math.round(Math.max(0, c.lastGrossPay - c.lastTax) * prefs.maxRentRatio);
  if (sat > 75) return `Content (${sat}/100) — ignores minor options unless pay rises sharply or rent > ∆${Math.max(limit, house.rentPrice)}.`;
  if (sat < 20) return `Searching urgently (${sat}/100) — ready to move on first affordable ${HOUSE_SPECS[prefs.preferredType].label} or cheaper split.`;
  const drivers: string[] = [];
  if (house.type !== prefs.preferredType) drivers.push(`wants ${HOUSE_SPECS[prefs.preferredType].label}`);
  if (house.district !== prefs.preferredDistrict) drivers.push(`prefers ${DISTRICTS[prefs.preferredDistrict].label}`);
  if (house.condition < 50) drivers.push('condition below 50');
  if (c.traits.pride > 70) drivers.push('resists downgrade out of pride');
  return `Considers move if satisfaction drops < 40 (currently ${sat}/100${drivers.length ? `: ${drivers.join(', ')}` : ''}).`;
}
