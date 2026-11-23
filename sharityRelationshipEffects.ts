// sharityRelationshipEffects.ts — Affinity shifts from reactions/comments/arguments, gossip spread, and rival lists

import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { simRandFloat } from './rng';
import { affinityKey, getAffinity } from './sharityAffinity';
import type { SharityCommentType } from './sharityReactionTypes';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

const WARM = new Set<SharityCommentType>(['support', 'congratulation', 'sympathy', 'offer_help', 'defense']);
const COLD = new Set<SharityCommentType>(['shade', 'callout', 'envy']);

function shiftAffinity(sharity: SharityState, aId: string, bId: string, delta: number): void {
  if (aId === bId || delta === 0) return;
  const k = affinityKey(aId, bId);
  const cur = sharity.affinities[k] ?? 0;
  sharity.affinities[k] = Math.round(clamp(cur + delta, -100, 100));
}

export function getRivalsForCitizen(sharity: SharityState, citizenId: string, citizens: Citizen[]): { citizen: Citizen; score: number }[] {
  return citizens
    .filter((c) => c.id !== citizenId)
    .map((c) => ({ citizen: c, score: getAffinity(sharity, citizenId, c.id) }))
    .filter((r) => r.score <= -35)
    .sort((a, b) => a.score - b.score);
}

export function stepSharityRelationshipEffects(params: {
  sharity: SharityState;
  citizens: Citizen[];
  clock: SimClock;
  events: CityEvent[];
}): void {
  const { sharity, citizens, clock, events } = params;
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const profileByHandle = new Map(Object.values(sharity.profiles).map((p) => [p.handle, p]));

  for (const post of sharity.posts) {
    if (clock.totalDays - post.createdDay > 5) continue;
    const poster = byId.get(post.authorId);
    const seenR = new Set(post.processedReactionIds ?? []);
    const seenC = new Set(post.processedCommentIds ?? []);

    if (poster) {
      for (const r of sharity.reactionsByPost?.[post.id] ?? []) {
        const rk = `__aff_${r.id}`;
        if (seenR.has(rk) || !byId.has(r.citizenId)) continue;
        seenR.add(rk);
        if (r.kind === 'like') shiftAffinity(sharity, poster.id, r.citizenId, 1);
        else if (r.kind === 'dislike') shiftAffinity(sharity, poster.id, r.citizenId, -2);
      }

      for (const c of sharity.commentsByPost?.[post.id] ?? []) {
        const ck = `__aff_${c.id}`;
        if (seenC.has(ck) || !byId.has(c.authorId) || c.authorId === poster.id) continue;
        seenC.add(ck);
        if (WARM.has(c.type)) shiftAffinity(sharity, poster.id, c.authorId, 3);
        else if (COLD.has(c.type)) shiftAffinity(sharity, poster.id, c.authorId, -5);
        else if (c.type === 'disagreement') shiftAffinity(sharity, poster.id, c.authorId, -2);
      }
    }

    // Settle completed arguments once
    if (post.argumentState === 'ended' && !seenR.has('__arg_settled') && post.argumentLastSpeakerId && post.argumentTargetId) {
      seenR.add('__arg_settled');
      const reconciled = (post.argumentEndedReason ?? '').includes('de-escalated');
      const delta = reconciled ? 4 : -8;
      shiftAffinity(sharity, post.argumentLastSpeakerId, post.argumentTargetId, delta);
      if (reconciled) {
        events.push(makeCityEvent(clock, `sharity_reconcile_${post.id}`, {
          type: 'argument', citizenId: post.argumentLastSpeakerId,
          title: 'Sharity Argument Reconciled',
          detail: `${byId.get(post.argumentLastSpeakerId)?.name ?? 'Speakers'} cooled down a heated thread (+${delta} affinity).`,
        }));
      }
    }

    // Gossip: mention posts shift followers' affinity toward the mentioned citizen
    if (poster && !post.isTribute && post.mentions.length > 0 && !seenR.has('__gossip_done')) {
      seenR.add('__gossip_done');
      const baseShift = post.sentiment === 'positive' ? 4 : post.sentiment === 'negative' ? -5 : -1;
      for (const mh of post.mentions) {
        const target = profileByHandle.get(mh);
        if (!target || target.kind !== 'citizen' || target.id === poster.id) continue;
        for (const [followerId, list] of Object.entries(sharity.follows)) {
          if (!list.includes(poster.id) || followerId === poster.id || followerId === target.id) continue;
          const trust = clamp(getAffinity(sharity, followerId, poster.id) / 100, 0.08, 1);
          const delta = Math.round(baseShift * trust + simRandFloat(-1.2, 1.2));
          if (delta !== 0) shiftAffinity(sharity, followerId, target.id, delta);
        }
      }
    }

    post.processedReactionIds = Array.from(seenR);
    post.processedCommentIds = Array.from(seenC);
  }
}
