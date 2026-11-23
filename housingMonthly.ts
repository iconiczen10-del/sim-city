// housingMonthly.ts — Month-end house condition decay, owner maintenance, rent payments, arrears, and evictions

import { applyEmotionPulse } from './citizenEmotions';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta, formatMonthYear } from './formatters';
import { evictCitizenFromHouse } from './housingEviction';
import { stepMonthlyMarketDynamics } from './housingMarketDynamics';
import { stepMonthlyRoommateConflicts } from './housingRoommates';
import { computeHouseScores, getHouseMonthlyMaintenance, getTenantMonthlyRent, syncCitizenHousingLinks } from './housingScores';
import type { HousingState } from './housingTypes';
import { simRandInt } from './rng';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

function shouldEvictForArrears(missedMonths: number, landlord: Citizen | undefined, tenant: Citizen): boolean {
  if (missedMonths < 3) return false;
  if (!landlord) return true;
  if (landlord.traits.greed >= 65) return true;
  if (landlord.traits.patience >= 65 && missedMonths < 4) return false;
  if (landlord.traits.kindness >= 65 && (tenant.evictionRecords?.length ?? 0) === 0 && missedMonths < 4) return false;
  return true;
}

export function processHousingMonthEnd(params: {
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
  housing.treasuryRentThisMonth = 0;
  housing.evictionsThisMonth = 0;
  for (const c of citizens) c.lastRentalIncome = 0;

  for (const h of housing.houses) {
    if (h.condemned) continue;
    const maintCost = getHouseMonthlyMaintenance(h);
    let paidMaint = false;
    let ownerLabel = 'Government';
    if (h.ownerId === 'gov') {
      if (treasury >= maintCost) { treasury = Math.round((treasury - maintCost) * 100) / 100; paidMaint = true; }
    } else {
      const owner = byCit.get(h.ownerId);
      if (owner && owner.alive) {
        ownerLabel = owner.name;
        if (owner.savings >= maintCost) {
          owner.savings = Math.round((owner.savings - maintCost) * 100) / 100;
          paidMaint = true;
          appendLedgerEntry(owner, clock.totalDays, dateLabel, 'expense', 'Housing Maint', `Maintained ${h.name}`, maintCost);
        }
      } else { h.ownerId = 'gov'; h.forSale = h.type !== 'shared_room'; }
    }
    const drop = paidMaint ? (simRandInt(0, 1) === 0 ? 0 : 1) : simRandInt(1, 2);
    const prevCond = h.condition;
    h.condition = Math.max(0, h.condition - drop);
    h.lastMaintenancePaid = paidMaint ? maintCost : 0;
    h.maintenanceHistory = [{ day: clock.totalDays, dateLabel, cost: paidMaint ? maintCost : 0, ownerLabel, deltaCondition: h.condition - prevCond }, ...h.maintenanceHistory].slice(0, 24);
    h.conditionHistory = [...h.conditionHistory.slice(-59), { day: clock.totalDays, label: formatMonthYear(clock.month, clock.year), condition: h.condition }];
    if (h.condition <= 0) {
      h.condemned = true;
      for (const occId of [...h.occupantIds]) {
        const occ = byCit.get(occId);
        if (occ) evictCitizenFromHouse({ citizen: occ, house: h, housing, allCitizens: citizens, clock, dateLabel, missedMonths: 0, reason: `${h.name} condemned at 0 condition`, events });
      }
    }
  }

  let rentCollectedTotal = 0;
  let rentPaidCount = 0;
  for (const h of housing.houses) {
    if (h.condemned) continue;
    const landlord = h.ownerId !== 'gov' ? byCit.get(h.ownerId) : undefined;
    const baseTenant = getTenantMonthlyRent(h);
    for (const occId of [...h.occupantIds]) {
      const c = byCit.get(occId);
      if (!c || !c.alive || h.ownerId === c.id) continue;
      const perTenant = Math.round(baseTenant * (c.friendRentDiscount ?? 1));
      if (perTenant === 0) continue;
      const payable = Math.max(0, c.savings - 25);
      if (payable >= perTenant) {
        c.savings = Math.round((c.savings - perTenant) * 100) / 100;
        c.rentArrears = Math.max(0, Math.round(c.rentArrears - perTenant * 0.2));
        c.rentArrearsMonths = 0;
        if (h.ownerId === 'gov') { treasury = Math.round((treasury + perTenant) * 100) / 100; housing.treasuryRentThisMonth += perTenant; }
        else if (landlord && landlord.alive) {
          landlord.savings = Math.round((landlord.savings + perTenant) * 100) / 100;
          landlord.lastRentalIncome = (landlord.lastRentalIncome ?? 0) + perTenant;
          appendLedgerEntry(landlord, clock.totalDays, dateLabel, 'income', 'Rental Income', `Rent from ${c.name} (${h.name})`, perTenant);
        }
        appendLedgerEntry(c, clock.totalDays, dateLabel, 'expense', 'Housing', `Rent (${h.name})`, perTenant);
        rentCollectedTotal += perTenant; rentPaidCount += 1;
      } else {
        const missed = (c.rentArrearsMonths ?? 0) + 1;
        c.rentArrearsMonths = missed; c.rentArrears = Math.round(c.rentArrears + perTenant);
        addCitizenMemory(c, clock, dateLabel, 'broke', `Missed month #${missed} rent (${formatDelta(perTenant)}) at ${h.name}.`, -28);
        if (missed === 1) {
          applyEmotionPulse(c.emotions, 'sadness', 12, 'Rent overdue warning', clock, dateLabel);
          c.mood = clamp(c.mood - 6, 0, 100);
          appendLifeLog(c, clock.totalDays, dateLabel, 'money', `Warning: 1 month late on ${h.name} rent.`);
        } else if (missed === 2) {
          applyEmotionPulse(c.emotions, 'fear', 18, 'Final eviction notice', clock, dateLabel);
          c.stress = clamp(c.stress + 14, 0, 100);
          appendLifeLog(c, clock.totalDays, dateLabel, 'money', `Final Notice: 2 months late on ${h.name} rent.`);
          events.push(makeCityEvent(clock, `rentwarn_${c.id}`, { type: 'money', citizenId: c.id, citizenName: c.name, title: 'Final Rent Notice', detail: `${c.name} is 2 months behind on rent at ${h.name}.` }));
        } else if (shouldEvictForArrears(missed, landlord, c)) {
          evictCitizenFromHouse({ citizen: c, house: h, housing, allCitizens: citizens, clock, dateLabel, missedMonths: missed, reason: `${missed} consecutive missed rent payments`, events });
        }
      }
    }
    h.scores = computeHouseScores(h, h.occupantIds.map((id) => byCit.get(id)!).filter(Boolean), sharity);
  }

  housing.avgRentPaid = rentPaidCount > 0 ? Math.round(rentCollectedTotal / rentPaidCount) : housing.avgRentPaid;
  stepMonthlyRoommateConflicts({ citizens, housing, sharity, clock, dateLabel, events });
  treasury = stepMonthlyMarketDynamics({ citizens, housing, sharity, treasury, clock, dateLabel, events });
  syncCitizenHousingLinks(citizens, housing.houses, sharity);
  return treasury;
}
