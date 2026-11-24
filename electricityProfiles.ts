// electricityProfiles.ts — Deterministic usage profile generator with 100+ unique combinations across Vij

import type { CompanyId } from './companyTypes';
import type { CompanyUsageProfile, HouseUsageProfile } from './electricityTypes';
import type { House } from './housingTypes';
import { simPick, simRand } from './rng';
import type { Citizen } from './types';

const WORK_PATTERNS = ['day-shift', 'night-shift', 'remote-work', 'mixed-shift', 'home-all-day'] as const;
const COOLING_MODES = ['no cooling', 'ceiling fans', 'split AC', 'heavy AC'] as const;
const HEATING_MODES = ['no heater', 'light warmers', 'electric heater', 'radiant heating'] as const;
const COOKING_MODES = ['minimal cooking', 'daily stove', 'heavy electric cooking'] as const;
const APPLIANCE_MODES = ['minimal gear', 'standard appliances', 'full appliance suite'] as const;
const LIGHTING_MODES = ['frugal lighting', 'evening lamps', 'all-night lights'] as const;
const WATER_HEATING = ['cold rinse', 'electric kettle', 'storage geyser'] as const;
const HABITS = ['frugal', 'balanced', 'wasteful'] as const;

export function buildProfileFromDimensions(
  idx: number,
  residentsCount: number,
  house?: House,
  occupants: Citizen[] = [],
  usedSummaries?: Set<string>
): HouseUsageProfile {
  const avgThrift = occupants.length ? occupants.reduce((s, c) => s + c.traits.thriftiness, 0) / occupants.length : 50;
  const avgNeat = occupants.length ? occupants.reduce((s, c) => s + c.traits.neatness, 0) / occupants.length : 50;
  const rich = house ? house.type === 'villa' || house.type === 'mansion' : idx % 5 === 4;
  const poor = house ? house.type === 'shared_room' : idx % 5 === 0;
  const rareTwist = simRand() < 0.14;

  const sizeLabel = residentsCount <= 1 ? '1 resident' : residentsCount === 2 ? 'couple (2)' : residentsCount <= 4 ? `family (${residentsCount})` : `shared (${residentsCount})`;
  let workPattern = occupants.some((c) => c.roleLevel === 'Unemployed') && !rareTwist ? 'home-all-day' : simPick(WORK_PATTERNS);
  let cooling = rich && !rareTwist ? simPick(['split AC', 'heavy AC', 'ceiling fans']) : poor && !rareTwist ? simPick(['no cooling', 'ceiling fans', 'split AC']) : simPick(COOLING_MODES);
  let heating = simPick(HEATING_MODES);
  let cooking = residentsCount >= 3 && !rareTwist ? simPick(['daily stove', 'heavy electric cooking']) : simPick(COOKING_MODES);
  let appliances = rich && !rareTwist ? simPick(['standard appliances', 'full appliance suite']) : simPick(APPLIANCE_MODES);
  let lighting = avgNeat > 62 ? simPick(['evening lamps', 'all-night lights']) : simPick(LIGHTING_MODES);
  let waterHeating = poor && !rareTwist ? simPick(['cold rinse', 'electric kettle']) : simPick(WATER_HEATING);
  let habit = rareTwist ? simPick(HABITS) : avgThrift >= 65 ? 'frugal' : avgThrift <= 35 ? 'wasteful' : simPick(HABITS);

  let summary = `${workPattern}, ${cooling}, ${heating}, ${cooking}, ${appliances}, ${lighting}, ${waterHeating}, ${habit} (${sizeLabel})`;
  let attempt = 0;
  while (usedSummaries && usedSummaries.has(summary) && attempt < 24) {
    attempt += 1;
    workPattern = WORK_PATTERNS[(idx + attempt) % WORK_PATTERNS.length];
    cooling = COOLING_MODES[(idx * 3 + attempt) % COOLING_MODES.length];
    heating = HEATING_MODES[(idx * 5 + attempt) % HEATING_MODES.length];
    cooking = COOKING_MODES[(idx + attempt * 2) % COOKING_MODES.length];
    appliances = APPLIANCE_MODES[(idx * 2 + attempt) % APPLIANCE_MODES.length];
    lighting = LIGHTING_MODES[(idx + attempt) % LIGHTING_MODES.length];
    waterHeating = WATER_HEATING[(idx * 2 + attempt * 3) % WATER_HEATING.length];
    habit = HABITS[(idx + attempt) % HABITS.length];
    summary = `${workPattern}, ${cooling}, ${heating}, ${cooking}, ${appliances}, ${lighting}, ${waterHeating}, ${habit} (${sizeLabel})`;
  }
  usedSummaries?.add(summary);

  let mult = 1.0;
  if (workPattern === 'home-all-day' || workPattern === 'remote-work') mult += 0.12;
  if (workPattern === 'night-shift') mult += 0.08;
  if (cooling === 'heavy AC') mult += 0.24;
  else if (cooling === 'split AC') mult += 0.14;
  else if (cooling === 'ceiling fans') mult += 0.04;
  if (heating === 'electric heater' || heating === 'radiant heating') mult += 0.12;
  if (cooking === 'heavy electric cooking') mult += 0.08;
  if (appliances === 'full appliance suite') mult += 0.14;
  else if (appliances === 'minimal gear') mult -= 0.08;
  if (lighting === 'all-night lights') mult += 0.07;
  if (waterHeating === 'storage geyser') mult += 0.1;
  if (habit === 'wasteful') mult += 0.18;
  else if (habit === 'frugal') mult -= 0.16;

  return {
    sizeLabel, workPattern, cooling, heating, cooking, appliances, lighting, waterHeating, habit,
    profileMult: Math.round(Math.max(0.65, Math.min(1.85, mult)) * 100) / 100,
    summary,
  };
}

export function buildCompanyUsageProfile(companyId: CompanyId): CompanyUsageProfile {
  if (companyId === 'vijindustries') {
    return { companyId, shiftPattern: 'double-shift fabrication', equipmentLoad: 'heavy assembly & kilns', cooling: 'industrial blowers', efficiency: 'steady load', profileMult: 1.05, summary: 'Double-shift fabrication, heavy assembly & kilns, industrial blowers, steady load' };
  }
  if (companyId === 'vijmart') {
    return { companyId, shiftPattern: 'extended retail hours', equipmentLoad: 'cold-chain & display chillers', cooling: 'storefront HVAC', efficiency: 'balanced retail', profileMult: 1.02, summary: 'Extended retail hours, cold-chain chillers, storefront HVAC, balanced retail' };
  }
  if (companyId === 'vijtech') {
    return { companyId, shiftPattern: 'daytime + night servers', equipmentLoad: 'server racks & workstations', cooling: 'server-room AC', efficiency: 'moderately high', profileMult: 1.0, summary: 'Daytime + 24/7 server racks, server-room AC, technical efficiency' };
  }
  if (companyId === 'vijcapital') {
    return { companyId, shiftPattern: 'business hours', equipmentLoad: 'vaults & office terminals', cooling: 'central office AC', efficiency: 'conservative office', profileMult: 0.96, summary: 'Business hours, vaults & terminals, central AC, conservative office' };
  }
  return { companyId, shiftPattern: '24/7 dispatch & control', equipmentLoad: 'gas plant auxiliaries & grid SCADA', cooling: 'control room AC', efficiency: 'self-supplied', profileMult: 1.0, summary: '24/7 grid dispatch, plant auxiliaries & SCADA, control room AC, self-supplied' };
}

export function generateSeededProfileSample(count: number): HouseUsageProfile[] {
  const used = new Set<string>();
  return Array.from({ length: count }, (_, i) => buildProfileFromDimensions(i, (i % 6) + 1, undefined, [], used));
}
