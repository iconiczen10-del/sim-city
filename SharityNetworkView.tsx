// SharityNetworkView.tsx — SimGod network analytics: top followed, fastest growing, most isolated, and verified list

import { useMemo } from 'react';
import { SharityAvatar, SharityVerifiedBadge } from './SharityAvatar';
import { SharityCityPulsePanel } from './SharityCityPulsePanel';
import { SharityNetworkCharts } from './SharityNetworkCharts';
import { SharityNetworkEngagement } from './SharityNetworkEngagement';
import { countFollowersMap } from './sharityNetwork';
import type { SharityProfile } from './sharityTypes';
import type { Citizen, CityState } from './types';

interface SharityNetworkViewProps {
  city: CityState;
  onOpenProfile: (id: string) => void;
}

export function SharityNetworkView({ city, onOpenProfile }: SharityNetworkViewProps) {
  const { profiles, follows, monthStartFollowers } = city.sharity;
  const followerCounts = useMemo(() => countFollowersMap(follows), [follows]);
  const citizensById = useMemo(() => new Map(city.citizens.map((c) => [c.id, c])), [city.citizens]);
  const allProfiles = useMemo(() => Object.values(profiles), [profiles]);

  const totalFollows = useMemo(() => Object.values(follows).reduce((s, list) => s + list.length, 0), [follows]);
  const avgFollowers = allProfiles.length > 0 ? (totalFollows / allProfiles.length).toFixed(1) : '0.0';
  const verifiedList = useMemo(
    () => allProfiles.filter((p) => p.verified).sort((a, b) => (followerCounts[b.id] ?? 0) - (followerCounts[a.id] ?? 0)),
    [allProfiles, followerCounts]
  );

  const topFollowed = useMemo(
    () => [...allProfiles].sort((a, b) => (followerCounts[b.id] ?? 0) - (followerCounts[a.id] ?? 0)).slice(0, 10),
    [allProfiles, followerCounts]
  );

  const fastestGrowing = useMemo(
    () =>
      allProfiles
        .map((p) => ({ prof: p, delta: (followerCounts[p.id] ?? 0) - (monthStartFollowers[p.id] ?? followerCounts[p.id] ?? 0) }))
        .sort((a, b) => b.delta - a.delta || (followerCounts[b.prof.id] ?? 0) - (followerCounts[a.prof.id] ?? 0))
        .slice(0, 8),
    [allProfiles, followerCounts, monthStartFollowers]
  );

  const mostIsolated = useMemo(
    () =>
      city.citizens
        .filter((c) => c.alive)
        .map((c) => ({ prof: profiles[c.id], cit: c, followers: followerCounts[c.id] ?? 0 }))
        .filter((r): r is { prof: SharityProfile; cit: Citizen; followers: number } => Boolean(r.prof))
        .sort((a, b) => a.followers - b.followers || a.cit.traits.sociability - b.cit.traits.sociability)
        .slice(0, 8),
    [city.citizens, profiles, followerCounts]
  );

  function renderRow(prof: SharityProfile, metricText: string) {
    const cit = prof.kind === 'citizen' ? citizensById.get(prof.id) : undefined;
    return (
      <button
        key={prof.id}
        type="button"
        onClick={() => onOpenProfile(prof.id)}
        className="w-full flex items-center justify-between gap-3 py-2 px-2 rounded hover:bg-slate-800/60 text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <SharityAvatar profile={prof} citizen={cit} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-slate-100 truncate">{prof.name}</span>
              <SharityVerifiedBadge profile={prof} />
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              {prof.handle} · {cit ? cit.tier : 'Company'}{cit && !cit.alive ? ' · In memory' : ''}
            </div>
          </div>
        </div>
        <span className="font-mono text-xs tabular-nums text-amber-300 shrink-0">{metricText}</span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Follows', value: String(totalFollows) },
          { label: 'Avg Followers / Account', value: avgFollowers },
          { label: 'Verified Accounts', value: String(verifiedList.length) },
          { label: 'In Memory Profiles', value: String(city.citizens.filter((c) => !c.alive).length) },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#111827] border border-slate-800 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-400">{kpi.label}</div>
            <div className="font-mono text-lg font-semibold text-slate-100 tabular-nums mt-0.5">{kpi.value}</div>
          </div>
        ))}
      </div>

      <SharityNetworkCharts city={city} />

      <SharityCityPulsePanel city={city} />

      <SharityNetworkEngagement city={city} onOpenProfile={onOpenProfile} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Top 10 Most Followed</h3>
          <div className="divide-y divide-slate-800/70">
            {topFollowed.map((p) => renderRow(p, `${followerCounts[p.id] ?? 0} followers`))}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Fastest Growing This Month</h3>
          <div className="divide-y divide-slate-800/70">
            {fastestGrowing.map(({ prof, delta }) => renderRow(prof, `${delta >= 0 ? `+${delta}` : delta} (${followerCounts[prof.id] ?? 0})`))}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Most Isolated Living Citizens</h3>
          <div className="divide-y divide-slate-800/70">
            {mostIsolated.map(({ prof, followers }) => renderRow(prof, `${followers} followers`))}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Verified Accounts ({verifiedList.length})</h3>
          <div className="divide-y divide-slate-800/70">
            {verifiedList.map((p) => renderRow(p, `${followerCounts[p.id] ?? 0} followers`))}
          </div>
        </div>
      </div>
    </div>
  );
}
