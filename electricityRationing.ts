// electricityRationing.ts — Evening peak load shedding and blackout tier assignment

import type { Company, CompanyId } from './companyTypes';
import { EVENING_PEAK_MULT } from './electricityCatalog';
import type { ElectricityState, RationingTier } from './electricityTypes';
import type { DistrictId, HousingState } from './housingTypes';
import type { Citizen } from './types';

function shedGroup(
  tier: RationingTier,
  shortfallRef: { rem: number },
  housing: HousingState,
  citizensById: Map<string, Citizen>,
  companies: Company[],
  electricity: ElectricityState,
  cutHouses: Set<string>,
  cutComps: Set<CompanyId>,
  cutDistricts: Set<DistrictId>
): void {
  if (tier === 'companies' || tier === 'vijmart') {
    for (const c of companies) {
      if (shortfallRef.rem <= 0) break;
      if (c.id === 'gjelectricity') continue;
      if (tier === 'vijmart' && c.id !== 'vijmart') continue;
      if (tier === 'companies' && c.id === 'vijmart') continue;
      const units = electricity.companyLedgers[c.id]?.todayUnits ?? 0;
      if (units <= 0 || cutComps.has(c.id)) continue;
      cutComps.add(c.id);
      if (electricity.companyLedgers[c.id]) electricity.companyLedgers[c.id].blackedOutToday = true;
      shortfallRef.rem -= (units / 24) * EVENING_PEAK_MULT;
    }
    return;
  }

  for (const h of housing.houses) {
    if (shortfallRef.rem <= 0) break;
    if (!h.electricLedger || h.electricLedger.todayUnits <= 0 || cutHouses.has(h.id)) continue;
    const hasIll = h.occupantIds.some((id) => (citizensById.get(id)?.healthProfile?.illnessDaysLeft ?? 0) > 0);
    if (tier === 'ill_homes' && !hasIll) continue;
    if (tier === 'homes' && hasIll) continue;
    cutHouses.add(h.id);
    cutDistricts.add(h.district);
    h.electricLedger.blackedOutToday = true;
    shortfallRef.rem -= (h.electricLedger.todayUnits / 24) * EVENING_PEAK_MULT;
  }
}

export function shedEveningPeakLoad(params: {
  shortfall: number;
  housing: HousingState;
  citizensById: Map<string, Citizen>;
  companies: Company[];
  electricity: ElectricityState;
}): { cutHouses: Set<string>; cutComps: Set<CompanyId>; cutDistricts: Set<DistrictId> } {
  const { shortfall, housing, citizensById, companies, electricity } = params;
  const cutHouses = new Set<string>();
  const cutComps = new Set<CompanyId>();
  const cutDistricts = new Set<DistrictId>();
  const remRef = { rem: shortfall };
  const shedOrder = [...electricity.rationingPriority].reverse();
  for (const tier of shedOrder) {
    if (remRef.rem <= 0) break;
    shedGroup(tier, remRef, housing, citizensById, companies, electricity, cutHouses, cutComps, cutDistricts);
  }
  return { cutHouses, cutComps, cutDistricts };
}
