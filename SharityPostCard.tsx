// SharityPostCard.tsx — S3 Sharity post card with clickable likes/dislikes/comments/shares, heat, and thread drawer

import { Flame, HelpCircle, MessageSquare, Repeat2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { SharityAvatar, SharityVerifiedBadge } from './SharityAvatar';
import { TOPIC_LABELS } from './sharityBankExtra';
import { SharityReactionList } from './SharityReactionList';
import type { SharityReactionKind } from './sharityReactionTypes';
import { SharityThreadView } from './SharityThreadView';
import type { SharityPost, SharityProfile, SharityState } from './sharityTypes';
import type { Citizen } from './types';

interface SharityPostCardProps {
  post: SharityPost;
  profile: SharityProfile;
  citizen?: Citizen;
  sharity?: SharityState;
  citizensById?: Map<string, Citizen>;
  highlighted?: boolean;
  onOpenProfile: (id: string) => void;
  onSelectHashtag?: (tag: string) => void;
}

export function SharityPostCard({
  post,
  profile,
  citizen,
  sharity,
  citizensById,
  highlighted,
  onOpenProfile,
  onSelectHashtag,
}: SharityPostCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const [panel, setPanel] = useState<'none' | 'comments' | SharityReactionKind>('none');
  const togglePanel = (next: 'comments' | SharityReactionKind) => setPanel((cur) => (cur === next ? 'none' : next));

  const totalReacts = post.likes + post.dislikes + post.replies + post.reposts;
  const isHot = (post.heat ?? 0) >= 12 || totalReacts >= 10;
  const reactions = sharity?.reactionsByPost?.[post.id] ?? [];
  const comments = sharity?.commentsByPost?.[post.id] ?? [];

  return (
    <article className={`bg-[#111827] border rounded-lg p-4 space-y-2.5 ${highlighted ? 'border-amber-400 ring-1 ring-amber-400/50' : post.isCancelled ? 'border-rose-500/50' : post.isViral ? 'border-amber-500/40' : 'border-slate-800'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenProfile(profile.id)}
          className="flex items-center gap-3 text-left cursor-pointer group min-w-0"
        >
          <SharityAvatar profile={profile} citizen={citizen} size="sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-100 group-hover:text-amber-300 truncate">{profile.name}</span>
              <SharityVerifiedBadge profile={profile} />
              <span className="font-mono text-slate-400">{profile.handle}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {citizen ? `${citizen.tier} · ${citizen.roleLevel}` : 'Official Page'} · {post.dateLabel} · {TOPIC_LABELS[post.topic] ?? post.topic}
            </div>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums shrink-0">
          {post.isCancelled && <span className="text-rose-300 font-semibold">Cancelled</span>}
          {post.isViral && <span className="text-amber-300 font-semibold">Viral</span>}
          {post.isTribute && <span className="text-sky-300">Memorial</span>}
          {isHot && !post.isViral && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Flame className="w-3 h-3" aria-hidden="true" />
              Hot
            </span>
          )}
          {post.argumentState === 'active' && <span className="text-rose-300">Heated ({post.argumentRounds ?? 1})</span>}
          <span className="text-slate-500">Reach {post.reach ?? 0}</span>
        </div>
      </div>

      <p className="text-sm text-slate-100 leading-relaxed">{post.text}</p>

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {post.hashtags.map((tag) => (
            <button key={tag} type="button" onClick={() => onSelectHashtag?.(tag)} className="font-mono text-sky-300 hover:text-amber-300 cursor-pointer">
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
          <button type="button" onClick={() => togglePanel('like')} className={`inline-flex items-center gap-1 cursor-pointer hover:text-emerald-300 ${panel === 'like' ? 'text-emerald-300 font-semibold' : ''}`}>
            <ThumbsUp className="w-3 h-3" aria-hidden="true" />
            <span>{post.likes} likes</span>
          </button>
          <button type="button" onClick={() => togglePanel('dislike')} className={`inline-flex items-center gap-1 cursor-pointer hover:text-rose-300 ${panel === 'dislike' ? 'text-rose-300 font-semibold' : ''}`}>
            <ThumbsDown className="w-3 h-3" aria-hidden="true" />
            <span>{post.dislikes} dislikes</span>
          </button>
          <button type="button" onClick={() => togglePanel('comments')} className={`inline-flex items-center gap-1 cursor-pointer hover:text-sky-300 ${panel === 'comments' ? 'text-sky-300 font-semibold' : ''}`}>
            <MessageSquare className="w-3 h-3" aria-hidden="true" />
            <span>{post.replies} comments</span>
          </button>
          <button type="button" onClick={() => togglePanel('share')} className={`inline-flex items-center gap-1 cursor-pointer hover:text-amber-300 ${panel === 'share' ? 'text-amber-300 font-semibold' : ''}`}>
            <Repeat2 className="w-3 h-3" aria-hidden="true" />
            <span>{post.reposts} shares</span>
          </button>
        </div>

        <button type="button" onClick={() => setShowWhy((v) => !v)} className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-medium cursor-pointer">
          <HelpCircle className="w-3 h-3" aria-hidden="true" />
          <span>{showWhy ? 'Hide why' : 'Why this post?'}</span>
        </button>
      </div>

      {showWhy && (
        <div className="bg-[#090d16] border border-slate-800 rounded-md p-3 text-xs space-y-1.5 text-slate-300">
          <div><span className="text-slate-400">Trigger:</span> {post.why.trigger}</div>
          <div><span className="text-slate-400">Voice:</span> <span className="text-amber-300">{post.voice}</span> — {post.why.voiceReason}</div>
          <div className="font-mono text-[11px] tabular-nums text-slate-400">
            Gate scores: sociability {post.why.gateScores.sociability} · event {post.why.gateScores.eventStrength} · socialNeed {post.why.gateScores.socialNeed} · moodSwing {post.why.gateScores.moodSwing} · weight {post.why.gateScores.postWeight}
          </div>
          <div className="font-mono text-[11px] text-slate-500">Template: {post.why.templateId} · Style: {post.why.styleNote}</div>
        </div>
      )}

      {sharity && citizensById && (panel === 'like' || panel === 'dislike' || panel === 'share') && (
        <SharityReactionList reactions={reactions} activeKind={panel} sharity={sharity} citizensById={citizensById} onOpenProfile={onOpenProfile} />
      )}
      {sharity && citizensById && panel === 'comments' && (
        <SharityThreadView post={post} comments={comments} sharity={sharity} citizensById={citizensById} onOpenProfile={onOpenProfile} />
      )}
    </article>
  );
}
