// SharityFeedView.tsx — Live Sharity feed with pinned viral posts, highlighted causal post support, and trending sidebar

import { MessageSquare } from 'lucide-react';
import { useMemo, useState } from 'react';
import { countFollowersMap } from './sharityNetwork';
import { SharityFeedFilters } from './SharityFeedFilters';
import { SharityPostCard } from './SharityPostCard';
import type { SharityHeatFilter } from './sharityReactionTypes';
import { computeTrendingHashtags } from './sharityTrending';
import { SharityTrendingPanel } from './SharityTrendingPanel';
import type { SharityTopicId } from './sharityTypes';
import type { CityState, SimSpeed } from './types';

interface SharityFeedViewProps {
  city: CityState;
  speed: SimSpeed;
  highlightedPostId?: string | null;
  onClearHighlightPost?: () => void;
  onOpenProfile: (id: string) => void;
}

export function SharityFeedView({ city, speed, highlightedPostId, onClearHighlightPost, onOpenProfile }: SharityFeedViewProps) {
  const [scope, setScope] = useState<'everyone' | 'following'>('everyone');
  const [sortBy, setSortBy] = useState<'latest' | 'top'>('latest');
  const [heatFilter, setHeatFilter] = useState<SharityHeatFilter>('all');
  const [topicFilter, setTopicFilter] = useState<SharityTopicId | 'all'>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState(25);

  const followerCounts = useMemo(() => countFollowersMap(city.sharity.follows), [city.sharity.follows]);
  const defaultViewer = useMemo(
    () => [...city.citizens.filter((c) => c.alive)].sort((a, b) => (followerCounts[b.id] ?? 0) - (followerCounts[a.id] ?? 0))[0]?.id ?? city.citizens[0]?.id ?? '',
    [city.citizens, followerCounts]
  );
  const [viewerId, setViewerId] = useState<string>(defaultViewer);
  const activeViewerId = city.sharity.profiles[viewerId] ? viewerId : defaultViewer;
  const followedSet = useMemo(() => new Set(city.sharity.follows[activeViewerId] ?? []), [city.sharity.follows, activeViewerId]);
  const citizensById = useMemo(() => new Map(city.citizens.map((c) => [c.id, c])), [city.citizens]);
  const trending = useMemo(() => computeTrendingHashtags(city.sharity.posts, city.totalDays, 10), [city.sharity.posts, city.totalDays]);

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = city.sharity.posts.filter((p) => {
      if (scope === 'following' && !followedSet.has(p.authorId)) return false;
      const totalReacts = p.likes + p.dislikes + p.replies + p.reposts;
      if (heatFilter === 'hot' && (p.heat ?? 0) < 12 && totalReacts < 10) return false;
      if (heatFilter === 'heated' && !p.argumentState) return false;
      if (topicFilter !== 'all' && p.topic !== topicFilter) return false;
      if (authorFilter !== 'all' && p.authorId !== authorFilter) return false;
      if (hashtagFilter && !p.hashtags.includes(hashtagFilter)) return false;
      if (q && !`${p.text} ${city.sharity.profiles[p.authorId]?.name ?? ''} ${p.handle} ${p.hashtags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (highlightedPostId) {
        if (a.id === highlightedPostId) return -1;
        if (b.id === highlightedPostId) return 1;
      }
      const aPinned = a.isViral && city.totalDays - (a.viralDay ?? a.createdDay) <= 3 ? 1 : 0;
      const bPinned = b.isViral && city.totalDays - (b.viralDay ?? b.createdDay) <= 3 ? 1 : 0;
      if (scope === 'everyone' && aPinned !== bPinned) return bPinned - aPinned;
      if (sortBy === 'latest') return b.createdDay - a.createdDay;
      const engA = a.likes * 2 + a.dislikes * 1.5 + a.replies * 3 + a.reposts * 4 + (a.heat ?? 0) * 2 + a.score - Math.max(0, city.totalDays - a.createdDay) * 8;
      const engB = b.likes * 2 + b.dislikes * 1.5 + b.replies * 3 + b.reposts * 4 + (b.heat ?? 0) * 2 + b.score - Math.max(0, city.totalDays - a.createdDay) * 8;
      return engB - engA || b.createdDay - a.createdDay;
    });
  }, [city.sharity, city.totalDays, scope, sortBy, heatFilter, topicFilter, authorFilter, hashtagFilter, search, followedSet, highlightedPostId]);

  return (
    <div className="space-y-4">
      <SharityFeedFilters
        city={city} speed={speed} scope={scope} sortBy={sortBy} heatFilter={heatFilter} topicFilter={topicFilter}
        authorFilter={authorFilter} hashtagFilter={hashtagFilter} search={search} activeViewerId={activeViewerId}
        onScope={setScope} onSort={setSortBy} onHeat={setHeatFilter} onTopic={setTopicFilter} onAuthor={setAuthorFilter}
        onHashtag={setHashtagFilter} onSearch={setSearch} onViewer={setViewerId}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {highlightedPostId && (
            <div className="bg-amber-500/10 border border-amber-400/50 rounded-md px-3.5 py-2 flex items-center justify-between text-xs text-amber-200">
              <span>Showing causal Sharity post linked from Citizen inspector.</span>
              {onClearHighlightPost && <button type="button" onClick={onClearHighlightPost} className="text-amber-300 hover:underline cursor-pointer">Clear focus</button>}
            </div>
          )}
          {visiblePosts.length === 0 ? (
            <div className="bg-[#111827] border border-slate-800 rounded-lg p-10 text-center space-y-2">
              <MessageSquare className="w-6 h-6 text-slate-500 mx-auto" aria-hidden="true" />
              <div className="font-display text-sm font-semibold text-slate-100">No matching posts yet</div>
              <div className="text-xs text-slate-400">Advance simulation days or clear active filters to inspect posts and reactions.</div>
            </div>
          ) : (
            <>
              {visiblePosts.slice(0, displayLimit).map((post) => {
                const prof = city.sharity.profiles[post.authorId];
                if (!prof) return null;
                return <SharityPostCard key={post.id} post={post} profile={prof} citizen={prof.kind === 'citizen' ? citizensById.get(prof.id) : undefined} sharity={city.sharity} citizensById={citizensById} highlighted={post.id === highlightedPostId} onOpenProfile={onOpenProfile} onSelectHashtag={setHashtagFilter} />;
              })}
              {visiblePosts.length > displayLimit && (
                <button
                  type="button"
                  onClick={() => setDisplayLimit((n) => n + 25)}
                  className="w-full py-2.5 rounded-lg border border-slate-800 bg-[#111827] hover:border-amber-500/50 text-xs font-medium text-amber-300 cursor-pointer"
                >
                  Show more posts ({visiblePosts.length - displayLimit} remaining)
                </button>
              )}
            </>
          )}
        </div>
        <SharityTrendingPanel items={trending} activeHashtag={hashtagFilter} onSelectHashtag={setHashtagFilter} />
      </div>
    </div>
  );
}
