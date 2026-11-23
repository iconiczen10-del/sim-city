// sharityWorkConsequences.ts — Employer criticism fallout, CEO trait reactions, coworker defense, and reputation impact

import { appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import type { Company } from './companyTypes';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { formatSimDate } from './formatters';
import type { MartState } from './martTypes';
import { simPick } from './rng';
import type { SharityPost, SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

function addCompanyReply(sharity: SharityState, post: SharityPost, comp: Company, ceo: Citizen | undefined, clock: SimClock, dateLabel: string): void {
  const list = (sharity.commentsByPost![post.id] ??= []);
  if (list.some((c) => c.authorId === comp.id)) return;
  const prof = sharity.profiles[comp.id];
  if (!prof) return;
  const text = ceo && ceo.traits.greed >= 60
    ? `${comp.name} expects staff concerns to go through management channels rather than public Sharity feeds.`
    : ceo && ceo.traits.kindness >= 60
    ? `We hear the concern raised by ${post.handle} and are reviewing floor schedules with team leads.`
    : `${comp.name} has noted these remarks and remains focused on steady operations.`;
  list.push({
    id: `cmt_co_${clock.totalDays}_${post.id}`, postId: post.id, parentId: null, authorId: comp.id, handle: prof.handle,
    createdDay: clock.totalDays, dateLabel, type: 'defense', text, score: 25,
    reason: `Official ${comp.name} response to employee criticism`,
    factors: [{ label: 'Corporate Reply', value: 15, detail: ceo ? `CEO ${ceo.name} tone` : 'Management response' }],
  });
  post.replies = list.length;
}

export function stepSharityWorkConsequences(params: {
  sharity: SharityState; citizens: Citizen[]; companies: Company[]; mart: MartState; clock: SimClock; events: CityEvent[];
}): void {
  const { sharity, citizens, companies, mart, clock, events } = params;
  const dateLabel = formatSimDate(clock.day, clock.month, clock.year);
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const compById = new Map(companies.map((c) => [c.id, c]));
  sharity.commentsByPost = sharity.commentsByPost ?? {};

  for (const post of sharity.posts) {
    if (clock.totalDays - post.createdDay > 3) continue;
    const poster = byId.get(post.authorId);

    if (poster && poster.alive && poster.employerId && !post.workConsequenceApplied) {
      const comp = compById.get(poster.employerId);
      if (comp && !comp.bankrupt) {
        const isPraise = post.sentiment === 'positive' && (post.topic === 'work_career' || post.topic === 'companies');
        const isCrit = post.critiquesCompanyId === comp.id;

        if (isPraise) {
          post.workConsequenceApplied = true;
          poster.bossRelationship = Math.round(clamp(poster.bossRelationship + 3, -100, 100));
          poster.performanceScore = Math.round(clamp(poster.performanceScore + 1, 5, 99));
          poster.sharityWorkNotes = [{ id: `swn_${post.id}`, dateLabel, summary: `Public praise helped standing at ${comp.name} (+3 boss rel).`, postId: post.id }, ...(poster.sharityWorkNotes ?? [])].slice(0, 12);
        } else if (isCrit) {
          post.workConsequenceApplied = true;
          const ceo = comp.ceoId ? byId.get(comp.ceoId) : undefined;
          const boss = poster.bossId ? byId.get(poster.bossId) : ceo;
          const harsh = (ceo && ceo.traits.greed >= 60) || (boss && boss.traits.greed >= 65);
          const kind = !harsh && ((ceo && ceo.traits.kindness >= 60) || (boss && boss.traits.kindness >= 65));
          const bossDelta = harsh ? -12 : kind ? -2 : -6;
          const perfDelta = harsh ? -7 : kind ? -1 : -3;

          poster.bossRelationship = Math.round(clamp(poster.bossRelationship + bossDelta, -100, 100));
          poster.performanceScore = Math.round(clamp(poster.performanceScore + perfDelta, 5, 99));
          if (harsh || post.isCancelled) poster.promotionBlockedUntilDay = Math.max(poster.promotionBlockedUntilDay ?? 0, clock.totalDays + 45);

          const summary = harsh
            ? `CEO reacted harshly to Sharity criticism (${bossDelta} boss rel, ${perfDelta} perf, 45d promo block).`
            : kind ? `Leadership noted Sharity concern gently (${bossDelta} boss rel).`
            : `Employer criticism hurt standing (${bossDelta} boss rel, ${perfDelta} perf).`;
          poster.sharityWorkNotes = [{ id: `swn_${post.id}`, dateLabel, summary, postId: post.id }, ...(poster.sharityWorkNotes ?? [])].slice(0, 12);
          appendLifeLog(poster, clock.totalDays, dateLabel, 'sharity', summary);

          comp.reputation = Math.round(clamp(comp.reputation - 0.8, 0, 100) * 10) / 10;
          comp.sharityCriticismLog = [{ id: `crit_${post.id}`, dateLabel, citizenId: poster.id, citizenName: poster.name, deltaRep: -0.8, postId: post.id, summary: `${poster.sharityHandle} criticized ${comp.name} publicly.` }, ...(comp.sharityCriticismLog ?? [])].slice(0, 20);

          const loyalCoworker = citizens.filter((c) => c.alive && c.id !== poster.id && c.employerId === comp.id && c.traits.loyalty >= 60);
          if (loyalCoworker.length > 0) {
            const cw = simPick(loyalCoworker);
            const list = (sharity.commentsByPost[post.id] ??= []);
            if (!list.some((x) => x.authorId === cw.id)) {
              list.push({ id: `cmt_cw_${clock.totalDays}_${post.id}`, postId: post.id, parentId: null, authorId: cw.id, handle: sharity.profiles[cw.id]?.handle ?? cw.name, createdDay: clock.totalDays, dateLabel, type: 'defense', text: `Wait — floor teams at ${comp.name} are working hard behind the scenes, ${post.handle}.`, score: 10, reason: 'Loyal coworker pushed back', factors: [{ label: 'Loyalty', value: cw.traits.loyalty, detail: `Loyalty ${cw.traits.loyalty}` }] });
              post.replies = list.length;
            }
          }
          const recentCrits = sharity.posts.filter((p) => p.critiquesCompanyId === comp.id && clock.totalDays - p.createdDay <= 7).length;
          if (recentCrits >= 2 || post.isViral) addCompanyReply(sharity, post, comp, ceo, clock, dateLabel);
          events.push(makeCityEvent(clock, `work_crit_${post.id}`, { type: 'work-consequence', citizenId: poster.id, citizenName: poster.name, companyId: comp.id, title: 'Sharity Criticism Fallout', detail: `${poster.name}'s post about ${comp.name}: ${summary}` }));
        }
      }
    }

    if (post.isViral && post.sentiment === 'negative' && post.critiquesCompanyId && !post.processedReactionIds?.includes('__co_viral_rep')) {
      post.processedReactionIds = [...(post.processedReactionIds ?? []), '__co_viral_rep'];
      const comp = compById.get(post.critiquesCompanyId);
      if (comp) {
        comp.reputation = Math.round(clamp(comp.reputation - 3.2, 0, 100) * 10) / 10;
        comp.sharityCriticismLog = [{ id: `vcrit_${post.id}`, dateLabel, citizenId: post.authorId, citizenName: poster?.name ?? post.handle, deltaRep: -3.2, postId: post.id, summary: `Viral negative post hit ${comp.name} reputation (-3.2).` }, ...(comp.sharityCriticismLog ?? [])].slice(0, 20);
        if (poster) addCitizenMemory(poster, clock, dateLabel, 'loss', `Viral criticism damaged standing with ${comp.name}.`, -15);
      }
    }

    if (post.isCancelled && poster && poster.alive && poster.employerId && !post.processedReactionIds?.includes('__cancel_work')) {
      post.processedReactionIds = [...(post.processedReactionIds ?? []), '__cancel_work'];
      const comp = compById.get(poster.employerId);
      if (comp && !comp.bankrupt) {
        poster.bossRelationship = Math.round(clamp(poster.bossRelationship - 6, -100, 100));
        poster.performanceScore = Math.round(clamp(poster.performanceScore - 4, 5, 99));
        poster.promotionBlockedUntilDay = Math.max(poster.promotionBlockedUntilDay ?? 0, clock.totalDays + 30);
        const note = `Cancelled on Sharity (-6 boss rel, -4 perf, 30d promo hold).`;
        poster.sharityWorkNotes = [{ id: `swn_c_${post.id}`, dateLabel, summary: note, postId: post.id }, ...(poster.sharityWorkNotes ?? [])].slice(0, 12);
        events.push(makeCityEvent(clock, `work_cancel_${post.id}`, { type: 'work-consequence', citizenId: poster.id, citizenName: poster.name, companyId: comp.id, title: 'Workplace Fallout From Backlash', detail: `${poster.name} at ${comp.name}: ${note}` }));
      }
    }
  }

  const martNegs = sharity.posts.filter((p) => p.topic === 'vij_mart' && p.sentiment === 'negative' && clock.totalDays - p.createdDay <= 3).length;
  const martKey = `mart_rep_wave_${Math.floor(clock.totalDays / 4)}`;
  if (martNegs >= 3 && !(sharity.handledEventIds ?? []).includes(martKey)) {
    sharity.handledEventIds = [martKey, ...(sharity.handledEventIds ?? [])].slice(0, 80);
    mart.reputation = Math.round(clamp(mart.reputation - 2.5, 0, 100) * 10) / 10;
    const martComp = compById.get('vijmart');
    if (martComp) martComp.reputation = mart.reputation;
    events.push(makeCityEvent(clock, martKey, { type: 'work-consequence', companyId: 'vijmart', title: 'Vij Mart Reputation Hit', detail: `${martNegs} Sharity complaints over shelves/prices lowered Vij Mart reputation to ${mart.reputation}/100.` }));
  }
}
