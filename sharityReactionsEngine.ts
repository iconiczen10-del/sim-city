// sharityReactionsEngine.ts — Daily viewer scroll budgets, delayed reach, public likes/dislikes/shares, and hot logging

import type { Company } from './companyTypes';
import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { formatSimDate } from './formatters';
import { simRand } from './rng';
import { getAffinity } from './sharityAffinity';
import { renderCommentText } from './sharityCommentBankB';
import type { SharityComment, SharityReaction } from './sharityReactionTypes';
import { evaluateViewerReaction } from './sharityScoring';
import { renderThreadLine, SHARE_NOTE_LINES } from './sharityThreadBank';
import type { SharityPost, SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

function computeControversy(likes: number, dislikes: number): number {
  const total = likes + dislikes;
  if (total < 2 || likes === 0 || dislikes === 0) return 0;
  return Math.round((Math.min(likes, dislikes) / Math.max(likes, dislikes)) * total * 10);
}

export function stepSharityReactions(params: {
  sharity: SharityState;
  citizens: Citizen[];
  companies: Company[];
  clock: SimClock;
  events: CityEvent[];
}): void {
  const { sharity, citizens, companies, clock, events } = params;
  const alive = citizens.filter((c) => c.alive);
  if (alive.length === 0 || sharity.posts.length === 0) return;

  const dateLabel = formatSimDate(clock.day, clock.month, clock.year);
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const activePosts = sharity.posts.filter((p) => clock.totalDays - p.createdDay <= 4);
  if (activePosts.length === 0) return;

  sharity.reactionsByPost = sharity.reactionsByPost ?? {};
  sharity.commentsByPost = sharity.commentsByPost ?? {};

  for (const viewer of alive) {
    const scrollBudget = Math.max(3, Math.min(15, Math.round(3 + (viewer.traits.sociability / 100) * 9 + ((viewer.mood - 40) / 60) * 3)));
    const followingSet = new Set(sharity.follows[viewer.id] ?? []);
    const viewerHandle = sharity.profiles[viewer.id]?.handle ?? '';

    const ranked: { post: SharityPost; prio: number }[] = [];
    for (const post of activePosts) {
      if (post.authorId === viewer.id) continue;
      if (post.viewerIds?.includes(viewer.id)) continue;
      const age = clock.totalDays - post.createdDay;
      const followsAuthor = followingSet.has(post.authorId);
      const mentioned = post.mentions.includes(viewerHandle);
      const postReacts = sharity.reactionsByPost[post.id] ?? [];
      const sharedByFollowed = postReacts.some((r) => r.kind === 'share' && followingSet.has(r.citizenId));
      const isViral = (post.heat ?? 0) >= 16 || post.urgencyWeight >= 72;

      if (followsAuthor && age <= 1 && (age === 1 || simRand() < 0.72)) ranked.push({ post, prio: 100 - age * 10 });
      else if (mentioned && age <= 1) ranked.push({ post, prio: 92 - age * 8 });
      else if (sharedByFollowed && age >= 1 && age <= 3) ranked.push({ post, prio: 78 - age * 6 });
      else if (isViral && age >= 1 && age <= 3 && simRand() < 0.45) ranked.push({ post, prio: 64 - age * 5 });
      else if (age >= 1 && age <= 2 && simRand() < 0.12) ranked.push({ post, prio: 30 - age * 5 });
    }

    ranked.sort((a, b) => b.prio - a.prio);
    const toView = ranked.slice(0, scrollBudget);

    for (const { post } of toView) {
      post.viewerIds = [...(post.viewerIds ?? []), viewer.id];
      post.reach = post.viewerIds.length;
      const author = byId.get(post.authorId);
      const dec = evaluateViewerReaction({ viewer, author, post, sharity, citizens, totalDays: clock.totalDays });
      if (dec.stance === 'ignore') continue;

      const reactList = (sharity.reactionsByPost[post.id] ??= []);
      if (reactList.some((r) => r.citizenId === viewer.id && (r.kind === 'like' || r.kind === 'dislike'))) continue;

      const reaction: SharityReaction = {
        id: `react_${clock.totalDays}_${post.id}_${viewer.id}`,
        postId: post.id, citizenId: viewer.id, kind: dec.stance, totalDay: clock.totalDays, dateLabel,
        reason: dec.reason, factors: dec.factors,
      };
      reactList.push(reaction);
      if (viewer.needs?.social) {
        viewer.needs.social.value = Math.min(100, Math.round((viewer.needs.social.value + 4) * 10) / 10);
        viewer.needs.social.lastRestoredDay = clock.totalDays;
      }
      if (dec.stance === 'like') post.likes += 1;
      else post.dislikes += 1;
      post.heat = (post.heat ?? 0) + 1;

      const commentList = (sharity.commentsByPost[post.id] ??= []);
      const usedLines = new Set(commentList.map((c) => c.text));
      if (dec.willShare && !reactList.some((r) => r.citizenId === viewer.id && r.kind === 'share')) {
        const note = simRand() < 0.65 ? renderThreadLine(SHARE_NOTE_LINES, post.handle, post.handle, usedLines) : undefined;
        reactList.push({
          id: `share_${clock.totalDays}_${post.id}_${viewer.id}`, postId: post.id, citizenId: viewer.id,
          kind: 'share', totalDay: clock.totalDays, dateLabel, shareNote: note, reason: `${dec.reason} (shared)`, factors: dec.factors,
        });
        post.reposts += 1;
        post.heat = (post.heat ?? 0) + 3;
      }

      if (dec.willComment && dec.commentType) {
        const text = renderCommentText({ type: dec.commentType, post, sharity, viewer, companies, usedInThread: usedLines });
        const aff = author ? getAffinity(sharity, viewer.id, author.id) : 0;
        const cObj: SharityComment = {
          id: `cmt_${clock.totalDays}_${post.id}_${commentList.length}`,
          postId: post.id, parentId: null, authorId: viewer.id, handle: viewerHandle,
          createdDay: clock.totalDays, dateLabel, type: dec.commentType, text,
          score: (sharity.follows[viewer.id]?.length ?? 2) + (Math.abs(aff) > 35 ? 12 : 4),
          reason: dec.reason, factors: dec.factors,
        };
        commentList.push(cObj);
        post.replies = commentList.length;
        post.heat = (post.heat ?? 0) + 2;
      }

      post.controversy = computeControversy(post.likes, post.dislikes);
      const totalReacts = post.likes + post.dislikes + post.replies + post.reposts;
      if (totalReacts >= 10 && !post.hotLogged) {
        post.hotLogged = true;
        events.push(makeCityEvent(clock, `sharity_hot_${post.id}`, {
          type: 'sharity', citizenId: author?.id, citizenName: author?.name,
          title: 'Sharity Post Went Hot',
          detail: `${post.handle}'s post reached ${totalReacts} reactions ("${post.text.slice(0, 60)}...").`,
        }));
      }
    }
  }
}
