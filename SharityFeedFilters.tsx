// SharityFeedFilters.tsx — Filter toolbar (scope, sort, heat, author, search, topics) for Sharity Feed

import { Eye, Search } from 'lucide-react';
import { TOPIC_LABELS } from './sharityBankExtra';
import type { SharityHeatFilter } from './sharityReactionTypes';
import type { SharityTopicId } from './sharityTypes';
import type { CityState, SimSpeed } from './types';

interface SharityFeedFiltersProps {
  city: CityState;
  speed: SimSpeed;
  scope: 'everyone' | 'following';
  sortBy: 'latest' | 'top';
  heatFilter: SharityHeatFilter;
  topicFilter: SharityTopicId | 'all';
  authorFilter: string;
  hashtagFilter: string | null;
  search: string;
  activeViewerId: string;
  onScope: (v: 'everyone' | 'following') => void;
  onSort: (v: 'latest' | 'top') => void;
  onHeat: (v: SharityHeatFilter) => void;
  onTopic: (v: SharityTopicId | 'all') => void;
  onAuthor: (v: string) => void;
  onHashtag: (v: string | null) => void;
  onSearch: (v: string) => void;
  onViewer: (v: string) => void;
}

const ALL_TOPICS = Object.keys(TOPIC_LABELS) as SharityTopicId[];

export function SharityFeedFilters(p: SharityFeedFiltersProps) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-lg p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#090d16] border border-slate-800 rounded-md">
            {(['everyone', 'following'] as const).map((s) => (
              <button key={s} type="button" onClick={() => p.onScope(s)} className={`px-3 py-1 text-xs rounded cursor-pointer ${p.scope === s ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}>
                {s === 'everyone' ? 'Everyone' : 'Following'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#090d16] border border-slate-800 rounded-md">
            {(['latest', 'top'] as const).map((s) => (
              <button key={s} type="button" onClick={() => p.onSort(s)} className={`px-3 py-1 text-xs rounded cursor-pointer ${p.sortBy === s ? 'bg-slate-700 text-slate-50 font-medium' : 'text-slate-400 hover:text-slate-100'}`}>
                {s === 'latest' ? 'Latest' : 'Top'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#090d16] border border-slate-800 rounded-md">
            {([['all', 'All'], ['hot', 'Hot'], ['heated', 'Heated']] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => p.onHeat(k)} className={`px-2.5 py-1 text-xs rounded cursor-pointer ${p.heatFilter === k ? 'bg-rose-500/25 text-rose-200 font-medium' : 'text-slate-400 hover:text-slate-100'}`}>
                {lbl}
              </button>
            ))}
          </div>
          {p.scope === 'following' && (
            <select aria-label="View following feed as" value={p.activeViewerId} onChange={(e) => p.onViewer(e.target.value)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200">
              {p.city.citizens.map((c) => <option key={c.id} value={c.id}>As {c.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
          <Eye className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
          <span>Observer · {p.speed === 0 ? 'Paused' : `${p.speed}x`} · Day {p.city.sharity.lastTickDay} budget {p.city.sharity.lastTickBudget}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input type="text" value={p.search} onChange={(e) => p.onSearch(e.target.value)} placeholder="Search posts, @handles, #tags..." className="w-full bg-[#090d16] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500" />
        </div>
        <select aria-label="Filter by author" value={p.authorFilter} onChange={(e) => p.onAuthor(e.target.value)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200">
          <option value="all">All Authors</option>
          {Object.values(p.city.sharity.profiles).map((pr) => <option key={pr.id} value={pr.id}>{pr.name} ({pr.handle})</option>)}
        </select>
        {p.hashtagFilter && (
          <button type="button" onClick={() => p.onHashtag(null)} className="px-2.5 py-1.5 text-xs font-mono bg-sky-500/20 border border-sky-400/50 text-sky-200 rounded-md cursor-pointer">
            {p.hashtagFilter} ×
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => p.onTopic('all')} className={`px-2 py-1 text-[11px] rounded border cursor-pointer ${p.topicFilter === 'all' ? 'bg-amber-500/20 border-amber-500/60 text-amber-200' : 'bg-[#090d16] border-slate-800 text-slate-400 hover:text-slate-200'}`}>
          All Topics
        </button>
        {ALL_TOPICS.map((t) => (
          <button key={t} type="button" onClick={() => p.onTopic(t)} className={`px-2 py-1 text-[11px] rounded border cursor-pointer ${p.topicFilter === t ? 'bg-amber-500/20 border-amber-500/60 text-amber-200' : 'bg-[#090d16] border-slate-800 text-slate-400 hover:text-slate-200'}`}>
            {TOPIC_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
