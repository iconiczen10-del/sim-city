// sharityMemorialWaves.ts — Multi-day city reaction waves and death memorial tributes on Sharity

import type { Company } from './companyTypes';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { formatSimDate } from './formatters';
import type { MartState } from './martTypes';
import { simPick, simRand } from './rng';
import { getAffinity } from './sharityAffinity';
import { applySharityMoodStressShock } from './sharityMoodSync';
import { recordPost } from './sharityPosting';
import type { SharityPost, SharityState } from './sharityTypes';
import { detectNewWaves } from './sharityWaveDetector';
import type { Citizen, CityEvent } from './types';

export function stepSharityMemorialsAndWaves(params: {
  sharity: SharityState; citizens: Citizen[]; companies: Company[]; mart: MartState; dayEvents: CityEvent[]; clock: SimClock; events: CityEvent[];
}): void {
  const { sharity, citizens, companies, mart, dayEvents, clock, events } = params;
  const dateLabel = formatSimDate(clock.day, clock.month, clock.year);
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const alive = citizens.filter((c) => c.alive);
  if (alive.length === 0) return;

  detectNewWaves({ sharity, aliveCount: alive.length, mart, dayEvents, clock, dateLabel, events });
  sharity.cityWaves = (sharity.cityWaves ?? []).filter((w) => w.endDay >= clock.totalDays);

  const queued = sharity.queuedTributes ?? [];
  for (const ev of dayEvents) {
    if (ev.type === 'death' && ev.citizenId && !queued.some((q) => q.deadId === ev.citizenId)) {
      const deadId = ev.citizenId;
      const writers = alive
        .map((c) => ({ c, w: getAffinity(sharity, c.id, deadId) + c.traits.kindness * 0.4 }))
        .filter((x) => x.w >= 40)
        .sort((a, b) => b.w - a.w)
        .slice(0, 4)
        .map((x) => x.c.id);
      queued.push({ deadId, dueDay: clock.totalDays + 1, authorIds: writers, companyReplied: false });
    }
  }

  for (const q of queued) {
    if (clock.totalDays < q.dueDay || clock.totalDays > q.dueDay + 2) continue;
    const dead = byId.get(q.deadId);
    const deadProf = sharity.profiles[q.deadId];
    if (!dead || !deadProf) continue;

    if (!q.companyReplied) {
      q.companyReplied = true;
      const lastJob = dead.workHistory[0];
      const comp = lastJob ? companies.find((c) => c.id === lastJob.companyId) : undefined;
      const compProf = comp ? sharity.profiles[comp.id] : undefined;
      if (comp && compProf) {
        const post: SharityPost = {
          id: `post_trib_co_${clock.totalDays}_${dead.id}`, authorId: comp.id, handle: compProf.handle,
          createdDay: clock.totalDays, dateLabel, topic: 'loss_hardship', triggerKey: 'tribute', voice: 'kind', sentiment: 'positive',
          text: `${comp.name} mourns the passing of ${dead.name} (${deadProf.handle}), remembered by teammates across the floor.`,
          hashtags: ['#InMemory', `#${comp.name.replace(/\s+/g, '')}`], mentions: [deadProf.handle], urgencyWeight: 80,
          isTribute: true, tributeForId: dead.id,
          why: { trigger: `Memorial condolence for ${dead.name}`, gateScores: { sociability: 90, eventStrength: 80, socialNeed: 60, moodSwing: 40, postWeight: 85 }, voiceReason: 'Official company condolences', templateId: 'tribute_co_01', styleNote: 'Official tribute' },
          likes: 0, dislikes: 0, replies: 0, reposts: 0, score: 80,
        };
        recordPost(sharity, post, clock, dateLabel);
      }
    }

    const authorId = q.authorIds.shift();
    const writer = authorId ? byId.get(authorId) : undefined;
    if (writer && writer.alive) {
      const prof = sharity.profiles[writer.id];
      if (prof) {
        const line = simPick([
          `Still hard processing losing ${dead.name} (${deadProf.handle}). Vij feels quieter without their warmth.`,
          `Thinking of ${dead.name} (${deadProf.handle}) today — always showed up when it mattered.`,
          `Rest easy, ${dead.name} (${deadProf.handle}). Neighbors here will not forget you.`,
        ]);
        recordPost(sharity, {
          id: `post_trib_${clock.totalDays}_${writer.id}_${dead.id}`, authorId: writer.id, handle: prof.handle,
          createdDay: clock.totalDays, dateLabel, topic: 'loss_hardship', triggerKey: 'tribute', voice: 'kind', sentiment: 'positive',
          text: line, hashtags: ['#InMemory'], mentions: [deadProf.handle], urgencyWeight: 78, isTribute: true, tributeForId: dead.id,
          why: { trigger: `Personal tribute to ${dead.name}`, gateScores: { sociability: writer.traits.sociability, eventStrength: 78, socialNeed: 60, moodSwing: 45, postWeight: 78 }, voiceReason: 'Warm remembrance', templateId: 'tribute_cit_01', styleNote: 'Memorial post' },
          likes: 0, dislikes: 0, replies: 0, reposts: 0, score: 75,
        }, clock, dateLabel);
        events.push(makeCityEvent(clock, `trib_${dead.id}_${writer.id}`, { type: 'tribute', citizenId: writer.id, citizenName: writer.name, title: `Memorial Tribute for ${dead.name}`, detail: `${prof.handle} posted a tribute in memory of ${dead.name}.` }));
      }
    }

    const rival = clock.totalDays === q.dueDay ? alive.find((c) => getAffinity(sharity, c.id, dead.id) <= -35 && c.traits.kindness < 45) : undefined;
    if (rival && simRand() < 0.6) {
      const rProf = sharity.profiles[rival.id];
      const friends = alive.filter((c) => c.id !== rival.id && getAffinity(sharity, c.id, dead.id) >= 35).slice(0, 5);
      if (rProf && friends.length > 0) {
        const coldPost: SharityPost = {
          id: `post_cold_${clock.totalDays}_${rival.id}_${dead.id}`, authorId: rival.id, handle: rProf.handle,
          createdDay: clock.totalDays, dateLabel, topic: 'social_drama', triggerKey: 'tribute_cold', voice: 'bitter', sentiment: 'negative',
          text: `Everyone rewriting history over ${dead.name} (${deadProf.handle}) today — some of us remember the tension.`,
          hashtags: ['#Vij'], mentions: [deadProf.handle], urgencyWeight: 74, isTribute: true, tributeForId: dead.id,
          why: { trigger: `Cold rival take on ${dead.name}'s passing`, gateScores: { sociability: rival.traits.sociability, eventStrength: 74, socialNeed: 40, moodSwing: 30, postWeight: 70 }, voiceReason: 'Rival indifference triggering backlash', templateId: 'tribute_cold_01', styleNote: 'Cold take' },
          likes: 0, dislikes: friends.length, replies: Math.min(2, friends.length), reposts: 0, reach: friends.length + 2, heat: friends.length * 2, score: 60,
        };
        recordPost(sharity, coldPost, clock, dateLabel);
        sharity.reactionsByPost = { ...(sharity.reactionsByPost ?? {}), [coldPost.id]: friends.map((f) => ({ id: `react_cold_${clock.totalDays}_${f.id}`, postId: coldPost.id, citizenId: f.id, kind: 'dislike' as const, totalDay: clock.totalDays, dateLabel, reason: 'Backlash to cold post about deceased neighbor', factors: [{ label: 'Respect for Deceased', value: -35, detail: `Friend of ${dead.name}` }] })) };
        sharity.commentsByPost = { ...(sharity.commentsByPost ?? {}), [coldPost.id]: friends.slice(0, 2).map((f, idx) => ({ id: `cmt_cold_${clock.totalDays}_${f.id}_${idx}`, postId: coldPost.id, parentId: null, authorId: f.id, handle: sharity.profiles[f.id]?.handle ?? f.name, createdDay: clock.totalDays, dateLabel, type: 'callout' as const, text: `Have some basic decency today, ${rProf.handle}.`, score: 20, reason: 'Called out cold death post', factors: [{ label: 'Loyalty', value: 30, detail: `Defended memory of ${dead.name}` }] })) };
        rival.socialReputation = Math.round(clamp((rival.socialReputation ?? 50) - 8, 0, 100) * 10) / 10;
        applySharityMoodStressShock(rival, { id: `cold_${coldPost.id}`, label: 'Backlash over cold memorial take', moodDelta: -5, stressDelta: 6, decayRate: 0.8, postId: coldPost.id });
        events.push(makeCityEvent(clock, `trib_cold_${rival.id}_${dead.id}`, { type: 'tribute', citizenId: rival.id, citizenName: rival.name, title: 'Backlash Over Cold Tribute', detail: `${rProf.handle} faced swift neighbor backlash for a cold take on ${dead.name}.` }));
      }
    }
  }
  sharity.queuedTributes = queued.filter((q) => clock.totalDays <= q.dueDay + 2 && (q.authorIds.length > 0 || !q.companyReplied));

  for (const w of sharity.cityWaves.slice(0, 2)) {
    const alreadyToday = sharity.posts.some((p) => p.createdDay === clock.totalDays && p.hashtags.includes(w.hashtag));
    if (!alreadyToday && simRand() < 0.65) {
      const author = simPick(alive);
      const prof = sharity.profiles[author.id];
      if (prof) {
        recordPost(sharity, {
          id: `post_wave_${clock.totalDays}_${author.id}_${w.kind}`, authorId: author.id, handle: prof.handle,
          createdDay: clock.totalDays, dateLabel, topic: 'city_mood', triggerKey: w.triggeredKey, voice: 'anxious', sentiment: 'negative',
          text: `City talk everywhere today is ${w.title.toLowerCase()} — hoping neighborhoods hold steady soon. ${w.hashtag}`,
          hashtags: [w.hashtag], mentions: [], urgencyWeight: 66,
          why: { trigger: `City-wide reaction wave: ${w.title}`, gateScores: { sociability: author.traits.sociability, eventStrength: 66, socialNeed: 50, moodSwing: 30, postWeight: 66 }, voiceReason: 'Reacting to ongoing city wave', templateId: 'city_wave_01', styleNote: 'City wave reaction' },
          likes: 0, dislikes: 0, replies: 0, reposts: 0, score: 45,
        }, clock, dateLabel);
      }
    }
  }
}
