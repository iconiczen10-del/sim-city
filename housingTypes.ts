// housingTypes.ts — Core data types for Vij houses, applications, histories, transactions, and housing state

import type { HomeType } from './cityBaseTypes';
import type { ElectricLedger, HouseUsageProfile } from './electricityTypes';
import type {
  CitizenHousingPreferences, DistrictId, DistrictMarketMetric, HouseStatus,
  HousingSatisfactionBreakdown, OwnershipType, RoommateTolerance, TypePricePoint,
} from './housingPrefTypes';

export type {
  CitizenHousingPreferences, DistrictId, DistrictMarketMetric, HouseStatus,
  HousingSatisfactionBreakdown, OwnershipType, RoommateTolerance, TypePricePoint,
};

export interface HouseScores {
  comfort: number;
  space: number;
  noise: number;
  privacy: number;
  safety: number;
}

export interface HouseApplication {
  citizenId: string;
  citizenName: string;
  score: number;
  evictionCount: number;
  monthlyIncome: number;
  appliedDay: number;
}

export interface HouseMaintenanceEntry {
  day: number;
  dateLabel: string;
  cost: number;
  ownerLabel: string;
  deltaCondition: number;
}

export interface HouseEvictionEntry {
  day: number;
  dateLabel: string;
  citizenId: string;
  citizenName: string;
  missedMonths: number;
  reason: string;
}

export interface HouseConditionPoint {
  day: number;
  label: string;
  condition: number;
}

export interface House {
  id: string;
  name: string;
  type: HomeType;
  district: DistrictId;
  capacity: number;
  condition: number;
  ownerId: 'gov' | string;
  occupantIds: string[];
  baseRent: number;
  rentPrice: number;
  buyPrice: number | null;
  originalBuyPrice?: number | null;
  forSale: boolean;
  condemned: boolean;
  maintenanceUntilDay?: number;
  leaseStartDay?: number;
  scores: HouseScores;
  applications: HouseApplication[];
  maintenanceHistory: HouseMaintenanceEntry[];
  evictionHistory: HouseEvictionEntry[];
  conditionHistory: HouseConditionPoint[];
  lastMaintenancePaid: number;
  usageProfile?: HouseUsageProfile;
  electricLedger?: ElectricLedger;
}

export interface HousingTransaction {
  id: string;
  day: number;
  dateLabel: string;
  kind: 'bought' | 'sold' | 'rented' | 'evicted' | 'moved' | 'condemned';
  citizenId: string;
  citizenName: string;
  houseId: string;
  houseName: string;
  amount?: number;
  note: string;
}

export interface CitizenHousingEntry {
  houseId: string;
  houseName: string;
  type: HomeType;
  district: DistrictId;
  ownership: 'rented' | 'owned';
  startDay: number;
  startDate: string;
  endDay?: number;
  endDate?: string;
  reason?: string;
}

export interface EvictionRecord {
  day: number;
  dateLabel: string;
  houseId: string;
  houseName: string;
  landlordId: string;
  reason: string;
}

export interface HousingState {
  houses: House[];
  transactions: HousingTransaction[];
  treasuryRentThisMonth: number;
  evictionsThisMonth: number;
  avgRentPaid: number;
  districtMetrics?: Record<DistrictId, DistrictMarketMetric>;
  typePriceHistory?: TypePricePoint[];
}
