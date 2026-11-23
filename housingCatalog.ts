// housingCatalog.ts — Specifications for 60 seeded houses across 5 fictional districts in Vij

import type { HomeType } from './cityBaseTypes';
import type { DistrictId } from './housingTypes';

export interface HouseTypeSpec {
  type: HomeType;
  label: string;
  count: number;
  capacity: number;
  baseRent: number;
  baseBuyPrice: number | null;
  baseComfort: number;
  govMaint: [number, number];
  citMaint: number;
}

export const HOUSE_SPECS: Record<HomeType, HouseTypeSpec> = {
  shared_room: { type: 'shared_room', label: 'Boarding Room', count: 12, capacity: 2, baseRent: 80, baseBuyPrice: null, baseComfort: 20, govMaint: [20, 35], citMaint: 30 },
  small_flat: { type: 'small_flat', label: 'Small Flat', count: 16, capacity: 2, baseRent: 150, baseBuyPrice: 15000, baseComfort: 40, govMaint: [30, 50], citMaint: 45 },
  apartment: { type: 'apartment', label: 'Apartment', count: 18, capacity: 4, baseRent: 300, baseBuyPrice: 30000, baseComfort: 60, govMaint: [45, 70], citMaint: 65 },
  villa: { type: 'villa', label: 'Villa', count: 9, capacity: 6, baseRent: 700, baseBuyPrice: 70000, baseComfort: 80, govMaint: [65, 90], citMaint: 105 },
  mansion: { type: 'mansion', label: 'Mansion', count: 5, capacity: 8, baseRent: 1500, baseBuyPrice: 150000, baseComfort: 95, govMaint: [80, 100], citMaint: 150 },
};

export interface DistrictSpec {
  id: DistrictId;
  label: string;
  summary: string;
  priceMult: number;
  safetyBase: number;
  noiseBase: number;
}

export const DISTRICTS: Record<DistrictId, DistrictSpec> = {
  old_town: { id: 'old_town', label: 'Old Town', summary: 'Central & mixed', priceMult: 1.0, safetyBase: 65, noiseBase: 45 },
  mill_quarter: { id: 'mill_quarter', label: 'Mill Quarter', summary: 'Industrial & noisy', priceMult: 0.85, safetyBase: 50, noiseBase: 76 },
  greenfield: { id: 'greenfield', label: 'Greenfield', summary: 'Quiet residential', priceMult: 1.1, safetyBase: 80, noiseBase: 24 },
  riverside: { id: 'riverside', label: 'Riverside', summary: 'Scenic waterfront', priceMult: 1.2, safetyBase: 70, noiseBase: 32 },
  hilltop: { id: 'hilltop', label: 'Hilltop', summary: 'Prestige enclave', priceMult: 1.25, safetyBase: 90, noiseBase: 14 },
};

export const DISTRICT_ORDER: DistrictId[] = ['old_town', 'mill_quarter', 'greenfield', 'riverside', 'hilltop'];

// Exact 60-house distribution:
// Boarding 12 (Riverside 0 -> +3 in Greenfield), Small Flat 16, Apartment 18, Villa 9, Mansion 5; Hilltop has Villas & Mansions only
export const DISTRICT_QUOTAS: { district: DistrictId; type: HomeType; count: number }[] = [
  { district: 'old_town', type: 'shared_room', count: 4 },
  { district: 'mill_quarter', type: 'shared_room', count: 5 },
  { district: 'greenfield', type: 'shared_room', count: 3 },
  { district: 'old_town', type: 'small_flat', count: 5 },
  { district: 'mill_quarter', type: 'small_flat', count: 4 },
  { district: 'greenfield', type: 'small_flat', count: 4 },
  { district: 'riverside', type: 'small_flat', count: 3 },
  { district: 'old_town', type: 'apartment', count: 5 },
  { district: 'mill_quarter', type: 'apartment', count: 3 },
  { district: 'greenfield', type: 'apartment', count: 5 },
  { district: 'riverside', type: 'apartment', count: 5 },
  { district: 'old_town', type: 'villa', count: 1 },
  { district: 'greenfield', type: 'villa', count: 3 },
  { district: 'riverside', type: 'villa', count: 2 },
  { district: 'hilltop', type: 'villa', count: 3 },
  { district: 'greenfield', type: 'mansion', count: 1 },
  { district: 'riverside', type: 'mansion', count: 1 },
  { district: 'hilltop', type: 'mansion', count: 3 },
];

const TYPE_SHORT: Record<HomeType, string> = {
  shared_room: 'Boarding Room',
  small_flat: 'Flat',
  apartment: 'Apt',
  villa: 'Villa',
  mansion: 'Manor',
};

const DIST_PREFIX: Record<DistrictId, string> = {
  old_town: 'Old Town',
  mill_quarter: 'Mill',
  greenfield: 'Green',
  riverside: 'River',
  hilltop: 'Hilltop',
};

export function buildHouseName(district: DistrictId, type: HomeType, indexInCombo: number): string {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  if (type === 'small_flat' || type === 'apartment') {
    return `${DIST_PREFIX[district]} ${TYPE_SHORT[type]} ${indexInCombo}${letters[(indexInCombo - 1) % 3]}`;
  }
  return `${DIST_PREFIX[district]} ${TYPE_SHORT[type]} ${indexInCombo}`;
}

export function computeHousePrices(type: HomeType, district: DistrictId): { baseRent: number; buyPrice: number | null } {
  const spec = HOUSE_SPECS[type];
  const mult = DISTRICTS[district].priceMult;
  return {
    baseRent: Math.round(spec.baseRent * mult),
    buyPrice: spec.baseBuyPrice !== null ? Math.round(spec.baseBuyPrice * mult) : null,
  };
}
