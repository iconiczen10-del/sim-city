// SharityNetworkEngagement.tsx — Engagement leaderboard, controversial posts, active commenters, and heated arguments

import { useMemo } from 'react';
import type { CityState } from './types';

interface SharityNetworkEngagementProps {
  city: CityState;
  onOpenProfile: (id: string) => void;
}

export function SharityNetworkEngagement({ city, onOpenProfile }: SharityNetworkEngagementProps) {
  const { profiles, posts, commentsByPost = {} } = city.sharity;

  const engagementLeaders = useMemo(() => {
    const scores = new Map<string, { score: number; likes: number; replies: number; shares: number }>();
    for (const p of posts) {
      const cur = scores.get(p.authorId) ?? { score: 0, likes: 0, replies: 0, shares: 0 };
      cur.likes += p.likes;
      cur.replies += p.replies;
      cur.shares += p.reposts;
      cur.score += p.likes + p.dislikes + p.replies * 2 + p.reposts * 3;
      scores.set(p.authorId, cur);
    }
    return [...scores.entries()]
      .map(([id, s]) => ({ prof: profiles[id], ...s }))
      .filter((r) => Boolean(r.prof) && r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [posts, profiles]);

  const controversialPosts = useMemo(
    () => [...posts].filter((p) => (p.controversy ?? 0) > 0).sort((a, b) => (b.controversy ?? 0) - (a.controversy ?? 0)).slice(0, 5),
    [posts]
  );

  const activeCommenters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const arr of Object.values(commentsByPost)) {
      for (const c of arr) counts.set(c.authorId, (counts.get(c.authorId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ prof: profiles[id], count }))
      .filter((r) => Boolean(r.prof))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [commentsByPost, profiles]);

  const heatedThreads = useMemo(
    () => posts.filter((p) => p.argumentState === 'active' || p.argumentState === 'ended').slice(0, 6),
    [posts]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
        <h3 className="font-display text-sm font-semibold text-slate-100">Engagement Leaderboard</h3>
        {engagementLeaders.length === 0 ? (
          <div className="text-xs text-slate-500">No post engagement recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {engagementLeaders.map(({ prof, likes, replies, shares }) => (
              <button key={prof.id} type="button" onClick={() => onOpenProfile(prof.id)} className="w-full py-2 flex items-center justify-between gap-2 text-xs text-left hover:text-amber-300 cursor-pointer">
                <span className="truncate font-medium text-slate-100">{prof.name} <span className="font-mono text-slate-400">{prof.handle}</span></span>
                <span className="font-mono tabular-nums text-amber-300 shrink-0">{likes}L · {replies}C · {shares}S</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
        <h3 className="font-display text-sm font-semibold text-slate-100">Most Active Commenters</h3>
        {activeCommenters.length === 0 ? (
          <div className="text-xs text-slate-500">No comments written yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {activeCommenters.map(({ prof, count }) => (
              <button key={prof.id} type="button" onClick={() => onOpenProfile(prof.id)} className="w-full py-2 flex items-center justify-between gap-2 text-xs text-left hover:text-amber-300 cursor-pointer">
                <span className="truncate font-medium text-slate-100">{prof.name} <span className="font-mono text-slate-400">{prof.handle}</span></span>
                <span className="font-mono tabular-nums text-sky-300 shrink-0">{count} comments</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
        <h3 className="font-display text-sm font-semibold text-slate-100">Most Controversial Posts</h3>
        {controversialPosts.length === 0 ? (
          <div className="text-xs text-slate-500">No split-reaction posts yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {controversialPosts.map((p) => (
              <button key={p.id} type="button" onClick={() => onOpenProfile(p.authorId)} className="w-full py-2 text-left space-y-1 cursor-pointer hover:bg-slate-800/40 rounded px-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300">{p.handle}</span>
                  <span className="font-mono tabular-nums text-[11px] text-amber-300">{p.likes}👍 / {p.dislikes}👎 · {p.replies} comments</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{p.text}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
        <h3 className="font-display text-sm font-semibold text-slate-100">Heated Argument Threads</h3>
        {heatedThreads.length === 0 ? (
          <div className="text-xs text-slate-500">No active or recent Sharity arguments.</div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {heatedThreads.map((p) => (
              <button key={p.id} type="button" onClick={() => onOpenProfile(p.authorId)} className="w-full py-2 text-left space-y-1 cursor-pointer hover:bg-slate-800/40 rounded px-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-200">{p.handle}</span>
                  <span className={`text-[11px] font-mono ${p.argumentState === 'active' ? 'text-rose-300' : 'text-slate-400'}`}>
                    {p.argumentState === 'active' ? `Active · R${p.argumentRounds ?? 1}` : `Ended (${p.argumentEndedReason ?? 'resolved'})`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{p.text}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
