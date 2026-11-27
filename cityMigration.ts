// cityMigration.ts — Validate, migrate, and backfill persisted city state
import { assignArchetypeProfile } from './chatArchetypes';
import { createInitialBoardState } from './boardSeats';
import { createEmptyChatGroupState } from './chatGroups';
import { createSeedEmotions } from './citizenEmotions';
import { createSeedHealthProfile } from './citizenHealthSystem';
import { createSeedNeeds } from './citizenNeeds';
import { evaluateSurvivalLadder } from './citizenSurvivalEngine';
import { backfillTraits18 } from './citizenTraits';
import { createInitialCompanies } from './companySetup';
import type { Company } from './companyTypes';
import { APP_VERSION } from './constants';
import { ensureCitizenElectricityAwareness } from './electricityAwarenessSeed';
import { createInitialElectricityState, seedGJElectricityVacancies, seedHousingElectricity } from './electricitySetup';
import { seedCitizenElectronics } from './electronicsCitizen';
import { ensureMartElectronics } from './electronicsMart';
import { ensureFamilyState } from './familyTreeEngine';
import { formatMonthYear } from './formatters';
import { computeHousingSatisfaction, seedHousingPreferences } from './housingPreferences';
import { syncCitizenHousingLinks } from './housingScores';
import { createInitialHousingState, ensureHousingMarketSnapshots } from './housingSeed';
import { ensureOuterCityWater } from './outerCityWater';
import { createRandomSeed, normalizeSeed } from './rng';
import { ensureValidSharityState } from './sharityEngine';
import type { CityState } from './types';
import { inferBankTitle } from './vijBankCatalog';
import { ensureVijBankState } from './vijBankSetup';

export function validateAndMigrateCity(raw: unknown): CityState | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<CityState>;
  const citizenList = parsed.citizens;
  const companyList = parsed.companies;
  const validMart = parsed.mart?.categoryMoods && parsed.mart.schedules;
  if (
    !Array.isArray(citizenList) || citizenList.length < 50
    || !Array.isArray(companyList) || (companyList.length !== 4 && companyList.length !== 5)
    || !validMart
  ) return null;

  const seed = typeof parsed.seed === 'number' && Number.isFinite(parsed.seed)
    ? normalizeSeed(parsed.seed)
    : createRandomSeed();
  const rngState = typeof parsed.rngState === 'number' && Number.isFinite(parsed.rngState)
    ? normalizeSeed(parsed.rngState)
    : seed;
  const citizens = citizenList.map((citizen) => {
    const traits = backfillTraits18(citizen.traits ?? {});
    const needs = citizen.needs?.energy ? citizen.needs : createSeedNeeds(citizen.homeType, traits, citizen.hunger ?? 80, citizen.thirst ?? 80);
    const healthProfile = citizen.healthProfile?.mental !== undefined ? citizen.healthProfile : createSeedHealthProfile(citizen.age ?? 30, traits, citizen.health ?? 80);
    const emotions = citizen.emotions?.joy ? citizen.emotions : createSeedEmotions(traits);
    const out = {
      ...citizen,
      traits,
      needs,
      healthProfile,
      emotions,
      emotionHistory: Array.isArray(citizen.emotionHistory) ? citizen.emotionHistory : [],
      survivalPriority: Array.isArray(citizen.survivalPriority) ? citizen.survivalPriority : [],
      survivalState: citizen.survivalState ?? 'Stable',
      rentArrears: typeof citizen.rentArrears === 'number' ? citizen.rentArrears : 0,
      jobHunting: typeof citizen.jobHunting === 'boolean' ? citizen.jobHunting : false,
      socialReputation: typeof citizen.socialReputation === 'number' ? citizen.socialReputation : Math.round(citizen.respect ?? 50),
      sharityMoodLines: Array.isArray(citizen.sharityMoodLines) ? citizen.sharityMoodLines : [],
      sharityStressLines: Array.isArray(citizen.sharityStressLines) ? citizen.sharityStressLines : [],
      sharityWorkNotes: Array.isArray(citizen.sharityWorkNotes) ? citizen.sharityWorkNotes : [],
      lifeLog: [],
    };
    evaluateSurvivalLadder(out);
    seedCitizenElectronics(out);
    ensureCitizenElectricityAwareness(out);
    if (out.employerId === 'vijcapital' && !out.bankJobTitle) out.bankJobTitle = inferBankTitle(out);
    return out;
  });
  const companies: Company[] = companyList.map((company) => ({
    ...company,
    ledger: Array.isArray(company.ledger) ? company.ledger : [],
    sharityCriticismLog: Array.isArray(company.sharityCriticismLog) ? company.sharityCriticismLog : [],
  }));
  if (!companies.some((c) => c.id === 'gjelectricity')) {
    const gj = createInitialCompanies().find((c) => c.id === 'gjelectricity')!;
    companies.push(gj);
  }
  const sharity = ensureValidSharityState(parsed.sharity, citizens, companies);

  for (const citizen of citizens) {
    const profile = sharity.profiles[citizen.id];
    if (profile) citizen.sharityHandle = profile.handle;
  }

  const chatGroups = parsed.chatGroups?.vijindustries
    ? parsed.chatGroups
    : { vijindustries: createEmptyChatGroupState() };
  if (!parsed.chatGroups?.vijindustries) backfillEmployeeGroup(chatGroups.vijindustries, citizens, companies, parsed.totalDays ?? 1);

  const housing = parsed.housing?.houses?.length === 60
    ? parsed.housing
    : createInitialHousingState(citizens);
  ensureHousingMarketSnapshots(housing, formatMonthYear(parsed.month ?? 1, parsed.year ?? 1));
  const byHouse = new Map(housing.houses.map((h) => [h.id, h]));
  for (const c of citizens) {
    if (!Array.isArray(c.housingHistory)) c.housingHistory = [];
    if (!Array.isArray(c.evictionRecords)) c.evictionRecords = [];
    if (!c.housingPrefs) c.housingPrefs = seedHousingPreferences(c);
    c.housingSatisfaction = computeHousingSatisfaction(c, c.homeId ? byHouse.get(c.homeId) : undefined, sharity);
  }
  syncCitizenHousingLinks(citizens, housing.houses, sharity);
  ensureMartElectronics(parsed.mart!);
  ensureOuterCityWater(parsed.mart!);
  if (housing.houses.some((h) => !h.usageProfile || !h.electricLedger)) seedHousingElectricity(housing, citizens);
  const electricity = parsed.electricity ?? createInitialElectricityState(housing, citizens);
  if (!electricity.subsidyMood) electricity.subsidyMood = 'balanced';
  if (!Array.isArray(electricity.subsidyLog)) electricity.subsidyLog = [];
  const vacancies = Array.isArray(parsed.vacancies) ? [...parsed.vacancies] : [];
  if (!parsed.electricity) seedGJElectricityVacancies(companies, vacancies);

  const migrated: CityState = {
    ...(parsed as CityState),
    version: APP_VERSION,
    seed,
    rngState,
    citizens,
    companies,
    vacancies,
    boardState: parsed.boardState ?? createInitialBoardState(citizens),
    sharity,
    chatGroups,
    housing,
    electricity,
    bank: parsed.bank,
  };
  ensureFamilyState(migrated);
  ensureVijBankState(migrated);
  return migrated;
}

function backfillEmployeeGroup(group: CityState['chatGroups']['vijindustries'], citizens: CityState['citizens'], companies: CityState['companies'], totalDays: number): void {
  const employees = citizens.filter((citizen) => citizen.alive && citizen.employerId === 'vijindustries' && citizen.roleLevel !== 'Unemployed');
  group.memberIds = employees.map((citizen) => citizen.id);
  group.membersEverJoined = [...group.memberIds];
  group.archetypeProfiles = Object.fromEntries(employees.map((citizen) => [citizen.id, assignArchetypeProfile(citizen)]));
  group.lastKnownCeoId = companies.find((company) => company.id === 'vijindustries')?.ceoId ?? null;
  group.spamUncleId = employees.find((citizen) => citizen.age >= 45 && citizen.traits.discipline > 55 && citizen.traits.ambition < 60)?.id ?? null;
  group.seedMessagesEmitted = totalDays > 4;
}
