// sharityConsequences.ts — S4 poster mood/stress/reputation effects from daily reactions and comments

import { appendChangeExplanation, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { formatSimDate } from './formatters';
import { getAffinity } from './sharityAffinity';
import { applySharityMoodStressShock } from './sharityMoodSync';
import type { SharityState } from './sharityTypes';
import { evaluatePostViralityAndCancel } from './sharityViralityCancel';
import type { Citizen, CityEvent } from './types';

const NEG_CMT = new Set(['disagreement', 'shade', 'callout', 'envy']);
function r1(n: number): number { return Math.round(n * 10) / 10; }

export function stepSharityConsequences(params: { sharity: SharityState; citizens: Citizen[]; clock: SimClock; events: CityEvent[] }): void {
  const { sharity, citizens, clock, events } = params;
  const dateLabel = formatSimDate(clock.day, clock.month, clock.year);
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const alive = citizens.filter((c) => c.alive);
  if (alive.length === 0) return;

  for (const post of sharity.posts) {
    if (clock.totalDays - post.createdDay > 5) continue;
    const poster = byId.get(post.authorId);
    const reacts = sharity.reactionsByPost?.[post.id] ?? [];
    const comments = sharity.commentsByPost?.[post.id] ?? [];
    const seenR = new Set(post.processedReactionIds ?? []);
    const seenC = new Set(post.processedCommentIds ?? []);

    if (poster && poster.alive) {
      const sens = ((100 - poster.traits.discipline) * 0.6 + poster.traits.sociability * 0.4) / 60;
      const reachMult = 1 + Math.min(1.1, (post.reach ?? 1) / 20);
      let likeHits = 0; let dislikeHits = 0; let moodNet = 0; let stressNet = 0; let repNet = 0; let friendHurt = false;

      for (const r of reacts) {
        if (seenR.has(r.id) || r.id.startsWith('__')) continue;
        seenR.add(r.id);
        if (r.kind === 'like') {
          const dim = 1 / (1 + likeHits * 0.3);
          likeHits += 1; moodNet += 0.7 * dim; stressNet -= 0.4 * dim; repNet += 0.35 * dim;
        } else if (r.kind === 'dislike') {
          const aff = getAffinity(sharity, poster.id, r.citizenId);
          const friendMult = aff >= 40 ? 2.4 : aff >= 15 ? 1.4 : 1;
          if (aff >= 40) friendHurt = true;
          const dim = 1 / (1 + dislikeHits * 0.25);
          dislikeHits += 1; moodNet -= 1.25 * friendMult * reachMult * sens * dim;
          stressNet += 1.05 * friendMult * sens * dim; repNet -= 0.65 * dim;
        }
      }
      for (const c of comments) {
        if (seenC.has(c.id)) continue;
        seenC.add(c.id);
        if (NEG_CMT.has(c.type)) {
          const aff = getAffinity(sharity, poster.id, c.authorId);
          const friendMult = aff >= 40 ? 2.2 : 1;
          if (aff >= 40 && c.type === 'shade') {
            friendHurt = true;
            addCitizenMemory(poster, clock, dateLabel, 'sharity_shade', `Friend ${c.handle} threw shade on Sharity.`, -18);
          }
          moodNet -= 1.1 * friendMult * sens; stressNet += 1.0 * friendMult * sens; repNet -= 0.5;
        } else {
          moodNet += 0.5; stressNet -= 0.3; repNet += 0.25;
        }
      }
      moodNet = clamp(moodNet, -11, 7); stressNet = clamp(stressNet, -5, 11);
      if (Math.abs(repNet) >= 0.05) poster.socialReputation = r1(clamp((poster.socialReputation ?? 50) + repNet, 0, 100));

      if (Math.abs(moodNet) >= 0.4 || Math.abs(stressNet) >= 0.4) {
        const lbl = friendHurt ? 'Public dislike from close friend' : moodNet >= 0 ? 'Sharity post approval' : 'Sharity negative reactions';
        applySharityMoodStressShock(poster, { id: `sh_${post.id}_${clock.totalDays}`, label: lbl, moodDelta: moodNet, stressDelta: stressNet, decayRate: 0.78, postId: post.id });
        if (Math.abs(moodNet) >= 2.8) {
          const verb = moodNet >= 0 ? `Approval on ${post.handle}'s post lifted mood (${r1(moodNet)}).` : `${lbl} hit mood (${r1(moodNet)}) & stress (+${r1(stressNet)}).`;
          appendChangeExplanation(poster, clock.totalDays, dateLabel, 'social_shift', verb, undefined, post.id);
          appendLifeLog(poster, clock.totalDays, dateLabel, 'sharity', verb);
        }
      }
    }

    evaluatePostViralityAndCancel({ sharity, post, poster, reacts, comments, alive, byId, clock, dateLabel, events });
    post.processedReactionIds = Array.from(seenR);
    post.processedCommentIds = Array.from(seenC);
  }
}
