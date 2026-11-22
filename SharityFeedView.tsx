// SharityFeedView.tsx — Live S2 Sharity feed with Following/Everyone, Latest/Top, topic/author/hashtag filters

import { Eye, MessageSquare, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TOPIC_LABELS } from './sharityBankExtra';
import { countFollowersMap } from './sharityNetwork';
import { SharityPostCard } from './SharityPostCard';
import { computeTrendingHashtags } from './sharityTrending';
import { SharityTrendingPanel } from './SharityTrendingPanel';
import type { SharityTopicId } from './sharityTypes';
import type { CityState, SimSpeed } from './types';

interface SharityFeedViewProps {
  city: CityState;
  speed: SimSpeed;
  onOpenProfile: (id: string) => void;
}

const ALL_TOPICS = Object.keys(TOPIC_LABELS) as SharityTopicId[];

export function SharityFeedView({ city, speed, onOpenProfile }: SharityFeedViewProps) {
  const [scope, setScope] = useState<'everyone' | 'following'>('everyone');
  const [sortBy, setSortBy] = useState<'latest' | 'top'>('latest');
  const [topicFilter, setTopicFilter] = useState<SharityTopicId | 'all'>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const followerCounts = useMemo(() => countFollowersMap(city.sharity.follows), [city.sharity.follows]);
  const defaultViewer = useMemo(() => {
    const alive = city.citizens.filter((c) => c.alive);
    return [...alive].sort((a, b) => (followerCounts[b.id] ?? 0) - (followerCounts[a.id] ?? 0))[0]?.id ?? city.citizens[0]?.id ?? '';
  }, [city.citizens, followerCounts]);
  const [viewerId, setViewerId] = useState<string>(defaultViewer);

  const activeViewerId = city.sharity.profiles[viewerId] ? viewerId : defaultViewer;
  const followedSet = useMemo(() => new Set(city.sharity.follows[activeViewerId] ?? []), [city.sharity.follows, activeViewerId]);
  const citizensById = useMemo(() => new Map(city.citizens.map((c) => [c.id, c])), [city.citizens]);
  const trending = useMemo(() => computeTrendingHashtags(city.sharity.posts, city.totalDays, 10), [city.sharity.posts, city.totalDays]);

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = city.sharity.posts.filter((p) => {
      if (scope === 'following' && !followedSet.has(p.authorId)) return false;
      if (topicFilter !== 'all' && p.topic !== topicFilter) return false;
      if (authorFilter !== 'all' && p.authorId !== authorFilter) return false;
      if (hashtagFilter && !p.hashtags.includes(hashtagFilter)) return false;
      if (q) {
        const prof = city.sharity.profiles[p.authorId];
        const hay = `${p.text} ${prof?.name ?? ''} ${p.handle} ${p.hashtags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'latest') return b.createdDay - a.createdDay;
      const wA = a.score - Math.max(0, city.totalDays - a.createdDay) * 8;
      const wB = b.score - Math.max(0, city.totalDays - b.createdDay) * 8;
      return wB - wA || b.createdDay - a.createdDay;
    });
  }, [city.sharity, city.totalDays, scope, sortBy, topicFilter, authorFilter, hashtagFilter, search, followedSet]);

  return (
    <div className="space-y-4">
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#090d16] border border-slate-800 rounded-md">
              {(['everyone', 'following'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setScope(s)} className={`px-3 py-1 text-xs rounded cursor-pointer ${scope === s ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}>
                  {s === 'everyone' ? 'Everyone' : 'Following'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#090d16] border border-slate-800 rounded-md">
              {(['latest', 'top'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSortBy(s)} className={`px-3 py-1 text-xs rounded cursor-pointer ${sortBy === s ? 'bg-slate-700 text-slate-50 font-medium' : 'text-slate-400 hover:text-slate-100'}`}>
                  {s === 'latest' ? 'Latest' : 'Top'}
                </button>
              ))}
            </div>
            {scope === 'following' && (
              <select aria-label="View following feed as" value={activeViewerId} onChange={(e) => setViewerId(e.target.value)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200">
                {city.citizens.map((c) => <option key={c.id} value={c.id}>As {c.name}</option>)}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <Eye className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
            <span>Observer · {speed === 0 ? 'Paused' : `${speed}x`} · Day {city.sharity.lastTickDay} budget {city.sharity.lastTickBudget}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts, @handles, #tags..." className="w-full bg-[#090d16] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500" />
          </div>
          <select aria-label="Filter by author" value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200">
            <option value="all">All Authors</option>
            {Object.values(city.sharity.profiles).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.handle})</option>)}
          </select>
          {hashtagFilter && (
            <button type="button" onClick={() => setHashtagFilter(null)} className="px-2.5 py-1.5 text-xs font-mono bg-sky-500/20 border border-sky-400/50 text-sky-200 rounded-md cursor-pointer">
              {hashtagFilter} ×
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setTopicFilter('all')} className={`px-2 py-1 text-[11px] rounded border cursor-pointer ${topicFilter === 'all' ? 'bg-amber-500/20 border-amber-500/60 text-amber-200' : 'bg-[#090d16] border-slate-800 text-slate-400 hover:text-slate-200'}`}>
            All Topics
          </button>
          {ALL_TOPICS.map((t) => (
            <button key={t} type="button" onClick={() => setTopicFilter(t)} className={`px-2 py-1 text-[11px] rounded border cursor-pointer ${topicFilter === t ? 'bg-amber-500/20 border-amber-500/60 text-amber-200' : 'bg-[#090d16] border-slate-800 text-slate-400 hover:text-slate-200'}`}>
              {TOPIC_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {visiblePosts.length === 0 ? (
            <div className="bg-[#111827] border border-slate-800 rounded-lg p-10 text-center space-y-2">
              <MessageSquare className="w-6 h-6 text-slate-500 mx-auto" aria-hidden="true" />
              <div className="font-display text-sm font-semibold text-slate-100">No matching posts yet</div>
              <div className="text-xs text-slate-400">Advance simulation days or clear active filters to inspect posts from citizens and companies.</div>
            </div>
          ) : (
            visiblePosts.map((post) => {
              const prof = city.sharity.profiles[post.authorId];
              if (!prof) return null;
              const cit = prof.kind === 'citizen' ? citizensById.get(prof.id) : undefined;
              return <SharityPostCard key={post.id} post={post} profile={prof} citizen={cit} onOpenProfile={onOpenProfile} onSelectHashtag={setHashtagFilter} />;
            })
          )}
        </div>
        <SharityTrendingPanel items={trending} activeHashtag={hashtagFilter} onSelectHashtag={setHashtagFilter} />
      </div>
    </div>
  );
}
