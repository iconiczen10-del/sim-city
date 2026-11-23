// types.ts — Core data structures for Vij city, citizens, events, and simulation state

import type { CompanyBoardState } from './boardTypes';
import type { ChatGroupState } from './chatGroups';
import type { ChangeExplanation, CitizenMemory, DecisionRecord, LedgerEntry, LifeLogEntry, SignedFactor } from './citizenInspectorTypes';
import type { CitizenSnapshot, CitizenTraits, DeathCause, EducationLevel, EventCategory, Gender, HomeType, RoleLevel, TierId } from './cityBaseTypes';
import type { Company, CompanyId, CompanyVacancy, JobMarketEvent, WorkHistoryEntry } from './companyTypes';
import type { CitizenInventory, CitizenStandards, MartState, PurchaseRecord, ShoppingCategory } from './martTypes';
import type { SharityState } from './sharityTypes';

export type {
  CitizenSnapshot, CitizenSort, CitizenTraits, DeathCause, EducationLevel,
  EventCategory, Gender, HomeType, NavTab, RoleLevel, SimSpeed, TierId,
} from './cityBaseTypes';

export interface Citizen {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  education: EducationLevel;
  skill: number;
  experience: number;
  traits: CitizenTraits;
  savings: number;
  rentArrears: number;
  mood: number;
  stress: number;
  hunger: number;
  thirst: number;
  health: number;
  alive: boolean;
  deathDate?: string;
  deathCause?: DeathCause;
  previousRole?: RoleLevel;
  roleLevel: RoleLevel;
  respect: number;
  statusScore: number;
  tier: TierId;
  homeType: HomeType;
  standards: CitizenStandards;
  inventory: CitizenInventory;
  recentPurchases: PurchaseRecord[];
  stockoutMemoryDays: number;
  giftShieldDays: number;
  memories: CitizenMemory[];
  decisions: DecisionRecord[];
  moodBreakdown: SignedFactor[];
  stressBreakdown: SignedFactor[];
  monthlyLedger: LedgerEntry[];
  lifeLog: LifeLogEntry[];
  changeExplanations: ChangeExplanation[];
  lastPaidPrices: Record<ShoppingCategory, number>;
  lastGrossPay: number;
  lastTax: number;
  lastFixedCosts: number;
  highestMilestone: number;
  moodCrashed: boolean;
  hungerAlerted: boolean;
  thirstAlerted: boolean;
  history: CitizenSnapshot[];
  employerId: CompanyId | null;
  bossId: string | null;
  bossRelationship: number;
  tenureMonths: number;
  monthsSincePromotion: number;
  performanceScore: number;
  unemployedDays: number;
  jobHunting: boolean;
  workHistory: WorkHistoryEntry[];
  householdId: string | null;
  sharityHandle: string;
}

export interface CityEvent {
  id: string;
  totalDay: number;
  dateLabel: string;
  type: EventCategory;
  citizenId?: string;
  citizenName?: string;
  companyId?: CompanyId;
  title: string;
  detail: string;
}

export interface TierMovement {
  citizenId: string;
  citizenName: string;
  fromTier: TierId;
  toTier: TierId;
  direction: 'up' | 'down';
  statusScore: number;
  monthLabel: string;
}

export interface CityState {
  version: string;
  seed: number;
  rngState: number;
  cityName: string;
  day: number;
  month: number;
  year: number;
  totalDays: number;
  treasury: number;
  citizens: Citizen[];
  companies: Company[];
  vacancies: CompanyVacancy[];
  jobEvents: JobMarketEvent[];
  mart: MartState;
  events: CityEvent[];
  tierMovementsThisMonth: TierMovement[];
  lastMonthTaxCollected: number;
  lastTotalPayroll: number;
  lastBusinessTaxCollected: number;
  boardState: CompanyBoardState;
  sharity: SharityState;
  chatGroups: { vijindustries: ChatGroupState };
}
