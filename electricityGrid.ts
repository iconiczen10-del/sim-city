// electricityGrid.ts — Daily gas plant build/repair progress, evening peak load shedding, blackouts, and fuel cost

import { appendCompanyLedger } from './companyLedger';
import type { Company } from './companyTypes';
import { FUEL_COST_PER_UNIT, getSeasonFromMonth, PLANT_CAPACITY_PER_HOUR } from './electricityCatalog';
import { shedEveningPeakLoad } from './electricityRationing';
import type { ElectricityState } from './electricityTypes';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { HousingState } from './housingTypes';
import type { Citizen, CityEvent } from './types';

export function stepElectricityGridDaily(params: {
  electricity: ElectricityState;
  housing: HousingState;
  citizens: Citizen[];
  companies: Company[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { electricity, housing, citizens, companies, clock, dateLabel, events } = params;
  const gj = companies.find((c) => c.id === 'gjelectricity');
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const season = getSeasonFromMonth(clock.month);

  for (const p of electricity.plants) {
    if (p.status === 'building' && p.daysRemaining > 0) {
      p.daysRemaining -= 1;
      if (p.daysRemaining <= 0) {
        p.status = 'online';
        p.capacityPerHour = PLANT_CAPACITY_PER_HOUR;
        p.builtDay = clock.totalDays;
        events.push(makeCityEvent(clock, `plant_done_${p.id}`, {
          type: 'plant-built', companyId: 'gjelectricity',
          title: `${p.name} Online`,
          detail: `GJ Electricity completed ${p.name} (+${PLANT_CAPACITY_PER_HOUR} units/hr).`,
        }));
      }
    } else if (p.status === 'repairing' && p.daysRemaining > 0) {
      p.daysRemaining -= 1;
      if (p.daysRemaining <= 0) {
        p.status = 'online';
        p.capacityPerHour = PLANT_CAPACITY_PER_HOUR;
        events.push(makeCityEvent(clock, `plant_rep_${p.id}`, {
          type: 'plant-built', companyId: 'gjelectricity',
          title: `${p.name} Repaired`,
          detail: `GJ Electricity restored ${p.name} to ${PLANT_CAPACITY_PER_HOUR} units/hr.`,
        }));
      }
    }
  }

  const onlinePlants = electricity.plants.filter((p) => p.status === 'online');
  const capPerHour = onlinePlants.length * PLANT_CAPACITY_PER_HOUR;
  electricity.todayCapacityPerHour = capPerHour;

  const peak = electricity.todayPeakDemandPerHour;

  if (peak > capPerHour) {
    const shortfall = Math.round((peak - capPerHour) * 10) / 10;
    const { cutHouses, cutComps, cutDistricts } = shedEveningPeakLoad({
      shortfall, housing, citizensById: byId, companies, electricity,
    });
    const reason = capPerHour === 0 ? 'All gas plants offline' : `${season} evening peak (${peak} u/hr) exceeded capacity (${capPerHour} u/hr)`;
    electricity.blackouts = [{
      id: `blk_${clock.totalDays}`,
      totalDay: clock.totalDays, dateLabel, season,
      peakDemandPerHour: peak, availableCapacityPerHour: capPerHour, shortfallPerHour: shortfall,
      affectedDistricts: [...cutDistricts], affectedHouseIds: [...cutHouses], affectedCompanyIds: [...cutComps],
      reason,
    }, ...electricity.blackouts].slice(0, 80);

    events.push(makeCityEvent(clock, `blk_${clock.totalDays}`, {
      type: 'blackout', companyId: 'gjelectricity',
      title: 'Evening Peak Blackout & Rationing',
      detail: `${reason}; rationed ${cutHouses.size} home(s) and ${cutComps.size} company unit(s).`,
    }));
  }

  const generatedUnits = Math.min(electricity.todayCityUnits, capPerHour * 24);
  const fuelCost = Math.round(generatedUnits * FUEL_COST_PER_UNIT * 100) / 100;
  electricity.todayFuelCost = fuelCost;
  if (clock.day === 1) electricity.monthlyFuelCost = 0;
  electricity.monthlyFuelCost = Math.round((electricity.monthlyFuelCost + fuelCost) * 100) / 100;

  if (gj && !gj.bankrupt && fuelCost > 0) {
    gj.cash = Math.round((gj.cash - fuelCost) * 100) / 100;
    gj.monthlyOtherCost = Math.round((gj.monthlyOtherCost + fuelCost) * 100) / 100;
    appendCompanyLedger(gj, clock, dateLabel, {
      kind: 'outflow', category: 'plant_fuel',
      label: 'Daily Gas Fuel Burn',
      detail: `${generatedUnits.toFixed(0)} units @ ${formatDelta(FUEL_COST_PER_UNIT)}/u`,
      amount: fuelCost, balanceAfter: gj.cash,
    });
  }

  const shortDate = `${clock.day} ${dateLabel.split(' ')[1]?.replace(',', '') ?? ''}`;
  electricity.demandHistory = [...electricity.demandHistory.slice(-59), {
    day: clock.totalDays, label: shortDate, totalUnits: electricity.todayCityUnits, peakPerHour: peak, capacityPerHour: capPerHour,
  }];

  const houseById = new Map(housing.houses.map((h) => [h.id, h]));
  for (const c of citizens) {
    if (!c.alive) continue;
    const h = c.homeId ? houseById.get(c.homeId) : undefined;
    const leg = h?.electricLedger;
    c.housePowerCutToday = Boolean(leg && (leg.powerCut || leg.blackedOutToday));
    c.electricPowerCut = Boolean(leg?.powerCut);
    c.electricArrears = Math.round((leg?.arrearsBalance ?? 0) * 100) / 100;
    c.electricUnpaidMonths = leg?.unpaidMonths ?? 0;
  }
}
