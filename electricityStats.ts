// electricityStats.ts — Electronics power draw, district demand breakdown, and top power consumers

import type { Company } from './companyTypes';
import type { getSeasonFromMonth } from './electricityCatalog';
import type { ElectricityState } from './electricityTypes';
import { APPLIANCE_CATALOG } from './electronicsCatalog';
import type { DistrictId, HousingState } from './housingTypes';
import type { Citizen } from './types';

export function computeElectronicsDraw(occupants: Citizen[], season: ReturnType<typeof getSeasonFromMonth>): number {
  let sum = 0;
  for (const occ of occupants) {
    for (const item of occ.inventory.electronics ?? []) {
      const spec = APPLIANCE_CATALOG[item.applianceId];
      if (!spec) continue;
      if (item.broken) {
        if (item.applianceId === 'lamp') sum += 0.8;
        continue;
      }
      if (item.applianceId === 'fan' && season !== 'Summer' && season !== 'Spring') continue;
      if (item.applianceId === 'heater' && season !== 'Winter') continue;
      sum += spec.baseDailyUnits[item.tier];
    }
  }
  return sum;
}

export function getDistrictDailyDemand(housing: HousingState): Record<DistrictId, number> {
  const out: Record<DistrictId, number> = { old_town: 0, mill_quarter: 0, greenfield: 0, riverside: 0, hilltop: 0 };
  for (const h of housing.houses) {
    out[h.district] = Math.round((out[h.district] + (h.electricLedger?.todayUnits ?? 0)) * 10) / 10;
  }
  return out;
}

export function getTopPowerConsumers(
  housing: HousingState,
  companies: Company[],
  electricity: ElectricityState
): { id: string; name: string; kind: 'Home' | 'Company'; units: number }[] {
  const rows: { id: string; name: string; kind: 'Home' | 'Company'; units: number }[] = [
    ...housing.houses.map((h) => ({ id: h.id, name: h.name, kind: 'Home' as const, units: h.electricLedger?.todayUnits ?? 0 })),
    ...companies.map((c) => ({ id: c.id, name: c.name, kind: 'Company' as const, units: electricity.companyLedgers[c.id]?.todayUnits ?? 0 })),
  ];
  return rows.sort((a, b) => b.units - a.units).slice(0, 10);
}
