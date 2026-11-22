// seeder.ts — Initializes deterministic seeded Vij city with 50 citizens, 4 companies, Mart, and board state

import { createInitialBoardState } from './boardSeats';
import { buildSeedCitizen } from './citizenFactory';
import { assignInitialCitizensToCompanies, createInitialCompanies } from './companySetup';
import { APP_VERSION, INITIAL_TREASURY, MART_INITIAL_CASH } from './constants';
import { formatSimDate } from './formatters';
import { createInitialMart } from './martSetup';
import { CITIZEN_NAME_POOL, shuffleNames } from './names';
import { createRandomSeed, getSimRngState, normalizeSeed, syncSimRng } from './rng';
import { SEED_ROSTER } from './seedProfiles';
import type { CityState } from './types';

export function createInitialCityState(providedSeed?: number): CityState {
  const seed = providedSeed !== undefined && Number.isFinite(providedSeed)
    ? normalizeSeed(providedSeed)
    : createRandomSeed();
  syncSimRng(seed);

  const names = shuffleNames(CITIZEN_NAME_POOL);
  const citizens = SEED_ROSTER.map((slot, idx) => buildSeedCitizen(idx, slot, names[idx]));
  const mart = createInitialMart(citizens);
  const companies = createInitialCompanies();
  assignInitialCitizensToCompanies(citizens, companies, mart);
  const boardState = createInitialBoardState(citizens);
  const dateLabel = formatSimDate(1, 1, 1);

  const initialPayroll = citizens
    .filter((c) => c.alive && c.roleLevel !== 'Unemployed')
    .reduce((s, c) => s + c.lastGrossPay, 0);

  return {
    version: APP_VERSION,
    seed,
    rngState: getSimRngState(),
    cityName: 'Vij',
    day: 1,
    month: 1,
    year: 1,
    totalDays: 1,
    treasury: INITIAL_TREASURY,
    citizens,
    companies,
    vacancies: [],
    jobEvents: [],
    mart,
    tierMovementsThisMonth: [],
    lastMonthTaxCollected: 0,
    lastTotalPayroll: initialPayroll,
    lastBusinessTaxCollected: 0,
    boardState,
    events: [
      {
        id: 'evt_init_1',
        totalDay: 1,
        dateLabel,
        type: 'system',
        title: `City of Vij Opened (Seed ${seed})`,
        detail: `50 citizens settled (41 employed, 9 unemployed). Treasury: ∆${INITIAL_TREASURY.toLocaleString('en-IN')} · Each company starts with ∆${MART_INITIAL_CASH.toLocaleString('en-IN')}.`,
      },
    ],
  };
}
