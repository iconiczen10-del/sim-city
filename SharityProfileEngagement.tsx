// SharityProfileEngagement.tsx — Engagement metrics received and most liked / most disliked post summary on profile

import type { SharityPost } from './sharityTypes';

interface SharityProfileEngagementProps {
  posts: SharityPost[];
}

export function SharityProfileEngagement({ posts }: SharityProfileEngagementProps) {
  const likes = posts.reduce((s, p) => s + p.likes, 0);
  const dislikes = posts.reduce((s, p) => s + p.dislikes, 0);
  const comments = posts.reduce((s, p) => s + p.replies, 0);
  const shares = posts.reduce((s, p) => s + p.reposts, 0);
  const mostLiked = [...posts].filter((p) => p.likes > 0).sort((a, b) => b.likes - a.likes)[0];
  const mostDisliked = [...posts].filter((p) => p.dislikes > 0).sort((a, b) => b.dislikes - a.dislikes)[0];

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-slate-100">Engagement Received</h3>
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs tabular-nums">
          <span className="text-emerald-300">{likes} likes</span>
          <span className="text-rose-300">{dislikes} dislikes</span>
          <span className="text-sky-300">{comments} comments</span>
          <span className="text-amber-300">{shares} shares</span>
        </div>
      </div>

      {(mostLiked || mostDisliked) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3 space-y-1">
            <div className="text-[11px] font-medium text-emerald-300">Most Liked Post</div>
            {mostLiked ? (
              <>
                <p className="text-slate-200 line-clamp-2">{mostLiked.text}</p>
                <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {mostLiked.likes} likes · {mostLiked.replies} comments · {mostLiked.dateLabel}
                </div>
              </>
            ) : (
              <div className="text-slate-500">No likes received yet.</div>
            )}
          </div>

          <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3 space-y-1">
            <div className="text-[11px] font-medium text-rose-300">Most Disliked Post</div>
            {mostDisliked ? (
              <>
                <p className="text-slate-200 line-clamp-2">{mostDisliked.text}</p>
                <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {mostDisliked.dislikes} dislikes · {mostDisliked.replies} comments · {mostDisliked.dateLabel}
                </div>
              </>
            ) : (
              <div className="text-slate-500">No dislikes received yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
