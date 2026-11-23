// housingSeed.ts — Deterministic seeding of 60 Vij houses and initial assignment of all 50 citizens

import type { HomeType } from './cityBaseTypes';
import { buildHouseName, computeHousePrices, DISTRICT_ORDER, DISTRICT_QUOTAS, HOUSE_SPECS } from './housingCatalog';
import { computeHousingSatisfaction, seedHousingPreferences } from './housingPreferences';
import { computeHouseScores, syncCitizenHousingLinks } from './housingScores';
import type { DistrictId, DistrictMarketMetric, House, HousingState } from './housingTypes';
import { simRandInt } from './rng';
import type { Citizen } from './types';

export function createInitialHousingState(citizens: Citizen[]): HousingState {
  const houses: House[] = [];
  let seq = 1;

  for (const q of DISTRICT_QUOTAS) {
    for (let i = 1; i <= q.count; i += 1) {
      const spec = HOUSE_SPECS[q.type];
      const { baseRent, buyPrice } = computeHousePrices(q.type, q.district);
      const condition = simRandInt(70, 95);
      const h: House = {
        id: `house_${seq}`,
        name: buildHouseName(q.district, q.type, i),
        type: q.type,
        district: q.district,
        capacity: spec.capacity,
        condition,
        ownerId: 'gov',
        occupantIds: [],
        baseRent,
        rentPrice: baseRent,
        buyPrice,
        originalBuyPrice: buyPrice,
        forSale: q.type !== 'shared_room',
        condemned: false,
        leaseStartDay: 1,
        scores: { comfort: 50, space: 100, noise: 30, privacy: 100, safety: 70 },
        applications: [],
        maintenanceHistory: [],
        evictionHistory: [],
        conditionHistory: [{ day: 1, label: 'Jan Y1', condition }],
        lastMaintenancePaid: 0,
      };
      h.scores = computeHouseScores(h);
      houses.push(h);
      seq += 1;
    }
  }

  assignCitizensInitialHouses(citizens, houses);
  syncCitizenHousingLinks(citizens, houses);
  const byHouse = new Map(houses.map((h) => [h.id, h]));
  for (const c of citizens) {
    if (!c.housingPrefs) c.housingPrefs = seedHousingPreferences(c);
    c.housingSatisfaction = computeHousingSatisfaction(c, c.homeId ? byHouse.get(c.homeId) : undefined);
  }
  const res: HousingState = { houses, transactions: [], treasuryRentThisMonth: 0, evictionsThisMonth: 0, avgRentPaid: 0 };
  const occ = houses.filter((h) => h.occupantIds.length > 0);
  res.avgRentPaid = occ.length ? Math.round(occ.reduce((s, h) => s + h.rentPrice, 0) / occ.length) : 0;
  ensureHousingMarketSnapshots(res, 'Jan Y1');
  return res;
}

export function ensureHousingMarketSnapshots(housing: HousingState, label: string): void {
  const { houses } = housing;
  for (const h of houses) {
    if (h.originalBuyPrice === undefined) h.originalBuyPrice = h.buyPrice;
    if (h.leaseStartDay === undefined) h.leaseStartDay = 1;
  }
  if (!housing.districtMetrics) {
    const dm = {} as Record<DistrictId, DistrictMarketMetric>;
    for (const dist of DISTRICT_ORDER) {
      const dh = houses.filter((h) => h.district === dist);
      const vac = dh.filter((h) => h.occupantIds.length === 0).length;
      dm[dist] = { district: dist, vacancyRate: dh.length ? Math.round((vac / dh.length) * 100) : 0, avgRent: dh.length ? Math.round(dh.reduce((s, h) => s + h.rentPrice, 0) / dh.length) : 0, rentTrend: 'flat', lastDriftPct: 0 };
    }
    housing.districtMetrics = dm;
  }
  if (!housing.typePriceHistory?.length) {
    const avgP = (t: House['type']) => {
      const list = houses.filter((h) => h.type === t && h.buyPrice !== null);
      return list.length ? Math.round(list.reduce((s, h) => s + (h.buyPrice ?? 0), 0) / list.length) : Math.round((houses.find((h) => h.type === t)?.rentPrice ?? 80) * 100);
    };
    housing.typePriceHistory = [{ label, shared_room: avgP('shared_room'), small_flat: avgP('small_flat'), apartment: avgP('apartment'), villa: avgP('villa'), mansion: avgP('mansion') }];
  }
}

function assignCitizensInitialHouses(citizens: Citizen[], houses: House[]): void {
  // Sort wealthy/high-income down to poorest so mansions/villas fill first and shared rooms pair cleanly
  const ordered = [...citizens].sort((a, b) => (b.lastGrossPay + b.savings * 0.1) - (a.lastGrossPay + a.savings * 0.1));
  const emptyOfType = (t: HomeType) => houses.filter((h) => h.type === t && h.occupantIds.length === 0);

  const place = (c: Citizen, h: House, note: string) => {
    h.occupantIds.push(c.id);
    c.homeId = h.id;
    c.homeType = h.type;
    c.ownershipType = 'rented';
    c.landlordId = null;
    c.housingHistory = [{
      houseId: h.id, houseName: h.name, type: h.type, district: h.district,
      ownership: 'rented', startDay: 1, startDate: '1 Jan, Year 1', reason: note,
    }];
  };

  const remainingPoor: Citizen[] = [];
  for (const c of ordered) {
    const desired = c.homeType;
    if (desired === 'mansion' || desired === 'villa' || desired === 'apartment') {
      const cand = emptyOfType(desired)[0] ?? emptyOfType('apartment')[0] ?? emptyOfType('small_flat')[0];
      if (cand) { place(c, cand, 'Initial city settlement'); continue; }
    }
    remainingPoor.push(c);
  }

  // Pair poorest / unemployed into boarding rooms (2 each) and pair 2 Entry-level small flats
  const boardingPool = remainingPoor.filter((c) => c.homeType === 'shared_room' || c.roleLevel === 'Unemployed');
  const flatPool = remainingPoor.filter((c) => !boardingPool.includes(c));

  let bIdx = 0;
  for (const room of emptyOfType('shared_room')) {
    if (bIdx + 1 >= boardingPool.length) break;
    place(boardingPool[bIdx], room, 'Initial boarding assignment');
    place(boardingPool[bIdx + 1], room, 'Initial boarding assignment');
    bIdx += 2;
  }
  if (bIdx < boardingPool.length) flatPool.push(boardingPool[bIdx]);

  // Pair the 4 lowest-income flat candidates into 2 shared small flats, rest solo in small flats / apartments
  const orderedFlats = [...flatPool].sort((a, b) => (a.lastGrossPay + a.savings * 0.1) - (b.lastGrossPay + b.savings * 0.1));
  let fIdx = 0;
  for (let p = 0; p < 2 && fIdx + 1 < orderedFlats.length; p += 1) {
    const flat = emptyOfType('small_flat')[0];
    if (!flat) break;
    place(orderedFlats[fIdx], flat, 'Initial shared flat assignment');
    place(orderedFlats[fIdx + 1], flat, 'Initial shared flat assignment');
    fIdx += 2;
  }

  while (fIdx < orderedFlats.length) {
    const target = emptyOfType('small_flat')[0] ?? emptyOfType('apartment')[0] ?? houses.find((h) => h.occupantIds.length < h.capacity);
    if (!target) break;
    place(orderedFlats[fIdx], target, 'Initial flat assignment');
    fIdx += 1;
  }
}
