// SharityPostCard.tsx — S2 Sharity post card with topic tag, hashtags, 0-counts, and "Why this post?" breakdown

import { HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { SharityAvatar, SharityVerifiedBadge } from './SharityAvatar';
import { TOPIC_LABELS } from './sharityBankExtra';
import type { SharityPost, SharityProfile } from './sharityTypes';
import type { Citizen } from './types';

interface SharityPostCardProps {
  post: SharityPost;
  profile: SharityProfile;
  citizen?: Citizen;
  onOpenProfile: (id: string) => void;
  onSelectHashtag?: (tag: string) => void;
}

export function SharityPostCard({
  post,
  profile,
  citizen,
  onOpenProfile,
  onSelectHashtag,
}: SharityPostCardProps) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <article className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2.5">
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
              {citizen ? `${citizen.tier} · ${citizen.roleLevel}` : 'Official Page'} · {post.dateLabel}
            </div>
          </div>
        </button>

        <span className="px-2 py-0.5 text-[11px] font-medium bg-[#0c1220] border border-slate-700/80 text-slate-300 rounded shrink-0">
          {TOPIC_LABELS[post.topic] ?? post.topic}
        </span>
      </div>

      <p className="text-sm text-slate-100 leading-relaxed">{post.text}</p>

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {post.hashtags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onSelectHashtag?.(tag)}
              className="font-mono text-sky-300 hover:text-amber-300 cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/70 text-[11px] text-slate-400">
        <div className="flex items-center gap-4 font-mono tabular-nums">
          <span>{post.likes} likes</span>
          <span>{post.dislikes} dislikes</span>
          <span>{post.replies} replies</span>
          <span>{post.reposts} reposts</span>
        </div>

        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-medium cursor-pointer"
        >
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
          <div className="font-mono text-[11px] text-slate-500">
            Template: {post.why.templateId} · Style: {post.why.styleNote}
          </div>
        </div>
      )}
    </article>
  );
}
