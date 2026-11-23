// citizenNeeds.ts — 8-need initialization, daily drain/restoration, bathing water cost, and leisure spend

import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import type { CitizenNeed, NeedId } from './citizenRealTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import type { MartState } from './martTypes';
import { simRandInt } from './rng';
import type { Citizen, CityEvent, CitizenTraits, HomeType } from './types';

const HOME_COMFORT: Record<HomeType, number> = {
  shared_room: 38,
  small_flat: 58,
  apartment: 76,
  villa: 90,
  mansion: 98,
};

const HOME_SECURITY: Record<HomeType, number> = {
  shared_room: 62,
  small_flat: 72,
  apartment: 80,
  villa: 88,
  mansion: 94,
};

function r1(n: number): number { return Math.round(n * 10) / 10; }

export function computeShelterScore(homeType: HomeType, traits: CitizenTraits, rentArrears: number, hasHouseholdSupplies: boolean): number {
  const base = HOME_COMFORT[homeType];
  const neatAdj = (traits.neatness - 50) * 0.16;
  const supplyAdj = hasHouseholdSupplies ? 4 : -10;
  const arrearsAdj = rentArrears > 0 ? -18 : 0;
  return r1(clamp(base + neatAdj + supplyAdj + arrearsAdj, 10, 100));
}

export function createSeedNeeds(homeType: HomeType, traits: CitizenTraits, hunger: number, thirst: number): Record<NeedId, CitizenNeed> {
  const socDrain = r1(6 + traits.sociability * 0.1);
  const funDrain = r1(Math.max(3.5, 9 - (traits.thriftiness + traits.discipline) * 0.03));
  return {
    thirst: { id: 'thirst', name: 'Thirst', value: r1(thirst), drainRate: 45, lastRestoredDay: 1 },
    hunger: { id: 'hunger', name: 'Hunger', value: r1(hunger), drainRate: 36, lastRestoredDay: 1 },
    energy: { id: 'energy', name: 'Energy / Sleep', value: simRandInt(88, 99), drainRate: 22, lastRestoredDay: 1 },
    hygiene: { id: 'hygiene', name: 'Hygiene', value: simRandInt(86, 99), drainRate: r1(11 - traits.neatness * 0.03), lastRestoredDay: 1 },
    shelter: { id: 'shelter', name: 'Shelter Comfort', value: computeShelterScore(homeType, traits, 0, true), drainRate: 0, lastRestoredDay: 1 },
    safety: { id: 'safety', name: 'Safety', value: clamp(HOME_SECURITY[homeType] + simRandInt(-4, 4), 20, 100), drainRate: 0, lastRestoredDay: 1 },
    social: { id: 'social', name: 'Social Contact', value: simRandInt(84, 98), drainRate: socDrain, lastRestoredDay: 1 },
    fun: { id: 'fun', name: 'Fun / Recreation', value: simRandInt(84, 98), drainRate: funDrain, lastRestoredDay: 1 },
  };
}

export function stepCitizenNeedsDaily(
  c: Citizen,
  mart: MartState,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): void {
  const n = c.needs;
  n.thirst.value = r1(c.thirst);
  n.hunger.value = r1(c.hunger);
  if (c.thirst >= 70) n.thirst.lastRestoredDay = clock.totalDays;
  if (c.hunger >= 70) n.hunger.lastRestoredDay = clock.totalDays;

  if (c.homeId === undefined) {
    const hasSupply = c.inventory.household.length > 0;
    n.shelter.value = computeShelterScore(c.homeType, c.traits, c.rentArrears, hasSupply);
    n.shelter.lastRestoredDay = clock.totalDays;
    const recentThreat = c.memories.some((m) => clock.totalDays - m.totalDay <= 10 && (m.kind === 'loss' || m.kind === 'theft_victim'));
    const secTarget = HOME_SECURITY[c.homeType] - (recentThreat ? 22 : 0) - (mart.recentSabotageDays > 0 ? 8 : 0) - (c.rentArrears > 0 ? 8 : 0);
    n.safety.value = r1(clamp(n.safety.value + (secTarget - n.safety.value) * 0.25, 10, 100));
    if (n.safety.value >= 70) n.safety.lastRestoredDay = clock.totalDays;
  }
  const hasSupply = c.inventory.household.length > 0;

  const isLabor = c.employerId === 'vijindustries' || c.employerId === 'vijmart';
  const energyDrain = (isLabor && c.roleLevel !== 'Unemployed' ? 24 : 20) * (c.sleepEnergyMult ?? 1);
  const sleepQuality = c.homeId === null ? 6 : 17 + (n.shelter.value / 100) * 6 + (n.safety.value / 100) * 3 + (c.healthProfile.fitness / 100) * 2;
  n.energy.drainRate = r1(energyDrain);
  n.energy.value = r1(clamp(n.energy.value - energyDrain + sleepQuality, 0, 100));
  if (n.energy.value >= 68) n.energy.lastRestoredDay = clock.totalDays;

  const hygDrain = r1((11 - c.traits.neatness * 0.03 + (isLabor ? 1.5 : 0)) * (c.hygieneDrainMult ?? 1));
  n.hygiene.drainRate = hygDrain;
  n.hygiene.value = r1(clamp(n.hygiene.value - hygDrain, 0, 100));
  const waterAvail = c.inventory.water.reduce((s, w) => s + w.days, 0);
  if (n.hygiene.value < (c.traits.neatness > 60 ? 82 : 70) && waterAvail > 0) {
    c.bathWaterDebt = (c.bathWaterDebt ?? 0) + 0.25;
    if (c.bathWaterDebt >= 1 && c.inventory.water[0]) {
      c.bathWaterDebt -= 1;
      c.inventory.water[0].days -= 1;
      c.inventory.water = c.inventory.water.filter((w) => w.days > 0);
    }
    n.hygiene.value = r1(clamp(n.hygiene.value + (hasSupply ? 36 : 24), 0, 100));
    n.hygiene.lastRestoredDay = clock.totalDays;
  }

  const socDrain = r1(6 + c.traits.sociability * 0.1);
  n.social.drainRate = socDrain;
  const workContact = c.roleLevel !== 'Unemployed' && (c.healthProfile.breakdownUntilDay ?? 0) < clock.totalDays ? 8 : 0;
  const homeContact = c.homeType === 'shared_room' ? 3 : 0;
  n.social.value = r1(clamp(n.social.value - socDrain + workContact + homeContact, 0, 100));
  if (workContact > 0 && n.social.value >= 55) n.social.lastRestoredDay = clock.totalDays;

  const funDrain = r1(Math.max(3.5, 9 - (c.traits.thriftiness + c.traits.discipline) * 0.03));
  n.fun.drainRate = funDrain;
  const stdLeisure = Math.max(0, (c.standards.household - 2) * 3 + (c.standards.food - 2) * 1.5);
  n.fun.value = r1(clamp(n.fun.value - funDrain + stdLeisure, 0, 100));
  if (n.fun.value < 52 && c.savings > 140 && c.traits.thriftiness < 78) {
    const spend = c.savings > 1500 ? 12 : 5;
    c.savings = Math.round((c.savings - spend) * 100) / 100;
    mart.cash = Math.round((mart.cash + spend) * 100) / 100;
    mart.todayRevenue = Math.round((mart.todayRevenue + spend) * 100) / 100;
    n.fun.value = r1(clamp(n.fun.value + (spend >= 10 ? 28 : 16), 0, 100));
    n.fun.lastRestoredDay = clock.totalDays;
    appendLedgerEntry(c, clock.totalDays, dateLabel, 'expense', 'Leisure', 'Entertainment & Recreation', spend);
  } else if (stdLeisure >= 5) {
    n.fun.lastRestoredDay = clock.totalDays;
  }

  if (clock.totalDays % 5 === 0) {
    for (const need of [n.energy, n.hygiene, n.social, n.fun]) {
      if (need.value <= 12) {
        events.push(makeCityEvent(clock, `needcrit_${need.id}_${c.id}`, {
          type: 'need-critical', citizenId: c.id, citizenName: c.name,
          title: `${need.name} Critical`, detail: `${c.name}'s ${need.name.toLowerCase()} dropped to ${Math.round(need.value)}/100.`,
        }));
        appendLifeLog(c, clock.totalDays, dateLabel, 'health', `${need.name} hit critical low (${Math.round(need.value)}/100).`);
        break;
      }
    }
  }
}
