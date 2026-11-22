// sharityEngine.ts — Sharity initialization, daily pacing budget, S2 post dispatch, and migration

import type { Company, CompanyVacancy } from './companyTypes';
import type { SimClock } from './eventFactory';
import type { MartState } from './martTypes';
import { simRand, simRandInt } from './rng';
import { driftAffinitiesMonthly, seedAllAffinities } from './sharityAffinity';
import { applyTierRisingBadges } from './sharityBadges';
import { buildCitizenBio, buildUniqueHandle, COMPANY_OFFICIAL_BIOS, maybeRefreshCitizenBio } from './sharityBios';
import { countFollowersMap, seedInitialFollows, updateSharityNetworkStep } from './sharityNetwork';
import { runDailySharityPosts } from './sharityPosting';
import type { SharityProfile, SharityState } from './sharityTypes';
import type { Citizen, CityEvent, SimSpeed, TierMovement } from './types';

export function createInitialSharityState(citizens: Citizen[], companies: Company[]): SharityState {
  const taken = new Set<string>(companies.map((c) => `@${c.id}`));
  const profiles: Record<string, SharityProfile> = {};

  for (const comp of companies) {
    profiles[comp.id] = {
      id: comp.id, kind: 'company', name: comp.name, handle: `@${comp.id}`, joinedDay: 1,
      bio: COMPANY_OFFICIAL_BIOS[comp.id], bioUpdatedDay: 1, verified: true,
      badgeHistory: [{ id: `badge_init_${comp.id}`, kind: 'earned', badge: 'Verified Organization', totalDay: 1, dateLabel: '1 Jan, Year 1', detail: `${comp.name} official page verified on launch.` }],
      followerMilestonesLogged: [],
    };
  }
  for (const c of citizens) {
    const handle = buildUniqueHandle(c.name, taken);
    c.sharityHandle = handle;
    profiles[c.id] = { id: c.id, kind: 'citizen', name: c.name, handle, joinedDay: 1, bio: buildCitizenBio(c, companies), bioUpdatedDay: 1, verified: false, badgeHistory: [], followerMilestonesLogged: [] };
  }

  const affinities = seedAllAffinities(citizens);
  const follows = seedInitialFollows(citizens, companies, affinities);
  return {
    profiles, affinities, follows, monthStartFollowers: countFollowersMap(follows),
    posts: [], unreadPostCount: 0, lastTickDay: 1, lastTickBudget: 0,
    lastTickReason: 'City opened on Day 1', recentTexts: [], authorLastTemplateDay: {}, authorLastPostDay: {}, dailyStats: [], handledEventIds: [],
  };
}

export function computeDailyPostBudget(speed: SimSpeed, dayEvents: CityEvent[]): { budget: number; reason: string } {
  if (speed === 0) return { budget: 0, reason: 'Simulation paused — zero post budget' };
  const hasDeath = dayEvents.some((e) => e.type === 'death');
  const hasBankruptcy = dayEvents.some((e) => e.type === 'bankruptcy');
  const layoffCount = dayEvents.filter((e) => e.type === 'layoff').length;
  if (hasDeath || hasBankruptcy || layoffCount >= 2) {
    return { budget: 5 + simRandInt(0, 3), reason: 'Major city event surge (5+ post budget)' };
  }
  const r = simRand();
  const budget = r < 0.36 ? 0 : r < 0.8 ? 1 : r < 0.96 ? 2 : 3;
  return { budget, reason: `Normal pacing (${budget} post slot${budget === 1 ? '' : 's'})` };
}

export function stepSharityDay(params: {
  sharity: SharityState;
  citizens: Citizen[];
  companies: Company[];
  mart: MartState;
  vacancies?: CompanyVacancy[];
  dayEvents: CityEvent[];
  prevEvents?: CityEvent[];
  events: CityEvent[];
  movements: TierMovement[];
  clock: SimClock;
  isMonthEnd: boolean;
  speed: SimSpeed;
}): void {
  const { sharity, citizens, companies, mart, vacancies = [], dayEvents, prevEvents = [], events, movements, clock, isMonthEnd, speed } = params;
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const handledSg = new Set(sharity.handledEventIds ?? []);
  const recentUnprocessedSimgod = prevEvents.filter((e) => e.type === 'simgod' && clock.totalDays - e.totalDay <= 2 && !handledSg.has(e.id));

  applyTierRisingBadges({ sharity, byId, companies, movements, clock, events });
  for (const ev of dayEvents) {
    if (!ev.citizenId) continue;
    if (ev.type === 'promoted' || ev.type === 'fired' || ev.type === 'layoff' || ev.type === 'hired' || ev.type === 'quit') {
      const c = byId.get(ev.citizenId);
      const prof = sharity.profiles[ev.citizenId];
      if (c && prof) maybeRefreshCitizenBio(prof, c, companies, clock.totalDays, ev.type);
    }
  }
  if (isMonthEnd) {
    driftAffinitiesMonthly(citizens, sharity);
    for (const c of citizens) {
      const prof = sharity.profiles[c.id];
      if (prof && c.alive) maybeRefreshCitizenBio(prof, c, companies, clock.totalDays);
    }
  }

  updateSharityNetworkStep({ citizens, sharity, dayEvents, clock, events, isMonthEnd });
  const pacing = computeDailyPostBudget(speed, [...dayEvents, ...recentUnprocessedSimgod]);
  runDailySharityPosts({ sharity, citizens, companies, mart, vacancies, dayEvents, recentUnprocessedSimgod, clock, isMonthEnd, budget: pacing.budget, events });
  sharity.handledEventIds = [...recentUnprocessedSimgod.map((e) => e.id), ...(sharity.handledEventIds ?? [])].slice(0, 80);
  sharity.lastTickDay = clock.totalDays;
  sharity.lastTickBudget = pacing.budget;
  sharity.lastTickReason = pacing.reason;
}

export function ensureValidSharityState(raw: SharityState | undefined, citizens: Citizen[], companies: Company[]): SharityState {
  if (raw && raw.profiles && raw.affinities && raw.follows && Object.keys(raw.profiles).length >= citizens.length + companies.length) {
    return {
      ...raw,
      monthStartFollowers: raw.monthStartFollowers ?? countFollowersMap(raw.follows),
      posts: Array.isArray(raw.posts) ? raw.posts : [],
      unreadPostCount: typeof raw.unreadPostCount === 'number' ? raw.unreadPostCount : 0,
      lastTickDay: typeof raw.lastTickDay === 'number' ? raw.lastTickDay : 1,
      lastTickBudget: typeof raw.lastTickBudget === 'number' ? raw.lastTickBudget : 0,
      lastTickReason: typeof raw.lastTickReason === 'string' ? raw.lastTickReason : 'Ready',
      recentTexts: Array.isArray(raw.recentTexts) ? raw.recentTexts : [],
      authorLastTemplateDay: raw.authorLastTemplateDay ?? {},
      authorLastPostDay: raw.authorLastPostDay ?? {},
      dailyStats: Array.isArray(raw.dailyStats) ? raw.dailyStats : [],
      handledEventIds: Array.isArray(raw.handledEventIds) ? raw.handledEventIds : [],
      lastMartClosed: Boolean(raw.lastMartClosed),
    };
  }
  return createInitialSharityState(citizens, companies);
}
