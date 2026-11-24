// electricityCatalog.ts — Base power constants, 4 seasons, evening peak factor, and banded electric bill calculator

import type { ElectricBillRecord, ElectricLedger, RationingTier, TariffState, VijSeason } from './electricityTypes';
import type { HomeType } from './cityBaseTypes';
import type { CompanyId } from './companyTypes';

export const PLANT_CAPACITY_PER_HOUR = 60;
export const MAX_GAS_PLANTS = 8;
export const PLANT_BUILD_COST = 25000;
export const PLANT_BUILD_DAYS = 180;
export const FUEL_COST_PER_UNIT = 0.60;
export const PLANT_UPKEEP_PER_MONTH = 1500;
export const PLANT_REPAIR_COST = 3000;
export const PLANT_REPAIR_DAYS = 10;
export const RECONNECT_FEE = 50;
export const EVENING_PEAK_MULT = 1.6;

export const HOUSE_BASE_DAILY_UNITS: Record<HomeType, number> = {
  shared_room: 3,
  small_flat: 8,
  apartment: 12,
  villa: 20,
  mansion: 35,
};

export const COMPANY_BASE_DAILY_UNITS: Record<CompanyId, number> = {
  vijmart: 70,
  vijindustries: 120,
  vijtech: 60,
  vijcapital: 40,
  gjelectricity: 30,
};

export const RATIONING_LABELS: Record<RationingTier, string> = {
  ill_homes: 'Ill-Resident Homes',
  vijmart: 'Vij Mart',
  homes: 'General Homes',
  companies: 'Companies',
};

export function getSeasonFromMonth(month: number): VijSeason {
  if (month === 11 || month === 12 || month === 1) return 'Winter';
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  return 'Autumn';
}

export function getSeasonDemandMult(season: VijSeason): number {
  if (season === 'Summer') return 1.2;
  if (season === 'Winter') return 0.9;
  return 1.0;
}

export function createDefaultTariff(): TariffState {
  return {
    multiplier: 1.0,
    connectionPerDay: 1.0,
    band1Rate: 0.5,
    band2Rate: 1.5,
    band3Rate: 2.5,
    lastChangedDay: 1,
    lastReason: 'Standard opening tariff (∆0.50 / ∆1.50 / ∆2.50)',
  };
}

export function createEmptyElectricLedger(): ElectricLedger {
  return {
    todayUnits: 0,
    monthUnits: 0,
    dailyUnitsHistory: [],
    monthlyUnitsHistory: [],
    activeSpikes: [],
    spikeHistory: [],
    bills: [],
    unpaidMonths: 0,
    arrearsBalance: 0,
    powerCut: false,
    blackedOutToday: false,
    disconnectNotice: null,
  };
}

export function calculateElectricBill(params: {
  id: string;
  units: number;
  tariff: TariffState;
  days?: number;
  month: number;
  year: number;
  dateLabel: string;
  priorArrears?: number;
}): ElectricBillRecord {
  const { id, tariff, month, year, dateLabel, priorArrears = 0 } = params;
  const days = params.days ?? 30;
  const units = Math.max(0, Math.round(params.units * 10) / 10);
  const mult = tariff.multiplier;
  const connectionFee = Math.round(days * tariff.connectionPerDay * 100) / 100;

  const band1Units = Math.min(units, 60);
  const band2Units = Math.min(Math.max(0, units - 60), 120);
  const band3Units = Math.max(0, units - 180);

  const band1Charge = Math.round(band1Units * tariff.band1Rate * mult * 100) / 100;
  const band2Charge = Math.round(band2Units * tariff.band2Rate * mult * 100) / 100;
  const band3Charge = Math.round(band3Units * tariff.band3Rate * mult * 100) / 100;
  const lateFee = priorArrears > 0 ? Math.round(priorArrears * 0.05 * 100) / 100 : 0;
  const totalDue = Math.round((connectionFee + band1Charge + band2Charge + band3Charge + lateFee) * 100) / 100;

  return {
    id,
    month,
    year,
    dateLabel,
    units,
    days,
    connectionFee,
    band1Units: Math.round(band1Units * 10) / 10,
    band1Charge,
    band2Units: Math.round(band2Units * 10) / 10,
    band2Charge,
    band3Units: Math.round(band3Units * 10) / 10,
    band3Charge,
    lateFee,
    totalDue,
    paidAmount: 0,
    status: 'unpaid',
  };
}
