// cityMigration.ts — Validate, migrate, and backfill persisted city state
import { assignArchetypeProfile } from './chatArchetypes';
import { createInitialBoardState } from './boardSeats';
import { createEmptyChatGroupState } from './chatGroups';
import { APP_VERSION } from './constants';
import { createRandomSeed, normalizeSeed } from './rng';
import { ensureValidSharityState } from './sharityEngine';
import type { CityState } from './types';

export function validateAndMigrateCity(raw: unknown): CityState | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<CityState>;
  const citizenList = parsed.citizens;
  const companyList = parsed.companies;
  const validMart = parsed.mart?.categoryMoods && parsed.mart.schedules;
  if (
    !Array.isArray(citizenList) || citizenList.length !== 50
    || !Array.isArray(companyList) || companyList.length !== 4
    || !validMart
  ) return null;

  const seed = typeof parsed.seed === 'number' && Number.isFinite(parsed.seed)
    ? normalizeSeed(parsed.seed)
    : createRandomSeed();
  const rngState = typeof parsed.rngState === 'number' && Number.isFinite(parsed.rngState)
    ? normalizeSeed(parsed.rngState)
    : seed;
  const citizens = citizenList.map((citizen) => ({
    ...citizen,
    rentArrears: typeof citizen.rentArrears === 'number' ? citizen.rentArrears : 0,
    jobHunting: typeof citizen.jobHunting === 'boolean' ? citizen.jobHunting : false,
  }));
  const companies = companyList.map((company) => ({
    ...company,
    ledger: Array.isArray(company.ledger) ? company.ledger : [],
  }));
  const sharity = ensureValidSharityState(parsed.sharity, citizens, companies);

  for (const citizen of citizens) {
    const profile = sharity.profiles[citizen.id];
    if (profile) citizen.sharityHandle = profile.handle;
  }

  const chatGroups = parsed.chatGroups?.vijindustries
    ? parsed.chatGroups
    : { vijindustries: createEmptyChatGroupState() };
  if (!parsed.chatGroups?.vijindustries) backfillEmployeeGroup(chatGroups.vijindustries, citizens, companies, parsed.totalDays ?? 1);

  return {
    ...(parsed as CityState),
    version: APP_VERSION,
    seed,
    rngState,
    citizens,
    companies,
    boardState: parsed.boardState ?? createInitialBoardState(citizens),
    sharity,
    chatGroups,
  };
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
