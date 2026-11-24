// electricityPlantMonthly.ts — Monthly GJ Electricity plant upkeep, failure rolls, repairs, and AI expansion/tariff

import { appendCompanyLedger } from './companyLedger';
import type { Company } from './companyTypes';
import {
  MAX_GAS_PLANTS, PLANT_BUILD_COST, PLANT_BUILD_DAYS,
  PLANT_CAPACITY_PER_HOUR, PLANT_REPAIR_COST, PLANT_REPAIR_DAYS, PLANT_UPKEEP_PER_MONTH,
} from './electricityCatalog';
import type { ElectricityState } from './electricityTypes';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatMonthYear } from './formatters';
import { simRand } from './rng';
import type { Citizen, CityEvent } from './types';

export function stepGJPlantsAndAIMonthEnd(params: {
  electricity: ElectricityState;
  gj: Company | undefined;
  citizensById: Map<string, Citizen>;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { electricity, gj, citizensById, clock, dateLabel, events } = params;
  const monthLabel = formatMonthYear(clock.month, clock.year);

  let upkeepPaid = 0;
  for (const p of electricity.plants) {
    if (p.status === 'building') continue;
    if (gj && gj.cash >= PLANT_UPKEEP_PER_MONTH) {
      gj.cash = Math.round((gj.cash - PLANT_UPKEEP_PER_MONTH) * 100) / 100;
      gj.monthlyOtherCost = Math.round((gj.monthlyOtherCost + PLANT_UPKEEP_PER_MONTH) * 100) / 100;
      upkeepPaid += PLANT_UPKEEP_PER_MONTH;
      p.upkeepPaidMonth = true;
    } else {
      p.upkeepPaidMonth = false;
    }
    if (p.status === 'online' && simRand() < (p.upkeepPaidMonth ? 0.02 : 0.18)) {
      p.status = 'failed';
      p.capacityPerHour = 0;
      p.failuresCount += 1;
      events.push(makeCityEvent(clock, `pfail_${p.id}_${clock.totalDays}`, {
        type: 'plant-failed',
        companyId: 'gjelectricity',
        title: `${p.name} Failed`,
        detail: `${p.name} went offline (${p.upkeepPaidMonth ? 'mechanical fault' : 'skipped upkeep'}). Repair costs ∆${PLANT_REPAIR_COST}.`,
      }));
    }
  }
  electricity.monthlyUpkeepCost = upkeepPaid;
  if (gj && upkeepPaid > 0) {
    appendCompanyLedger(gj, clock, dateLabel, {
      kind: 'outflow',
      category: 'plant_upkeep',
      label: 'Monthly Plant Upkeep',
      detail: `${upkeepPaid / PLANT_UPKEEP_PER_MONTH} plant(s) serviced`,
      amount: upkeepPaid,
      balanceAfter: gj.cash,
    });
  }

  if (!gj || gj.bankrupt) return;

  for (const p of electricity.plants) {
    if (p.status === 'failed' && gj.cash >= PLANT_REPAIR_COST + 2000) {
      gj.cash = Math.round((gj.cash - PLANT_REPAIR_COST) * 100) / 100;
      p.status = 'repairing';
      p.daysRemaining = PLANT_REPAIR_DAYS;
      appendCompanyLedger(gj, clock, dateLabel, {
        kind: 'outflow',
        category: 'plant_capex',
        label: `Repair ${p.name}`,
        detail: '10-day repair started',
        amount: PLANT_REPAIR_COST,
        balanceAfter: gj.cash,
      });
    }
  }

  const peakRatio = electricity.todayCapacityPerHour > 0
    ? electricity.todayPeakDemandPerHour / electricity.todayCapacityPerHour
    : 1.5;
  if (peakRatio > 0.85 && electricity.plants.length < MAX_GAS_PLANTS && gj.cash >= PLANT_BUILD_COST + 6000) {
    gj.cash = Math.round((gj.cash - PLANT_BUILD_COST) * 100) / 100;
    const idx = electricity.plants.length + 1;
    electricity.plants.push({
      id: `plant_${idx}`,
      name: `Vij Gas Unit ${idx}`,
      capacityPerHour: PLANT_CAPACITY_PER_HOUR,
      status: 'building',
      daysRemaining: PLANT_BUILD_DAYS,
      upkeepPaidMonth: true,
      builtDay: 0,
      failuresCount: 0,
    });
    appendCompanyLedger(gj, clock, dateLabel, {
      kind: 'outflow',
      category: 'plant_capex',
      label: `Build Vij Gas Unit ${idx}`,
      detail: `${PLANT_BUILD_DAYS}-day plant construction`,
      amount: PLANT_BUILD_COST,
      balanceAfter: gj.cash,
    });
    events.push(makeCityEvent(clock, `pbld_${idx}`, {
      type: 'plant-built',
      companyId: 'gjelectricity',
      title: 'New Gas Plant Started',
      detail: `GJ Electricity broke ground on Vij Gas Unit ${idx} (180 days, ∆25,000).`,
    }));
  }

  const ceo = gj.ceoId ? citizensById.get(gj.ceoId) : undefined;
  if (gj.lastMonthProfit < -500 && electricity.tariff.multiplier < 1.35) {
    electricity.tariff.multiplier = Math.round(Math.min(1.5, electricity.tariff.multiplier + (ceo && ceo.traits.greed > 65 ? 0.12 : 0.06)) * 100) / 100;
    electricity.tariff.lastChangedDay = clock.totalDays;
    electricity.tariff.lastReason = 'AI raised tariff to cover operating deficit';
    electricity.tariffHistory = [
      ...electricity.tariffHistory.slice(-23),
      { day: clock.totalDays, label: monthLabel, multiplier: electricity.tariff.multiplier, effectiveBand2: Math.round(1.5 * electricity.tariff.multiplier * 100) / 100 },
    ];
  }
}
