// electricitySetup.ts — Initializes GJ Electricity plants, company/house electric ledgers, and initial staff seats

import type { Company, CompanyVacancy } from './companyTypes';
import { createDefaultTariff, createEmptyElectricLedger, PLANT_CAPACITY_PER_HOUR } from './electricityCatalog';
import { buildCompanyUsageProfile, buildProfileFromDimensions } from './electricityProfiles';
import type { ElectricityState, GasPlant } from './electricityTypes';
import { openVacancy } from './jobScoring';
import type { HousingState } from './housingTypes';
import type { Citizen } from './types';

export function createInitialGasPlants(): GasPlant[] {
  return [
    {
      id: 'plant_1',
      name: 'Vij North Gas Unit 1',
      capacityPerHour: PLANT_CAPACITY_PER_HOUR,
      status: 'online',
      daysRemaining: 0,
      upkeepPaidMonth: true,
      builtDay: 1,
      failuresCount: 0,
    },
    {
      id: 'plant_2',
      name: 'Vij South Gas Unit 2',
      capacityPerHour: PLANT_CAPACITY_PER_HOUR,
      status: 'online',
      daysRemaining: 0,
      upkeepPaidMonth: true,
      builtDay: 1,
      failuresCount: 0,
    },
  ];
}

export function seedHousingElectricity(housing: HousingState, citizens: Citizen[]): void {
  const used = new Set<string>();
  const byId = new Map(citizens.map((c) => [c.id, c]));
  housing.houses.forEach((h, idx) => {
    const occ = h.occupantIds.map((id) => byId.get(id)).filter((c): c is Citizen => Boolean(c));
    h.usageProfile = buildProfileFromDimensions(idx, Math.max(1, occ.length || 1), h, occ, used);
    h.electricLedger = createEmptyElectricLedger();
  });
}

export function createInitialElectricityState(housing: HousingState, citizens: Citizen[]): ElectricityState {
  seedHousingElectricity(housing, citizens);
  return {
    plants: createInitialGasPlants(),
    tariff: createDefaultTariff(),
    tariffHistory: [{ day: 1, label: '1 Jan', multiplier: 1.0, effectiveBand2: 1.5 }],
    rationingPriority: ['ill_homes', 'vijmart', 'homes', 'companies'],
    manualCutDistricts: [],
    manualCutCompanies: [],
    companyProfiles: {
      vijtech: buildCompanyUsageProfile('vijtech'),
      vijcapital: buildCompanyUsageProfile('vijcapital'),
      vijindustries: buildCompanyUsageProfile('vijindustries'),
      vijmart: buildCompanyUsageProfile('vijmart'),
      gjelectricity: buildCompanyUsageProfile('gjelectricity'),
    },
    companyLedgers: {
      vijtech: createEmptyElectricLedger(),
      vijcapital: createEmptyElectricLedger(),
      vijindustries: createEmptyElectricLedger(),
      vijmart: createEmptyElectricLedger(),
      gjelectricity: createEmptyElectricLedger(),
    },
    todayCityUnits: 0,
    todayPeakDemandPerHour: 0,
    todayCapacityPerHour: PLANT_CAPACITY_PER_HOUR * 2,
    todayFuelCost: 0,
    monthlyFuelCost: 0,
    monthlyUpkeepCost: 0,
    monthlyBilledTotal: 0,
    monthlyCollectedTotal: 0,
    blackouts: [],
    demandHistory: [],
    subsidyMood: 'balanced',
    simgodMoodOverride: null,
    simgodLevelOverride: 'auto',
    monthlySubsidyAbsorbed: 0,
    totalSubsidyAbsorbed: 0,
    householdsHelpedCount: 0,
    subsidyLog: [],
  };
}

export function seedGJElectricityVacancies(companies: Company[], vacancies: CompanyVacancy[], citizens: Citizen[] = []): void {
  const gj = companies.find((c) => c.id === 'gjelectricity');
  if (!gj || gj.bankrupt) return;
  const filled = new Set(citizens.filter((c) => c.alive && c.employerId === 'gjelectricity' && c.gjJobTitle).map((c) => c.gjJobTitle));
  const clock = { totalDays: 1, day: 1, month: 1, year: 1 };
  if (!filled.has('Plant Engineer')) openVacancy(vacancies, gj, 'Staff', 'Plant Engineer opening at GJ Electricity', clock, '1 Jan, Year 1', 'Plant Engineer');
  if (!filled.has('Finance Officer')) openVacancy(vacancies, gj, 'Team Lead', 'Finance Officer opening at GJ Electricity', clock, '1 Jan, Year 1', 'Finance Officer');
  if (!filled.has('Customer Relations Officer')) openVacancy(vacancies, gj, 'Team Lead', 'Customer Relations Officer opening at GJ Electricity', clock, '1 Jan, Year 1', 'Customer Relations Officer');
}
