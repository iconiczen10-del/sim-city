// electricityTypes.ts — Data structures for GJ Electricity, gas plants, usage profiles, bills, and blackouts

import type { CompanyId } from './companyTypes';
import type { CompanyUsageProfile, HouseUsageProfile, UsageSpikeEvent } from './electricityProfileTypes';
import type { GJSubsidyLogEntry, GJSubsidyMood, HouseSubsidyPackage, SimGodSubsidyLevel } from './gjSubsidyTypes';
import type { DistrictId } from './housingPrefTypes';

export type { CompanyUsageProfile, HouseUsageProfile, UsageSpikeEvent };

export type VijSeason = 'Winter' | 'Spring' | 'Summer' | 'Autumn';
export type RationingTier = 'ill_homes' | 'vijmart' | 'homes' | 'companies';

export interface GasPlant {
  id: string;
  name: string;
  capacityPerHour: number;
  status: 'online' | 'building' | 'failed' | 'repairing';
  daysRemaining: number;
  upkeepPaidMonth: boolean;
  builtDay: number;
  failuresCount: number;
}

export interface TariffState {
  multiplier: number; // 0.70 (-30%) to 1.50 (+50%), default 1.0
  connectionPerDay: number; // ∆1/day
  band1Rate: number; // ∆0.50 (0-60u)
  band2Rate: number; // ∆1.50 (61-180u)
  band3Rate: number; // ∆2.50 (181+u)
  lastChangedDay: number;
  lastReason: string;
}

export interface TariffHistoryPoint {
  day: number;
  label: string;
  multiplier: number;
  effectiveBand2: number;
}

export interface ElectricBillRecord {
  id: string;
  month: number;
  year: number;
  dateLabel: string;
  units: number;
  days: number;
  connectionFee: number;
  band1Units: number;
  band1Charge: number;
  band2Units: number;
  band2Charge: number;
  band3Units: number;
  band3Charge: number;
  lateFee: number;
  totalDue: number;
  paidAmount: number;
  subsidyAbsorbed?: number;
  subsidySummary?: string;
  incomeCapApplied?: number;
  paymentPlanUsed?: number;
  status: 'paid' | 'partial' | 'unpaid' | 'disconnected' | 'reconnected';
}

export interface ElectricLedger {
  todayUnits: number;
  monthUnits: number;
  dailyUnitsHistory: { day: number; label: string; units: number }[];
  monthlyUnitsHistory: { label: string; units: number; amount: number }[];
  activeSpikes: UsageSpikeEvent[];
  spikeHistory: UsageSpikeEvent[];
  bills: ElectricBillRecord[];
  unpaidMonths: number;
  arrearsBalance: number;
  powerCut: boolean;
  blackedOutToday: boolean;
  lastPowerCutDay?: number;
  disconnectNotice: string | null;
  currentSubsidy?: HouseSubsidyPackage | null;
  subsidyHistory?: HouseSubsidyPackage[];
  paymentPlanBalance?: number;
  paymentPlanMonthsLeft?: number;
}

export interface BlackoutRecord {
  id: string;
  totalDay: number;
  dateLabel: string;
  season: VijSeason;
  peakDemandPerHour: number;
  availableCapacityPerHour: number;
  shortfallPerHour: number;
  affectedDistricts: DistrictId[];
  affectedHouseIds: string[];
  affectedCompanyIds: CompanyId[];
  reason: string;
}

export interface ElectricityState {
  plants: GasPlant[];
  tariff: TariffState;
  tariffHistory: TariffHistoryPoint[];
  rationingPriority: RationingTier[];
  manualCutDistricts: DistrictId[];
  manualCutCompanies: CompanyId[];
  companyProfiles: Record<CompanyId, CompanyUsageProfile>;
  companyLedgers: Record<CompanyId, ElectricLedger>;
  todayCityUnits: number;
  todayPeakDemandPerHour: number;
  todayCapacityPerHour: number;
  todayFuelCost: number;
  monthlyFuelCost: number;
  monthlyUpkeepCost: number;
  monthlyBilledTotal: number;
  monthlyCollectedTotal: number;
  blackouts: BlackoutRecord[];
  demandHistory: { day: number; label: string; totalUnits: number; peakPerHour: number; capacityPerHour: number }[];
  subsidyMood?: GJSubsidyMood;
  simgodMoodOverride?: GJSubsidyMood | null;
  simgodLevelOverride?: SimGodSubsidyLevel;
  monthlySubsidyAbsorbed?: number;
  totalSubsidyAbsorbed?: number;
  householdsHelpedCount?: number;
  subsidyLog?: GJSubsidyLogEntry[];
}
