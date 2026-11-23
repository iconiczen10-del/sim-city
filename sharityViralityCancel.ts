// sharityViralityCancel.ts — Viral thresholds, city mood shifts, echo posts, and Cancel backlash waves

import { appendChangeExplanation, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { simPick, simRand } from './rng';
import { getAffinity } from './sharityAffinity';
import { applySharityMoodStressShock } from './sharityMoodSync';
import { getFollowersOf, trackFollowGain, trackFollowLoss } from './sharityNetwork';
import { recordPost } from './sharityPosting';
import type { SharityComment, SharityReaction } from './sharityReactionTypes';
import type { SharityPost, SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

const NEG_CMT = new Set(['disagreement', 'shade', 'callout', 'envy']);
function r1(n: number): number { return Math.round(n * 10) / 10; }

function spawnCopycatPost(sharity: SharityState, source: SharityPost, alive: Citizen[], clock: SimClock, dateLabel: string): void {
  const candidates = alive.filter((c) => c.id !== source.authorId && clock.totalDays - (sharity.authorLastPostDay?.[c.id] ?? -99) >= 2);
  if (candidates.length === 0) return;
  const author = simPick(candidates);
  const prof = sharity.profiles[author.id];
  if (!prof) return;
  const tag = source.hashtags[0] ?? '#Vij';
  const line = source.sentiment === 'negative'
    ? `Everyone across Vij is still talking about ${source.handle}'s post on ${tag}. Hard to ignore the mood right now.`
    : `Seeing ${source.handle}'s viral ${tag} post everywhere today — rare bright spark around Vij.`;
  recordPost(sharity, {
    id: `post_viral_echo_${clock.totalDays}_${author.id}_${sharity.posts.length}`,
    authorId: author.id, handle: prof.handle, createdDay: clock.totalDays, dateLabel, topic: source.topic,
    triggerKey: 'viral_echo', voice: source.sentiment === 'negative' ? 'anxious' : 'hopeful', sentiment: source.sentiment,
    text: line, hashtags: tag ? [tag] : ['#Vij'], mentions: [source.handle], urgencyWeight: 68,
    why: { trigger: `Echoed viral post by ${source.handle}`, gateScores: { sociability: author.traits.sociability, eventStrength: 68, socialNeed: 40, moodSwing: 20, postWeight: 70 }, voiceReason: 'Reacting to viral Sharity topic', templateId: 'viral_echo_01', styleNote: 'City echo response' },
    likes: 0, dislikes: 0, replies: 0, reposts: 0, score: 50,
  }, clock, dateLabel);
}

export function evaluatePostViralityAndCancel(params: {
  sharity: SharityState; post: SharityPost; poster?: Citizen; reacts: SharityReaction[]; comments: SharityComment[];
  alive: Citizen[]; byId: Map<string, Citizen>; clock: SimClock; dateLabel: string; events: CityEvent[];
}): void {
  const { sharity, post, poster, reacts, comments, alive, byId, clock, dateLabel, events } = params;
  const totalReacts = post.likes + post.dislikes + post.replies + post.reposts;

  const reachReq = Math.max(16, Math.ceil(alive.length * 0.84));
  const reactReq = Math.max(26, Math.ceil(alive.length * 1.28));
  if (!post.isViral && (((post.reach ?? 0) >= reachReq && totalReacts >= reactReq) || totalReacts >= Math.ceil(alive.length * 1.5))) {
    post.isViral = true; post.viralDay = clock.totalDays;
    const positiveViral = post.likes >= post.dislikes;
    for (const r of reacts) {
      if (r.kind === 'like' && simRand() < 0.45) trackFollowGain(sharity, r.citizenId, post.authorId);
    }
    const cityNudge = post.sentiment === 'positive' ? 0.5 : post.sentiment === 'negative' ? -0.5 : 0;
    if (cityNudge !== 0) {
      for (const c of alive) {
        applySharityMoodStressShock(c, {
          id: `viral_city_${post.id}`,
          label: 'Viral Sharity mood ripple',
          moodDelta: cityNudge,
          stressDelta: 0,
          decayRate: 0.75,
          postId: post.id,
        });
      }
    }
    if (poster && poster.alive) {
      poster.socialReputation = r1(clamp((poster.socialReputation ?? 50) + (positiveViral ? 6 : -4), 0, 100));
      addCitizenMemory(poster, clock, dateLabel, positiveViral ? 'sharity_praise' : 'sharity_humiliation', positiveViral ? 'Went viral with strong support on Sharity.' : 'Suffered viral backlash on Sharity.', positiveViral ? 28 : -32);
      if (!positiveViral) poster.sharityBurnedUntilDay = clock.totalDays + 7;
      appendLifeLog(poster, clock.totalDays, dateLabel, 'sharity', `Post went viral (${totalReacts} reactions, ${post.reach ?? 0} reach).`);
    }
    spawnCopycatPost(sharity, post, alive, clock, dateLabel);
    events.push(makeCityEvent(clock, `viral_${post.id}`, {
      type: 'viral', citizenId: poster?.id, citizenName: poster?.name, companyId: poster ? undefined : (post.authorId as Citizen['employerId'] & string),
      title: 'Sharity Post Went Viral', detail: `${post.handle}'s post went viral (${post.reach ?? 0} reach, ${totalReacts} reactions): "${post.text.slice(0, 64)}..."`,
    }));
  }

  const negCount = comments.filter((c) => NEG_CMT.has(c.type)).length;
  const notCurrentlyCancelled = clock.totalDays > (poster?.cancelledUntilDay ?? -99);
  if (!post.isCancelled && poster && poster.alive && notCurrentlyCancelled && post.dislikes >= Math.max(14, Math.ceil(alive.length * 0.42)) && negCount >= Math.max(8, Math.ceil(comments.length * 0.6)) && post.dislikes >= Math.max(1, post.likes) * 3) {
    post.isCancelled = true; post.cancelledDay = clock.totalDays;
    poster.cancelledUntilDay = clock.totalDays + 21; poster.sharityBurnedUntilDay = clock.totalDays + 10;
    poster.socialReputation = r1(clamp((poster.socialReputation ?? 50) - 18, 0, 100));
    applySharityMoodStressShock(poster, { id: `cancel_${post.id}`, label: 'Public cancellation backlash', moodDelta: -10, stressDelta: 12, decayRate: 0.84, postId: post.id });
    addCitizenMemory(poster, clock, dateLabel, 'sharity_humiliation', 'Cancelled after heavy Sharity backlash.', -45);
    appendChangeExplanation(poster, clock.totalDays, dateLabel, 'social_shift', `Cancelled on Sharity (${post.dislikes} dislikes); Social Reputation dropped to ${poster.socialReputation}.`, undefined, post.id);
    appendLifeLog(poster, clock.totalDays, dateLabel, 'sharity', `Cancelled on Sharity after ${post.dislikes} public dislikes.`);
    let unfollowed = 0;
    for (const fId of getFollowersOf(sharity, poster.id)) {
      if (getAffinity(sharity, fId, poster.id) < 45 && simRand() < 0.72 && trackFollowLoss(sharity, fId, poster.id, byId, 1)) unfollowed += 1;
    }
    events.push(makeCityEvent(clock, `cancel_${post.id}`, {
      type: 'cancelled', citizenId: poster.id, citizenName: poster.name,
      title: `${poster.name} Cancelled on Sharity`, detail: `${poster.sharityHandle} faced massive backlash (${post.dislikes} dislikes, -${unfollowed} followers, rep ${poster.socialReputation}).`,
    }));
  }
}
