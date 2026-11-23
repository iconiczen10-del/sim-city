// sharityThreadEngine.ts — Nested poster replies, multi-day argument escalation/de-escalation, and friend join-ins

import type { SimClock } from './eventFactory';
import { makeCityEvent } from './eventFactory';
import { formatSimDate } from './formatters';
import { simPick, simRand } from './rng';
import { getAffinity } from './sharityAffinity';
import type { SharityComment, SharityCommentType, SharityReactionFactor } from './sharityReactionTypes';
import { DEESCALATE_LINES, ESCALATE_LINES, FRIEND_INTERVENE_LINES, POSTER_DEFEND_LINES, POSTER_SNAP_LINES, POSTER_THANK_LINES, renderThreadLine } from './sharityThreadBank';
import type { SharityPost, SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

const ADVERSARIAL = new Set<SharityCommentType>(['disagreement', 'shade', 'callout', 'envy']);
const WARM_CMTS = new Set<SharityCommentType>(['support', 'congratulation', 'sympathy', 'offer_help']);

function pushReply(params: {
  sharity: SharityState; post: SharityPost; parentId: string; author: Citizen;
  type: SharityCommentType; text: string; clock: SimClock; dateLabel: string;
  isEscalation: boolean; reason: string; factors: SharityReactionFactor[];
}): SharityComment {
  const { sharity, post, parentId, author, type, text, clock, dateLabel, isEscalation, reason, factors } = params;
  const list = (sharity.commentsByPost![post.id] ??= []);
  const handle = sharity.profiles[author.id]?.handle ?? author.name;
  const cmt: SharityComment = {
    id: `cmt_${clock.totalDays}_${post.id}_${list.length}`,
    postId: post.id, parentId, authorId: author.id, handle, createdDay: clock.totalDays, dateLabel,
    type, text, score: (sharity.follows[author.id]?.length ?? 2) + (isEscalation ? 10 : 4),
    isEscalation, reason, factors,
  };
  list.push(cmt);
  post.replies = list.length;
  post.heat = (post.heat ?? 0) + (isEscalation ? 3 : 2);
  return cmt;
}

export function stepSharityThreads(params: {
  sharity: SharityState; citizens: Citizen[]; clock: SimClock; events: CityEvent[];
}): void {
  const { sharity, citizens, clock, events } = params;
  const dateLabel = formatSimDate(clock.day, clock.month, clock.year);
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const alive = citizens.filter((c) => c.alive);
  sharity.commentsByPost = sharity.commentsByPost ?? {};

  for (const post of sharity.posts) {
    if (clock.totalDays - post.createdDay > 7) continue;
    const comments = sharity.commentsByPost[post.id] ?? [];
    if (comments.length === 0) continue;
    const used = new Set(comments.map((c) => c.text));
    const poster = byId.get(post.authorId);

    // 1. Original poster replies to top-level comments
    if (poster && poster.alive) {
      const repliedSet = new Set(post.posterRepliedIds ?? []);
      const unreplied = comments.filter((c) => c.parentId === null && c.authorId !== poster.id && !repliedSet.has(c.id));
      for (const cmt of unreplied.slice(0, 2)) {
        repliedSet.add(cmt.id);
        const commenter = byId.get(cmt.authorId);
        if (!commenter) continue;
        const aff = getAffinity(sharity, poster.id, commenter.id);
        if (WARM_CMTS.has(cmt.type) && simRand() < 0.45 + poster.traits.kindness / 250) {
          const text = renderThreadLine(POSTER_THANK_LINES, cmt.handle, undefined, used);
          pushReply({
            sharity, post, parentId: cmt.id, author: poster, type: 'support', text, clock, dateLabel,
            isEscalation: false, reason: `Poster thanked ${commenter.name} (affinity ${aff})`,
            factors: [{ label: 'Poster Kindness', value: Math.round(poster.traits.kindness / 3), detail: `Kindness ${poster.traits.kindness}` }],
          });
        } else if (ADVERSARIAL.has(cmt.type) && (simRand() < 0.55 || poster.traits.discipline < 55)) {
          const snap = poster.traits.discipline < 52 || poster.mood < 45 || aff < -20;
          const text = renderThreadLine(snap ? POSTER_SNAP_LINES : POSTER_DEFEND_LINES, cmt.handle, undefined, used);
          const reply = pushReply({
            sharity, post, parentId: cmt.id, author: poster, type: snap ? 'callout' : 'defense', text, clock, dateLabel,
            isEscalation: snap, reason: snap ? `Poster snapped back (discipline ${poster.traits.discipline})` : 'Poster defended position',
            factors: [{ label: 'Discipline', value: snap ? -15 : 10, detail: `Discipline ${poster.traits.discipline}, mood ${Math.round(poster.mood)}` }],
          });
          if (snap && (!post.argumentState || post.argumentState === 'none')) {
            post.argumentState = 'active';
            post.argumentRounds = 1;
            post.argumentLastDay = clock.totalDays;
            post.argumentLastCommentId = reply.id;
            post.argumentLastSpeakerId = poster.id;
            post.argumentTargetId = commenter.id;
            events.push(makeCityEvent(clock, `sharity_arg_start_${post.id}`, {
              type: 'argument', citizenId: poster.id, citizenName: poster.name,
              title: 'Sharity Argument Started',
              detail: `${poster.sharityHandle} and ${commenter.sharityHandle} started arguing in a Sharity thread.`,
            }));
          }
        }
      }
      post.posterRepliedIds = Array.from(repliedSet);
    }

    // 2. Multi-day active argument escalation / de-escalation & friend join-ins
    if (post.argumentState === 'active' && clock.totalDays > (post.argumentLastDay ?? 0)) {
      const responder = post.argumentTargetId ? byId.get(post.argumentTargetId) : undefined;
      const prevSpeaker = post.argumentLastSpeakerId ? byId.get(post.argumentLastSpeakerId) : undefined;
      const rounds = post.argumentRounds ?? 1;

      if (!responder || !responder.alive || !prevSpeaker || !prevSpeaker.alive || rounds >= 5 || simRand() < 0.22) {
        post.argumentState = 'ended';
        post.argumentEndedReason = !responder?.alive || !prevSpeaker?.alive ? 'Participant passed away' : rounds >= 5 ? 'Both sides went quiet' : 'One side walked away';
        events.push(makeCityEvent(clock, `sharity_arg_end_${post.id}`, {
          type: 'argument', citizenId: responder?.id ?? prevSpeaker?.id, citizenName: responder?.name ?? prevSpeaker?.name,
          title: 'Sharity Argument Ended',
          detail: `Argument between ${prevSpeaker?.sharityHandle ?? post.handle} and ${responder?.sharityHandle ?? 'participant'} ended (${post.argumentEndedReason}).`,
        }));
        continue;
      }

      const calmsDown = responder.traits.discipline >= 66 || (responder.traits.kindness >= 68 && responder.stress < 60);
      const targetHandle = sharity.profiles[prevSpeaker.id]?.handle ?? prevSpeaker.name;
      const text = renderThreadLine(calmsDown ? DEESCALATE_LINES : ESCALATE_LINES, targetHandle, undefined, used);
      const reply = pushReply({
        sharity, post, parentId: post.argumentLastCommentId ?? null!, author: responder,
        type: calmsDown ? 'defense' : 'callout', text, clock, dateLabel, isEscalation: !calmsDown,
        reason: calmsDown ? `De-escalated (discipline ${responder.traits.discipline}, kindness ${responder.traits.kindness})` : `Escalated (low discipline ${responder.traits.discipline})`,
        factors: [{ label: 'Self-Control', value: calmsDown ? 18 : -18, detail: `Discipline ${responder.traits.discipline}, stress ${Math.round(responder.stress)}` }],
      });
      post.argumentLastDay = clock.totalDays;
      if (calmsDown) {
        post.argumentState = 'ended';
        post.argumentEndedReason = `${responder.name} de-escalated`;
        events.push(makeCityEvent(clock, `sharity_arg_end_${post.id}`, {
          type: 'argument', citizenId: responder.id, citizenName: responder.name,
          title: 'Sharity Argument Ended',
          detail: `${responder.sharityHandle} cooled down the argument with ${targetHandle}.`,
        }));
      } else {
        post.argumentRounds = rounds + 1;
        post.argumentLastCommentId = reply.id;
        post.argumentLastSpeakerId = responder.id;
        post.argumentTargetId = prevSpeaker.id;

        const friend = alive.find((f) => f.id !== responder.id && f.id !== prevSpeaker.id && getAffinity(sharity, f.id, prevSpeaker.id) >= 48 && simRand() < 0.35);
        if (friend) {
          const fText = renderThreadLine(FRIEND_INTERVENE_LINES, sharity.profiles[responder.id]?.handle ?? responder.name, targetHandle, used);
          pushReply({
            sharity, post, parentId: reply.id, author: friend, type: 'defense', text: fText, clock, dateLabel,
            isEscalation: true, reason: `Defended close ally ${prevSpeaker.name}`,
            factors: [{ label: 'Ally Affinity', value: 22, detail: `Affinity +${getAffinity(sharity, friend.id, prevSpeaker.id)} with ${prevSpeaker.name}` }],
          });
        }
      }
    }
  }
}
