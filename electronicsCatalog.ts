// electronicsCatalog.ts — Catalog of 9 Vij Mart electronics across 3 tiers and lifespan variance roller

import type { ApplianceId, ApplianceSpec, ApplianceTier, OwnedAppliance } from './electronicsTypes';
import { simRand, simRandFloat, simRandInt } from './rng';

export const APPLIANCE_IDS: ApplianceId[] = [
  'phone', 'fan', 'fridge', 'cooker', 'heater', 'television', 'washing_machine', 'laptop', 'lamp',
];

export const APPLIANCE_TIERS: ApplianceTier[] = ['basic', 'mid', 'premium'];

export const APPLIANCE_CATALOG: Record<ApplianceId, ApplianceSpec> = {
  phone: { id: 'phone', name: 'Phone', prices: { basic: 180, mid: 420, premium: 900 }, baseDailyUnits: { basic: 0.2, mid: 0.3, premium: 0.4 }, minMonths: 4, maxMonths: 7, essential: true },
  fan: { id: 'fan', name: 'Fan', prices: { basic: 120, mid: 220, premium: 380 }, baseDailyUnits: { basic: 0.9, mid: 1.2, premium: 1.5 }, minMonths: 5, maxMonths: 8, essential: true },
  fridge: { id: 'fridge', name: 'Fridge', prices: { basic: 450, mid: 800, premium: 1400 }, baseDailyUnits: { basic: 2.2, mid: 2.0, premium: 1.8 }, minMonths: 6, maxMonths: 8, essential: true },
  cooker: { id: 'cooker', name: 'Cooker', prices: { basic: 40, mid: 90, premium: 180 }, baseDailyUnits: { basic: 1.4, mid: 1.6, premium: 1.9 }, minMonths: 5, maxMonths: 8, essential: true },
  heater: { id: 'heater', name: 'Heater', prices: { basic: 60, mid: 140, premium: 260 }, baseDailyUnits: { basic: 2.4, mid: 2.8, premium: 3.2 }, minMonths: 4, maxMonths: 7, essential: true },
  television: { id: 'television', name: 'Television', prices: { basic: 250, mid: 500, premium: 1000 }, baseDailyUnits: { basic: 0.9, mid: 1.3, premium: 1.8 }, minMonths: 5, maxMonths: 8, essential: false },
  washing_machine: { id: 'washing_machine', name: 'Washing Machine', prices: { basic: 350, mid: 700, premium: 1200 }, baseDailyUnits: { basic: 1.5, mid: 1.8, premium: 2.0 }, minMonths: 6, maxMonths: 8, essential: false },
  laptop: { id: 'laptop', name: 'Laptop', prices: { basic: 500, mid: 900, premium: 1800 }, baseDailyUnits: { basic: 0.7, mid: 0.9, premium: 1.2 }, minMonths: 4, maxMonths: 7, essential: false },
  lamp: { id: 'lamp', name: 'Lamp', prices: { basic: 8, mid: 20, premium: 45 }, baseDailyUnits: { basic: 0.3, mid: 0.3, premium: 0.4 }, minMonths: 4, maxMonths: 6, essential: true },
};

export const TIER_LABELS: Record<ApplianceTier, string> = {
  basic: 'Basic',
  mid: 'Mid',
  premium: 'Premium',
};

export function rollApplianceLifespan(applianceId: ApplianceId, tier: ApplianceTier): { totalDays: number; variancePct: number } {
  const spec = APPLIANCE_CATALOG[applianceId];
  const tierBonus = tier === 'premium' ? 20 : tier === 'mid' ? 10 : 0;
  const baseDays = simRandInt(spec.minMonths * 30, spec.maxMonths * 30) + tierBonus;
  const sign = simRand() < 0.5 ? -1 : 1;
  const mag = simRandFloat(0.1, 0.4);
  const variancePct = Math.round(sign * mag * 100);
  const totalDays = Math.max(72, Math.round(baseDays * (1 + sign * mag)));
  return { totalDays, variancePct };
}

export function createOwnedAppliance(
  id: string,
  applianceId: ApplianceId,
  tier: ApplianceTier,
  purchasePrice: number,
  boughtDay: number,
  boughtDate: string,
  initialRemainingRatio = 1
): OwnedAppliance {
  const { totalDays, variancePct } = rollApplianceLifespan(applianceId, tier);
  return {
    id,
    applianceId,
    name: APPLIANCE_CATALOG[applianceId].name,
    tier,
    purchasePrice,
    boughtDay,
    boughtDate,
    totalLifespanDays: totalDays,
    daysLeft: Math.max(12, Math.round(totalDays * initialRemainingRatio)),
    variancePct,
    broken: false,
  };
}
