// sharityNetwork.ts — Follower graph seeding, event-based updates, and monthly churn

import type { Company } from './companyTypes';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { simRand, simRandFloat } from './rng';
import { affinityKey } from './sharityAffinity';
import { logFollowerMilestones } from './sharityBadges';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

export function countFollowersMap(follows: Record<string, string[]>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const list of Object.values(follows)) {
    for (const targetId of list) counts[targetId] = (counts[targetId] ?? 0) + 1;
  }
  return counts;
}

export function getFollowersOf(sharity: SharityState, targetId: string): string[] {
  const res: string[] = [];
  for (const [followerId, list] of Object.entries(sharity.follows)) {
    if (list.includes(targetId)) res.push(followerId);
  }
  return res;
}

export function seedInitialFollows(
  citizens: Citizen[],
  companies: Company[],
  affinities: Record<string, number>
): Record<string, string[]> {
  const follows: Record<string, string[]> = {};
  for (const viewer of citizens) {
    const targetCount = Math.round(clamp(3 + (viewer.traits.sociability / 100) * 21 + simRandFloat(-1.5, 2), 2, 32));
    const ranked = citizens
      .filter((t) => t.id !== viewer.id)
      .map((t) => {
        const aff = affinities[affinityKey(viewer.id, t.id)] ?? 0;
        const coworker = viewer.employerId && viewer.employerId === t.employerId ? 22 : 0;
        const bossTie = viewer.bossId === t.id || t.bossId === viewer.id ? 14 : 0;
        const score = aff * 0.52 + coworker + bossTie + t.statusScore * 0.48 + t.traits.sociability * 0.22 + simRandFloat(-10, 10);
        return { id: t.id, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .map((r) => r.id);

    const set = new Set<string>(ranked);
    if (viewer.employerId) set.add(viewer.employerId);
    if (simRand() < 0.72) set.add('vijmart');
    for (const comp of companies) {
      if (comp.id !== viewer.employerId && comp.id !== 'vijmart' && (viewer.statusScore >= 55 || viewer.traits.sociability >= 68) && simRand() < 0.14) {
        set.add(comp.id);
      }
    }
    follows[viewer.id] = [...set];
  }
  return follows;
}

export function trackFollowGain(sharity: SharityState, followerId: string, targetId: string): boolean {
  const list = sharity.follows[followerId] ?? [];
  if (list.includes(targetId)) return false;
  sharity.follows[followerId] = [...list, targetId];
  const gained = sharity.followerGainedMonth ?? {};
  gained[targetId] = (gained[targetId] ?? 0) + 1;
  sharity.followerGainedMonth = gained;
  return true;
}

export function trackFollowLoss(
  sharity: SharityState,
  followerId: string,
  targetId: string,
  byId: Map<string, Citizen>,
  minFloor = 2
): boolean {
  const list = sharity.follows[followerId];
  if (!list || !list.includes(targetId)) return false;
  if (byId.has(targetId) && list.filter((id) => id !== targetId && byId.has(id)).length < minFloor) return false;
  sharity.follows[followerId] = list.filter((id) => id !== targetId);
  const lost = sharity.followerLostMonth ?? {};
  lost[targetId] = (lost[targetId] ?? 0) + 1;
  sharity.followerLostMonth = lost;
  return true;
}

export function updateSharityNetworkStep(params: {
  citizens: Citizen[];
  sharity: SharityState;
  dayEvents: CityEvent[];
  clock: SimClock;
  events: CityEvent[];
  isMonthEnd: boolean;
}): void {
  const { citizens, sharity, dayEvents, clock, events, isMonthEnd } = params;
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const aliveCitizens = citizens.filter((c) => c.alive);
  if (isMonthEnd) {
    sharity.monthStartFollowers = countFollowersMap(sharity.follows);
    sharity.followerGainedMonth = {};
    sharity.followerLostMonth = {};
  }

  for (const ev of dayEvents) {
    const target = ev.citizenId ? byId.get(ev.citizenId) : null;
    if (target && target.alive && (ev.type === 'promoted' || (ev.type === 'tier' && ev.title === 'Tier Promotion'))) {
      for (const viewer of aliveCitizens) {
        if (viewer.id === target.id) continue;
        const aff = sharity.affinities[affinityKey(viewer.id, target.id)] ?? 0;
        const sameComp = viewer.employerId && viewer.employerId === target.employerId;
        if (simRand() < (sameComp ? 0.35 : 0.12) + Math.max(0, aff) * 0.004) trackFollowGain(sharity, viewer.id, target.id);
      }
    }
    if (target && (ev.type === 'fired' || ev.type === 'layoff')) {
      for (const fId of getFollowersOf(sharity, target.id)) {
        const aff = sharity.affinities[affinityKey(fId, target.id)] ?? 0;
        if (aff < 15 && simRand() < 0.25) trackFollowLoss(sharity, fId, target.id, byId);
      }
    }
    if (ev.companyId && (ev.type === 'bankruptcy' || ev.type === 'layoff')) {
      for (const fId of getFollowersOf(sharity, ev.companyId)) {
        const viewer = byId.get(fId);
        if (viewer && viewer.employerId !== ev.companyId && simRand() < (ev.type === 'bankruptcy' ? 0.35 : 0.1)) {
          trackFollowLoss(sharity, fId, ev.companyId, byId);
        }
      }
    }
  }

  if (isMonthEnd) {
    for (const viewer of aliveCitizens) {
      if (viewer.employerId) trackFollowGain(sharity, viewer.id, viewer.employerId);
      if (simRand() < 0.12 && aliveCitizens.length > 2) {
        const cand = aliveCitizens[Math.floor(simRand() * aliveCitizens.length)];
        if (cand.id !== viewer.id && cand.statusScore >= 50) trackFollowGain(sharity, viewer.id, cand.id);
      }
      const list = sharity.follows[viewer.id] ?? [];
      if (list.filter((id) => byId.has(id)).length < 2) {
        for (const cand of aliveCitizens) {
          if (cand.id !== viewer.id) trackFollowGain(sharity, viewer.id, cand.id);
          if ((sharity.follows[viewer.id] ?? []).filter((id) => byId.has(id)).length >= 2) break;
        }
      }
    }
  }

  logFollowerMilestones(sharity, countFollowersMap(sharity.follows), byId, clock, events);
}
