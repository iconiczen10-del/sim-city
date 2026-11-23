// sharityScoring.ts — Computes 8-factor viewer reaction decisions (ignore, like, dislike, comment type, share)

import { TIER_ORDER } from './constants';
import { getMartFloorManager } from './martManager';
import { simPick, simRand } from './rng';
import { getAffinity } from './sharityAffinity';
import type { SharityCommentType, SharityReactionFactor } from './sharityReactionTypes';
import type { SharityPost, SharityState } from './sharityTypes';
import type { Citizen } from './types';

export interface ReactionDecision {
  stance: 'ignore' | 'like' | 'dislike';
  willComment: boolean;
  commentType?: SharityCommentType;
  willShare: boolean;
  reason: string;
  factors: SharityReactionFactor[];
}

const HARDSHIP_TOPICS = new Set(['loss_hardship', 'health_survival']);
const FLEX_TRIGGERS = new Set(['tier_up', 'savings_flex', 'luxury_std', 'big_purchase', 'comfy_living', 'goal_celebrate']);
const POSITIVE_TOPICS = new Set(['celebrations', 'status_flex', 'ambition']);

export function evaluateViewerReaction(params: {
  viewer: Citizen;
  author?: Citizen;
  post: SharityPost;
  sharity: SharityState;
  citizens: Citizen[];
  totalDays: number;
}): ReactionDecision {
  const { viewer, author, post, sharity, citizens, totalDays } = params;
  const factors: SharityReactionFactor[] = [];
  const aff = author ? getAffinity(sharity, viewer.id, author.id) : 10;
  const affScore = author ? Math.round(aff * 0.45) : 5;
  factors.push({ label: 'Affinity', value: affScore, detail: author ? `Affinity ${aff >= 0 ? `+${aff}` : aff} with ${author.name}` : 'Official city page' });

  const sameComp = Boolean(author && viewer.employerId && viewer.employerId === author.employerId);
  const viewerHandle = sharity.profiles[viewer.id]?.handle ?? '';
  const mentionsViewer = post.mentions.includes(viewerHandle);
  const closeToMentioned = post.mentions.some((mh) => {
    const pid = Object.values(sharity.profiles).find((p) => p.handle === mh)?.id;
    return pid ? getAffinity(sharity, viewer.id, pid) >= 35 : false;
  });
  const aboutViewerComp = Boolean(viewer.employerId && (post.authorId === viewer.employerId || post.text.includes(viewer.employerId)));
  const relevanceScore = (sameComp ? 14 : 0) + (mentionsViewer ? 24 : 0) + (closeToMentioned ? 16 : 0) + (post.urgencyWeight >= 70 ? 16 : 4);
  factors.push({
    label: 'Relevance',
    value: relevanceScore,
    detail: mentionsViewer ? 'Mentioned in post' : closeToMentioned ? 'Friend mentioned in post' : sameComp ? 'Coworker context' : post.urgencyWeight >= 70 ? 'Major city event' : 'General city topic',
  });

  const t = viewer.traits;
  const traitVal = Math.round((t.kindness - 50) * 0.35 + (aboutViewerComp ? (t.loyalty - 50) * 0.4 : 0) + (FLEX_TRIGGERS.has(post.triggerKey) ? (50 - t.greed) * 0.25 : 0));
  factors.push({ label: 'Traits', value: traitVal, detail: `Kindness ${t.kindness}, sociability ${t.sociability}, loyalty ${t.loyalty}` });

  const hungryOrBroke = viewer.hunger < 45 || viewer.savings < 60;
  const hygPenalty = author && (author.needs?.hygiene?.value ?? 100) < 30 ? -12 : 0;
  const emShift = Math.round(((viewer.emotions?.gratitude?.value ?? 0) - (viewer.emotions?.anger?.value ?? 0)) * 0.15);
  let stateVal = Math.round((viewer.mood - 50) * 0.3 - (viewer.stress - 50) * 0.15) + hygPenalty + emShift;
  if (hungryOrBroke && FLEX_TRIGGERS.has(post.triggerKey)) stateVal -= 26;
  factors.push({ label: 'Viewer State', value: stateVal, detail: `${hygPenalty < 0 ? 'Low hygiene notice · ' : ''}Mood ${Math.round(viewer.mood)}, stress ${Math.round(viewer.stress)}, savings ∆${Math.round(viewer.savings)}` });

  const vIdx = TIER_ORDER.indexOf(viewer.tier);
  const aIdx = author ? TIER_ORDER.indexOf(author.tier) : 1;
  const tierGap = vIdx - aIdx;
  let tierVal = 0;
  if (tierGap >= 2 && FLEX_TRIGGERS.has(post.triggerKey)) tierVal = -tierGap * 9;
  else if (tierGap <= -2 && HARDSHIP_TOPICS.has(post.topic)) tierVal = t.kindness >= 60 ? 14 : -4;
  factors.push({ label: 'Tier & Envy', value: tierVal, detail: author ? `Viewer ${viewer.tier} vs poster ${author.tier}` : `Viewer ${viewer.tier}` });

  const hasNegMemory = viewer.memories.some((m) => totalDays - m.totalDay <= 14 && m.initialWeight <= -15);
  const authorCancelled = Boolean(author && (author.cancelledUntilDay ?? 0) >= totalDays);
  const memVal = (aff <= -35 ? -20 : hasNegMemory ? -6 : 0) + (authorCancelled ? -22 : 0);
  factors.push({
    label: 'Memory',
    value: memVal,
    detail: authorCancelled
      ? 'Active cancel backlash stigma'
      : aff <= -35 ? 'Rival relationship colors reaction' : hasNegMemory ? 'Recent stressful memory active' : 'No grievance active',
  });

  let agreeVal = 0;
  const isExec = viewer.roleLevel === 'CEO' || viewer.roleLevel === 'Executive';
  const isMartLead = getMartFloorManager(citizens)?.id === viewer.id;
  if (post.triggerKey === 'take_low_pay' || post.triggerKey === 'take_ceo_gap') agreeVal = isExec ? -22 : 18;
  else if (post.triggerKey === 'take_prices' || post.triggerKey === 'price_shock') agreeVal = isMartLead ? -24 : viewer.savings < 1500 ? 18 : 8;
  else if (post.triggerKey === 'take_rent' || post.triggerKey === 'rent_arrears') agreeVal = viewer.rentArrears > 0 || viewer.homeType === 'shared_room' ? 18 : 2;
  else if (aboutViewerComp && post.sentiment === 'negative' && t.loyalty >= 60) agreeVal = -16;
  factors.push({ label: 'Agreement', value: agreeVal, detail: agreeVal >= 12 ? 'Situation aligns with post' : agreeVal <= -12 ? 'Position clashes with post' : 'Neutral stance' });

  const visVal = Math.round(((post.heat ?? 0) * 0.35) + (sharity.profiles[post.authorId]?.verified ? 8 : 0) + (post.isViral ? 10 : 0));
  factors.push({ label: 'Visibility & Heat', value: visVal, detail: `Heat ${post.heat ?? 0}${post.isViral ? ', viral post' : sharity.profiles[post.authorId]?.verified ? ', verified poster' : ''}` });

  const netTone = affScore + traitVal + stateVal + tierVal + memVal + agreeVal;
  const engageChance = Math.min(0.88, Math.max(0.14, 0.22 + t.sociability / 220 + (relevanceScore + visVal) / 140 + (Math.abs(netTone) > 22 ? 0.18 : 0)));
  if (simRand() > engageChance) {
    return { stance: 'ignore', willComment: false, willShare: false, reason: 'Scrolled past without engaging', factors };
  }

  const likeProb = Math.min(0.92, Math.max(0.08, 0.5 + netTone / 90));
  const stance: 'like' | 'dislike' = simRand() < likeProb ? 'like' : 'dislike';
  const willComment = simRand() < Math.min(0.55, 0.14 + t.sociability / 280 + (mentionsViewer ? 0.3 : 0) + (Math.abs(netTone) > 25 ? 0.12 : 0));
  const willShare = simRand() < Math.min(0.32, 0.04 + (post.urgencyWeight >= 72 ? 0.14 : 0) + (visVal / 160));
  const commentType = willComment ? pickCommentType({ viewer, aff, post, stance, agreeVal, tierVal, aboutViewerComp, hungryOrBroke }) : undefined;

  const topF = [...factors].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
  const reason = `${stance === 'like' ? 'Liked' : 'Disliked'}${commentType ? ` + ${commentType.replace('_', ' ')}` : ''}: ${topF.detail}`;
  return { stance, willComment, commentType, willShare, reason, factors };
}

function pickCommentType(p: {
  viewer: Citizen; aff: number; post: SharityPost; stance: 'like' | 'dislike';
  agreeVal: number; tierVal: number; aboutViewerComp: boolean; hungryOrBroke: boolean;
}): SharityCommentType {
  const { viewer, aff, post, stance, agreeVal, tierVal, aboutViewerComp, hungryOrBroke } = p;
  const isRival = aff <= -25;
  const isCloseFriend = aff >= 45;
  if (stance === 'dislike') {
    if (isCloseFriend) return simPick(['question', 'disagreement']);
    if (aboutViewerComp && viewer.traits.loyalty >= 58) return 'defense';
    if (tierVal <= -14 || (hungryOrBroke && FLEX_TRIGGERS.has(post.triggerKey))) return 'envy';
    if (isRival) return simPick(['shade', 'callout', 'disagreement']);
    if (agreeVal <= -12) return 'disagreement';
    return simPick(['disagreement', 'callout', 'question', 'shade']);
  }
  if (isRival) return simPick(['question', 'agreement', 'joke']);
  if (post.topic === 'celebrations' || post.triggerKey === 'promoted' || post.triggerKey === 'tier_up') return 'congratulation';
  if (HARDSHIP_TOPICS.has(post.topic) || post.triggerKey === 'laid_off' || post.triggerKey === 'broke') {
    return viewer.traits.kindness >= 65 && viewer.savings > 400 ? 'offer_help' : 'sympathy';
  }
  if (post.topic === 'opinions' || agreeVal >= 12) return 'agreement';
  if (post.voice === 'funny' || (viewer.traits.sociability >= 68 && !POSITIVE_TOPICS.has(post.topic))) return simPick(['joke', 'support']);
  return simPick(['support', 'question', 'agreement']);
}
