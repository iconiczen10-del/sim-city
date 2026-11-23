// sharityPosting.ts — Generates verified official company posts and weighted citizen posts on sim ticks

import type { Company, CompanyVacancy } from './companyTypes';
import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { formatSimDate } from './formatters';
import type { MartState } from './martTypes';
import { simRand } from './rng';
import { getFollowersOf } from './sharityNetwork';
import { emitOfficialCompanyPosts } from './sharityOfficialPosts';
import { chooseCitizenVoice, renderCitizenTemplate } from './sharityTemplateEngine';
import { collectCitizenTriggers, type TriggerCandidate } from './sharityTriggers';
import type { SharityPost, SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

export function recordPost(sharity: SharityState, post: SharityPost, clock: SimClock, dateLabel: string): void {
  sharity.posts.unshift(post);
  if (sharity.posts.length > 450) {
    const dropped = sharity.posts.slice(450);
    sharity.posts = sharity.posts.slice(0, 450);
    for (const d of dropped) {
      if (sharity.reactionsByPost) delete sharity.reactionsByPost[d.id];
      if (sharity.commentsByPost) delete sharity.commentsByPost[d.id];
    }
  }
  sharity.unreadPostCount += 1;
  sharity.recentTexts = [{ day: clock.totalDays, text: post.text }, ...(sharity.recentTexts ?? []).filter((r) => clock.totalDays - r.day <= 14)].slice(0, 200);
  sharity.authorLastPostDay = { ...(sharity.authorLastPostDay ?? {}), [post.authorId]: clock.totalDays };
  const map = sharity.authorLastTemplateDay ?? {};
  map[post.authorId] = { ...(map[post.authorId] ?? {}), [post.why.templateId]: clock.totalDays };
  sharity.authorLastTemplateDay = map;

  const stats = sharity.dailyStats ?? [];
  let row = stats.find((s) => s.day === clock.totalDays);
  if (!row) {
    row = { day: clock.totalDays, dateLabel, count: 0, pos: 0, neu: 0, neg: 0 };
    stats.push(row);
    if (stats.length > 60) stats.shift();
  }
  row.count += 1;
  if (post.sentiment === 'positive') row.pos += 1;
  else if (post.sentiment === 'negative') row.neg += 1;
  else row.neu += 1;
  sharity.dailyStats = stats;
}

export function runDailySharityPosts(params: {
  sharity: SharityState;
  citizens: Citizen[];
  companies: Company[];
  mart: MartState;
  vacancies: CompanyVacancy[];
  dayEvents: CityEvent[];
  recentUnprocessedSimgod: CityEvent[];
  clock: SimClock;
  isMonthEnd: boolean;
  budget: number;
  events: CityEvent[];
}): void {
  const { sharity, citizens, companies, mart, vacancies, dayEvents, recentUnprocessedSimgod, clock, isMonthEnd, budget, events } = params;
  const dateLabel = formatSimDate(clock.day, clock.month, clock.year);
  const allTriggerEvents = [...dayEvents, ...recentUnprocessedSimgod];

  const officialCompanyIds = emitOfficialCompanyPosts({
    sharity, companies, citizens, mart, vacancies, dayEvents: allTriggerEvents, clock, dateLabel, isMonthEnd, events, recordPost,
  });
  if (budget <= 0) return;

  const candidates = collectCitizenTriggers({
    citizens, companies, mart, sharity, dayEvents: allTriggerEvents, officialCompanyIds, day: clock.day, totalDays: clock.totalDays,
  });
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const scored: { cand: TriggerCandidate; weight: number; soc: number; socialNeed: number; moodSwing: number }[] = [];

  for (const cand of candidates) {
    const c = byId.get(cand.authorId);
    if (!c || !c.alive) continue;
    const lastDay = sharity.authorLastPostDay?.[c.id] ?? -99;
    if (!cand.isBigEvent && clock.totalDays - lastDay < 2) continue;
    const quietMode = c.mood < 28 && c.stress > 70 && c.traits.sociability < 40;
    const burnedMult = c.sharityBurnedUntilDay && clock.totalDays <= c.sharityBurnedUntilDay ? 0.25 : 1;
    const soc = c.traits.sociability;
    const socialNeed = Math.round((100 - c.mood) * 0.25 + c.traits.sociability * 0.35);
    const moodSwing = Math.round(Math.abs(c.mood - 55) * 0.45);
    const weight = (quietMode ? 0.08 : 0.35 + (soc / 100) * 1.15) * burnedMult * (cand.urgency + socialNeed + moodSwing);
    scored.push({ cand, weight: Math.max(1, weight), soc, socialNeed, moodSwing });
  }

  const pickedAuthors = new Set<string>();
  for (let i = 0; i < budget && scored.length > 0; i++) {
    const pool = scored.filter((s) => !pickedAuthors.has(s.cand.authorId));
    if (pool.length === 0) break;
    const totalW = pool.reduce((s, r) => s + r.weight, 0);
    let roll = simRand() * totalW;
    let chosen = pool[pool.length - 1];
    for (const row of pool) { roll -= row.weight; if (roll <= 0) { chosen = row; break; } }

    const c = byId.get(chosen.cand.authorId)!;
    const prof = sharity.profiles[c.id];
    if (!prof) continue;
    pickedAuthors.add(c.id);

    const v = chooseCitizenVoice(c, chosen.cand.triggerKey);
    const rendered = renderCitizenTemplate({ citizen: c, topic: chosen.cand.topic, triggerKey: chosen.cand.triggerKey, voice: v.voice, vars: chosen.cand.vars, sharity, totalDays: clock.totalDays });
    const mentions = chosen.cand.mentionHandle ? [chosen.cand.mentionHandle] : [];
    const followers = getFollowersOf(sharity, c.id).length;
    const empCritTrigger = ['bad_boss', 'pay_cut', 'late_pay', 'take_low_pay', 'take_ceo_gap', 'company_reaction'].includes(chosen.cand.triggerKey);
    const critiquesCompanyId = c.employerId && v.sentiment === 'negative' && (empCritTrigger || chosen.cand.topic === 'work_career' || chosen.cand.topic === 'companies') ? c.employerId : undefined;

    const post: SharityPost = {
      id: `post_${clock.totalDays}_${c.id}_${i}`,
      authorId: c.id, handle: prof.handle, createdDay: clock.totalDays, dateLabel,
      topic: chosen.cand.topic, triggerKey: chosen.cand.triggerKey, voice: v.voice, sentiment: v.sentiment,
      text: rendered.text, hashtags: rendered.hashtags, mentions, urgencyWeight: chosen.cand.urgency,
      critiquesCompanyId,
      why: {
        trigger: chosen.cand.triggerLabel,
        gateScores: { sociability: chosen.soc, eventStrength: chosen.cand.urgency, socialNeed: chosen.socialNeed, moodSwing: chosen.moodSwing, postWeight: Math.round(chosen.weight) },
        voiceReason: v.reason, templateId: rendered.templateId, styleNote: rendered.styleNote,
      },
      likes: 0, dislikes: 0, replies: 0, reposts: 0, score: followers * 3 + chosen.cand.urgency * 2,
    };
    recordPost(sharity, post, clock, dateLabel);
    if (c.needs?.social) {
      c.needs.social.value = Math.min(100, Math.round((c.needs.social.value + 7) * 10) / 10);
      c.needs.social.lastRestoredDay = clock.totalDays;
    }
    if (chosen.cand.urgency >= 78) {
      events.push(makeCityEvent(clock, `sharity_post_${c.id}`, { type: 'sharity', citizenId: c.id, citizenName: c.name, title: `Notable Post by ${c.name}`, detail: `${prof.handle}: "${rendered.text}"` }));
    }
  }
}
