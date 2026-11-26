// electricityActions.ts — Manual CEO actions for GJ Electricity: build/repair plants, district cuts, priorities, tariff

import { appendCompanyLedger } from './companyLedger';
import type { CompanyId } from './companyTypes';
import { MAX_GAS_PLANTS, PLANT_BUILD_COST, PLANT_BUILD_DAYS, PLANT_CAPACITY_PER_HOUR, PLANT_REPAIR_COST, PLANT_REPAIR_DAYS } from './electricityCatalog';
import type { RationingTier } from './electricityTypes';
import { clamp } from './economy';
import { makeCityEvent } from './eventFactory';
import { formatMonthYear, formatSimDate } from './formatters';
import { DISTRICTS } from './housingCatalog';
import type { DistrictId } from './housingTypes';
import { recordSimEvent } from './recordsStore';
import type { CityState } from './types';

function clockFrom(city: CityState) {
  return { totalDays: city.totalDays, day: city.day, month: city.month, year: city.year };
}

export function buildGJPlant(prev: CityState): CityState {
  if (!prev.electricity) return prev;
  const next = structuredClone(prev);
  const gj = next.companies.find((c) => c.id === 'gjelectricity');
  const el = next.electricity!;
  if (!gj || gj.bankrupt || el.plants.length >= MAX_GAS_PLANTS || gj.cash < PLANT_BUILD_COST) return prev;

  gj.cash = Math.round((gj.cash - PLANT_BUILD_COST) * 100) / 100;
  const idx = el.plants.length + 1;
  const name = `Vij Gas Unit ${idx}`;
  el.plants.push({
    id: `plant_${idx}`, name, capacityPerHour: PLANT_CAPACITY_PER_HOUR,
    status: 'building', daysRemaining: PLANT_BUILD_DAYS, upkeepPaidMonth: true, builtDay: 0, failuresCount: 0,
  });
  const clock = clockFrom(next);
  const dateLabel = formatSimDate(next.day, next.month, next.year);
  appendCompanyLedger(gj, clock, dateLabel, {
    kind: 'outflow', category: 'plant_capex', label: `Build ${name}`,
    detail: `CEO ordered 180-day gas plant construction`, amount: PLANT_BUILD_COST, balanceAfter: gj.cash,
  });
  next.events.unshift(makeCityEvent(clock, `ceo_build_${idx}_${Date.now()}`, {
    type: 'plant-built', companyId: 'gjelectricity', title: `Building ${name}`,
    detail: `GJ Electricity CEO started ${name} (∆25,000, ${PLANT_BUILD_DAYS} days).`,
  }));
  return next;
}

export function repairGJPlant(prev: CityState, plantId: string): CityState {
  if (!prev.electricity) return prev;
  const next = structuredClone(prev);
  const gj = next.companies.find((c) => c.id === 'gjelectricity');
  const plant = next.electricity!.plants.find((p) => p.id === plantId);
  if (!gj || !plant || plant.status !== 'failed' || gj.cash < PLANT_REPAIR_COST) return prev;

  gj.cash = Math.round((gj.cash - PLANT_REPAIR_COST) * 100) / 100;
  plant.status = 'repairing';
  plant.daysRemaining = PLANT_REPAIR_DAYS;
  const clock = clockFrom(next);
  const dl = formatSimDate(next.day, next.month, next.year);
  appendCompanyLedger(gj, clock, dl, {
    kind: 'outflow', category: 'plant_capex', label: `Repair ${plant.name}`,
    detail: `CEO ordered 10-day repair`, amount: PLANT_REPAIR_COST, balanceAfter: gj.cash,
  });
  recordSimEvent({ simDay: next.totalDays, dateLabel: dl, category: 'gjelectricity', subType: 'plant_repair', subjectId: 'gjelectricity', subjectKind: 'gjelectricity', subjectName: 'GJ Electricity', summary: `CEO ordered repair for ${plant.name}`, detail: { plantId } });
  return next;
}

export function toggleDistrictPowerCut(prev: CityState, district: DistrictId): CityState {
  if (!prev.electricity) return prev;
  const next = structuredClone(prev);
  const el = next.electricity!;
  const has = el.manualCutDistricts.includes(district);
  el.manualCutDistricts = has ? el.manualCutDistricts.filter((d) => d !== district) : [...el.manualCutDistricts, district];
  const clock = clockFrom(next);
  next.events.unshift(makeCityEvent(clock, `dcut_${district}_${Date.now()}`, {
    type: 'power-cut', companyId: 'gjelectricity',
    title: has ? `${DISTRICTS[district].label} Power Restored` : `${DISTRICTS[district].label} Power Cut`,
    detail: `GJ Electricity CEO ${has ? 'restored supply to' : 'cut grid feed for'} ${DISTRICTS[district].label}.`,
  }));
  recordSimEvent({ simDay: next.totalDays, dateLabel: formatSimDate(next.day, next.month, next.year), category: 'gjelectricity', subType: 'grid_control', subjectId: 'gjelectricity', subjectKind: 'gjelectricity', subjectName: 'GJ Electricity', summary: `CEO ${has ? 'restored' : 'cut'} grid power for ${DISTRICTS[district].label}`, detail: { district, restored: has } });
  return next;
}

export function toggleCompanyPowerCut(prev: CityState, companyId: CompanyId): CityState {
  if (!prev.electricity || companyId === 'gjelectricity') return prev;
  const next = structuredClone(prev);
  const el = next.electricity!;
  const has = el.manualCutCompanies.includes(companyId);
  el.manualCutCompanies = has ? el.manualCutCompanies.filter((id) => id !== companyId) : [...el.manualCutCompanies, companyId];
  recordSimEvent({ simDay: next.totalDays, dateLabel: formatSimDate(next.day, next.month, next.year), category: 'gjelectricity', subType: 'grid_control', subjectId: 'gjelectricity', subjectKind: 'gjelectricity', subjectName: 'GJ Electricity', summary: `CEO ${has ? 'restored' : 'cut'} grid feed for ${companyId}`, detail: { companyId, restored: has } });
  return next;
}

export function moveRationingPriority(prev: CityState, tier: RationingTier, dir: -1 | 1): CityState {
  if (!prev.electricity) return prev;
  const next = structuredClone(prev);
  const arr = [...next.electricity!.rationingPriority];
  const idx = arr.indexOf(tier);
  const swap = idx + dir;
  if (idx < 0 || swap < 0 || swap >= arr.length) return prev;
  [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
  next.electricity!.rationingPriority = arr;
  recordSimEvent({ simDay: next.totalDays, dateLabel: formatSimDate(next.day, next.month, next.year), category: 'gjelectricity', subType: 'rationing_priority', subjectId: 'gjelectricity', subjectKind: 'gjelectricity', subjectName: 'GJ Electricity', summary: `CEO updated rationing priority (${arr.join(' > ')})`, detail: { rationingPriority: arr, tier, dir } });
  return next;
}

export function setGJTariffMultiplier(prev: CityState, nextMult: number): CityState {
  if (!prev.electricity) return prev;
  const next = structuredClone(prev);
  const mult = Math.round(clamp(nextMult, 0.7, 1.5) * 100) / 100;
  const el = next.electricity!;
  el.tariff.multiplier = mult;
  el.tariff.lastChangedDay = next.totalDays;
  el.tariff.lastReason = `CEO set tariff to ${Math.round((mult - 1) * 100)}% vs base`;
  el.tariffHistory = [...el.tariffHistory.slice(-23), {
    day: next.totalDays, label: formatMonthYear(next.month, next.year),
    multiplier: mult, effectiveBand2: Math.round(1.5 * mult * 100) / 100,
  }];
  next.events.unshift(makeCityEvent(clockFrom(next), `tar_${Date.now()}`, {
    type: 'tariff-change', companyId: 'gjelectricity',
    title: 'Electricity Tariff Updated',
    detail: `GJ Electricity set tariff multiplier to ${mult.toFixed(2)}x (${Math.round((mult - 1) * 100)}%).`,
  }));
  return next;
}
