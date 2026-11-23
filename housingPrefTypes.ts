// housingPrefTypes.ts — Housing preferences, satisfaction breakdown, and market dynamics types

import type { HomeType } from './cityBaseTypes';

export type DistrictId = 'old_town' | 'mill_quarter' | 'greenfield' | 'riverside' | 'hilltop';
export type HouseStatus = 'occupied' | 'vacant' | 'for_sale' | 'condemned';
export type OwnershipType = 'rented' | 'owned' | 'homeless';
export type RoommateTolerance = 'welcomes' | 'neutral' | 'prefers_alone';

export interface CitizenHousingPreferences {
  preferredType: HomeType;
  preferredDistrict: DistrictId;
  maxRentRatio: number;
  roommateTolerance: RoommateTolerance;
  lastDriftYear: number;
}

export interface HousingSatisfactionBreakdown {
  total: number;
  affordability: number;
  typeMatch: number;
  districtMatch: number;
  condition: number;
  roommates: number;
}

export interface DistrictMarketMetric {
  district: DistrictId;
  vacancyRate: number;
  avgRent: number;
  rentTrend: 'up' | 'down' | 'flat';
  lastDriftPct: number;
}

export interface TypePricePoint {
  label: string;
  shared_room: number;
  small_flat: number;
  apartment: number;
  villa: number;
  mansion: number;
}
