// SharityThreadView.tsx — Recursive unlimited-depth nested comment thread with Top/Newest sort and reaction explanations

import { HelpCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SharityComment } from './sharityReactionTypes';
import type { SharityPost, SharityState } from './sharityTypes';
import type { Citizen } from './types';

interface SharityThreadViewProps {
  post: SharityPost;
  comments: SharityComment[];
  sharity: SharityState;
  citizensById: Map<string, Citizen>;
  onOpenProfile: (id: string) => void;
}

export function SharityThreadView({
  post,
  comments,
  sharity,
  citizensById,
  onOpenProfile,
}: SharityThreadViewProps) {
  const [sort, setSort] = useState<'top' | 'newest'>('top');
  const [openWhyId, setOpenWhyId] = useState<string | null>(null);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, SharityComment[]>();
    for (const c of comments) {
      const key = c.parentId ?? '__root__';
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    for (const [k, arr] of map.entries()) {
      map.set(
        k,
        [...arr].sort((a, b) =>
          sort === 'top'
            ? b.score - a.score || b.createdDay - a.createdDay
            : b.createdDay - a.createdDay
        )
      );
    }
    return map;
  }, [comments, sort]);

  function renderNode(c: SharityComment, depth: number) {
    const prof = sharity.profiles[c.authorId];
    const cit = citizensById.get(c.authorId);
    const replies = childrenByParent.get(c.id) ?? [];
    const showWhy = openWhyId === c.id;
    const typeLabel = c.type.replace('_', ' ');

    return (
      <div
        key={c.id}
        className={depth > 0 ? 'ml-4 pl-3 border-l border-slate-800/80 space-y-2' : 'space-y-2'}
      >
        <div className="py-2 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => onOpenProfile(c.authorId)}
              className="flex flex-wrap items-center gap-1.5 text-left cursor-pointer hover:text-amber-300"
            >
              <span className="font-semibold text-slate-100">{prof?.name ?? c.authorId}</span>
              <span className="font-mono text-[11px] text-slate-400">{c.handle}</span>
              {cit && <span className="font-mono text-[11px] text-amber-300">{cit.tier}</span>}
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className={`text-[11px] ${c.isEscalation ? 'text-rose-300' : 'text-slate-400'}`}>{typeLabel}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-[11px] text-slate-500">{c.dateLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setOpenWhyId(showWhy ? null : c.id)}
              className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" aria-hidden="true" />
              <span>{showWhy ? 'Hide why' : 'Why did they react?'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{c.text}</p>
          {showWhy && (
            <div className="bg-[#0f1623] border border-slate-800/80 rounded p-2 text-[11px] space-y-1 text-slate-300">
              <div>{c.reason}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono tabular-nums text-slate-400">
                {c.factors.map((f) => (
                  <span key={f.label}>
                    {f.label}: {f.value >= 0 ? `+${f.value}` : f.value} ({f.detail})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        {replies.map((r) => renderNode(r, depth + 1))}
      </div>
    );
  }

  const roots = childrenByParent.get('__root__') ?? [];

  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-md p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-200">Thread ({comments.length})</span>
          {post.argumentState === 'active' && (
            <span className="text-[11px] text-rose-300 font-medium">
              Active argument · round {post.argumentRounds ?? 1}
            </span>
          )}
          {post.argumentState === 'ended' && (
            <span className="text-[11px] text-slate-400">
              Argument ended ({post.argumentEndedReason ?? 'resolved'})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-[#111827] border border-slate-800 rounded p-0.5">
          {(['top', 'newest'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSort(mode)}
              className={`px-2 py-0.5 text-[11px] rounded cursor-pointer ${sort === mode ? 'bg-slate-700 text-slate-50 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {mode === 'top' ? 'Top' : 'Newest'}
            </button>
          ))}
        </div>
      </div>
      {roots.length === 0 ? (
        <div className="text-xs text-slate-500 py-1">No comments yet on this post.</div>
      ) : (
        <div className="divide-y divide-slate-800/60">{roots.map((c) => renderNode(c, 0))}</div>
      )}
    </div>
  );
}
