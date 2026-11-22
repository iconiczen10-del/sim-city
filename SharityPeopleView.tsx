// SharityPeopleView.tsx — Directory of all 50 citizens and 4 company pages with search, filters, and sorting

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CompanyId } from './companyTypes';
import { SharityAvatar, SharityVerifiedBadge } from './SharityAvatar';
import { countFollowersMap } from './sharityNetwork';
import type { Citizen, CityState, TierId } from './types';

interface SharityPeopleViewProps {
  city: CityState;
  onOpenProfile: (id: string) => void;
}

type TierFilter = 'all' | TierId | 'company';
type CompFilter = 'all' | CompanyId | 'unemployed';
type PeopleSort = 'followers' | 'following' | 'newest_bio';

export function SharityPeopleView({ city, onOpenProfile }: SharityPeopleViewProps) {
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [companyFilter, setCompanyFilter] = useState<CompFilter>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [inMemoryOnly, setInMemoryOnly] = useState(false);
  const [sortBy, setSortBy] = useState<PeopleSort>('followers');

  const followerCounts = useMemo(() => countFollowersMap(city.sharity.follows), [city.sharity.follows]);
  const citizensById = useMemo(() => new Map(city.citizens.map((c) => [c.id, c])), [city.citizens]);
  const companiesById = useMemo(() => new Map(city.companies.map((c) => [c.id, c])), [city.companies]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(city.sharity.profiles)
      .filter((prof) => {
        const cit: Citizen | undefined = prof.kind === 'citizen' ? citizensById.get(prof.id) : undefined;
        if (verifiedOnly && !prof.verified) return false;
        if (inMemoryOnly && (!cit || cit.alive)) return false;
        if (tierFilter === 'company' && prof.kind !== 'company') return false;
        if (tierFilter !== 'all' && tierFilter !== 'company' && cit?.tier !== tierFilter) return false;
        if (companyFilter !== 'all') {
          if (companyFilter === 'unemployed' && (!cit || cit.employerId !== null)) return false;
          if (companyFilter !== 'unemployed') {
            const matchComp = prof.id === companyFilter || cit?.employerId === companyFilter;
            if (!matchComp) return false;
          }
        }
        if (q) {
          const hay = `${prof.name} ${prof.handle} ${prof.bio} ${cit?.roleLevel ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'followers') return (followerCounts[b.id] ?? 0) - (followerCounts[a.id] ?? 0) || a.name.localeCompare(b.name);
        if (sortBy === 'following') return (city.sharity.follows[b.id]?.length ?? 0) - (city.sharity.follows[a.id]?.length ?? 0) || a.name.localeCompare(b.name);
        return b.bioUpdatedDay - a.bioUpdatedDay || (followerCounts[b.id] ?? 0) - (followerCounts[a.id] ?? 0);
      });
  }, [city.sharity, citizensById, query, tierFilter, companyFilter, verifiedOnly, inMemoryOnly, sortBy, followerCounts]);

  return (
    <div className="space-y-4">
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-3 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, @handle, role, or bio..."
            className="w-full bg-[#090d16] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <select aria-label="Filter by tier" value={tierFilter} onChange={(e) => setTierFilter(e.target.value as TierFilter)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200">
          <option value="all">All Tiers & Pages</option>
          <option value="T1">T1 Elite</option><option value="T2">T2 Upper</option><option value="T3">T3 Middle</option><option value="T4">T4 Modest</option><option value="T5">T5 Struggling</option>
          <option value="company">Company Pages</option>
        </select>
        <select aria-label="Filter by company" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value as CompFilter)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200">
          <option value="all">All Affiliations</option>
          {city.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="unemployed">Unemployed</option>
        </select>
        <select aria-label="Sort profiles" value={sortBy} onChange={(e) => setSortBy(e.target.value as PeopleSort)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200">
          <option value="followers">Sort: Followers</option>
          <option value="following">Sort: Following</option>
          <option value="newest_bio">Sort: Newest Bio</option>
        </select>
        <button type="button" onClick={() => setVerifiedOnly((v) => !v)} className={`px-2.5 py-1.5 text-xs rounded-md border cursor-pointer ${verifiedOnly ? 'bg-amber-500/20 border-amber-500/50 text-amber-200' : 'bg-[#090d16] border-slate-800 text-slate-400'}`}>
          Verified
        </button>
        <button type="button" onClick={() => setInMemoryOnly((v) => !v)} className={`px-2.5 py-1.5 text-xs rounded-md border cursor-pointer ${inMemoryOnly ? 'bg-rose-500/20 border-rose-500/50 text-rose-200' : 'bg-[#090d16] border-slate-800 text-slate-400'}`}>
          In memory
        </button>
      </div>

      <div className="text-xs text-slate-400 font-mono tabular-nums">Showing {rows.length} of {Object.keys(city.sharity.profiles).length} accounts</div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((prof) => {
          const cit = prof.kind === 'citizen' ? citizensById.get(prof.id) : undefined;
          const comp = prof.kind === 'company' ? companiesById.get(prof.id as CompanyId) : cit?.employerId ? companiesById.get(cit.employerId) : undefined;
          const followers = followerCounts[prof.id] ?? 0;
          const following = (city.sharity.follows[prof.id] ?? []).length;
          return (
            <button
              key={prof.id}
              type="button"
              onClick={() => onOpenProfile(prof.id)}
              className="text-left bg-[#111827] border border-slate-800 hover:border-slate-600 rounded-lg p-4 space-y-2.5 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <SharityAvatar profile={prof} citizen={cit} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-slate-100 truncate">{prof.name}</span>
                    <SharityVerifiedBadge profile={prof} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono text-slate-300">{prof.handle}</span>
                    <span aria-hidden="true">·</span>
                    <span>{cit ? cit.tier : 'Company'}</span>
                    {comp && <><span aria-hidden="true">·</span><span className="truncate">{comp.name}</span></>}
                    {cit && !cit.alive && <><span aria-hidden="true">·</span><span className="text-rose-300">In memory</span></>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2 min-h-[2rem]">
                {prof.bio || <span className="italic text-slate-500">No bio written</span>}
              </p>
              <div className="flex items-center gap-4 text-[11px] font-mono tabular-nums text-slate-400 pt-1 border-t border-slate-800/70">
                <span><strong className="text-slate-200">{followers}</strong> followers</span>
                <span><strong className="text-slate-200">{following}</strong> following</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
