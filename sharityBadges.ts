// sharityBadges.ts — Rising tier verification badge grants/revocations and follower milestone logging

import type { Company } from './companyTypes';
import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { formatSimDate } from './formatters';
import { maybeRefreshCitizenBio } from './sharityBios';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent, TierId, TierMovement } from './types';

const TIER_RANK: Record<TierId, number> = { T1: 5, T2: 4, T3: 3, T4: 2, T5: 1 };
const FOLLOWER_MILESTONES = [10, 25, 50] as const;

export function applyTierRisingBadges(params: {
  sharity: SharityState;
  byId: Map<string, Citizen>;
  companies: Company[];
  movements: TierMovement[];
  clock: SimClock;
  events: CityEvent[];
}): void {
  const { sharity, byId, companies, movements, clock, events } = params;
  const dateLabel = formatSimDate(clock.day, clock.month, clock.year);

  for (const m of movements) {
    const c = byId.get(m.citizenId);
    const prof = sharity.profiles[m.citizenId];
    if (!c || !prof || !c.alive) continue;
    if (m.direction === 'up') {
      prof.verified = true;
      prof.risingTier = m.toTier;
      prof.badgeHistory.unshift({
        id: `badge_up_${clock.totalDays}_${c.id}`, kind: 'earned', badge: 'Rising', tier: m.toTier,
        totalDay: clock.totalDays, dateLabel, detail: `Earned Rising verified badge upon reaching ${m.toTier}.`,
      });
      events.push(makeCityEvent(clock, `sharity_badge_up_${c.id}`, {
        type: 'sharity', citizenId: c.id, citizenName: c.name,
        title: 'Sharity Rising Badge Earned', detail: `${c.name} (${prof.handle}) earned Rising verification at ${m.toTier}.`,
      }));
      maybeRefreshCitizenBio(prof, c, companies, clock.totalDays, 'tier_up');
    } else if (prof.verified && prof.risingTier && TIER_RANK[m.toTier] < TIER_RANK[prof.risingTier]) {
      const prevTier = prof.risingTier;
      prof.verified = false;
      prof.risingTier = undefined;
      prof.badgeHistory.unshift({
        id: `badge_lost_${clock.totalDays}_${c.id}`, kind: 'lost', badge: 'Rising', tier: m.toTier,
        totalDay: clock.totalDays, dateLabel, detail: `Lost Rising verified badge after dropping to ${m.toTier} (below ${prevTier}).`,
      });
      events.push(makeCityEvent(clock, `sharity_badge_lost_${c.id}`, {
        type: 'sharity', citizenId: c.id, citizenName: c.name,
        title: 'Sharity Rising Badge Lost', detail: `${c.name} (${prof.handle}) lost Rising verification at ${m.toTier}.`,
      }));
      maybeRefreshCitizenBio(prof, c, companies, clock.totalDays, 'tier_down');
    }
  }
}

export function logFollowerMilestones(
  sharity: SharityState,
  followerCounts: Record<string, number>,
  byId: Map<string, Citizen>,
  clock: SimClock,
  events: CityEvent[]
): void {
  for (const prof of Object.values(sharity.profiles)) {
    const count = followerCounts[prof.id] ?? 0;
    const active = prof.kind === 'company' || Boolean(byId.get(prof.id)?.alive);
    if (!active) continue;
    for (const m of FOLLOWER_MILESTONES) {
      if (count >= m && !prof.followerMilestonesLogged.includes(m)) {
        prof.followerMilestonesLogged.push(m);
        events.push(makeCityEvent(clock, `sharity_mile_${prof.id}_${m}`, {
          type: 'sharity',
          citizenId: prof.kind === 'citizen' ? prof.id : undefined,
          citizenName: prof.kind === 'citizen' ? prof.name : undefined,
          companyId: prof.kind === 'company' ? (prof.id as Company['id']) : undefined,
          title: 'Sharity Follower Milestone',
          detail: `${prof.name} (${prof.handle}) reached ${m} followers on Sharity.`,
        }));
      }
    }
  }
}
