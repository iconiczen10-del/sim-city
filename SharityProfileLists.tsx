// SharityProfileLists.tsx — Clickable followers, following, and top/bottom 5 affinity panels for Sharity profiles

import { useState } from 'react';
import { SharityAvatar } from './SharityAvatar';
import { getTopAndLowestAffinities } from './sharityAffinity';
import { getFollowersOf } from './sharityNetwork';
import type { SharityProfile } from './sharityTypes';
import type { Citizen, CityState } from './types';

interface SharityProfileListsProps {
  profile: SharityProfile;
  city: CityState;
  onOpenProfile: (id: string) => void;
}

export function SharityProfileLists({ profile, city, onOpenProfile }: SharityProfileListsProps) {
  const [followTab, setFollowTab] = useState<'followers' | 'following'>('followers');
  const citizensById = new Map(city.citizens.map((c) => [c.id, c]));

  const followerIds = getFollowersOf(city.sharity, profile.id);
  const followingIds = city.sharity.follows[profile.id] ?? [];
  const activeIds = followTab === 'followers' ? followerIds : followingIds;

  const affinityRows = profile.kind === 'citizen'
    ? getTopAndLowestAffinities(profile.id, city.citizens, city.sharity, 5)
    : null;

  function renderAffinityList(title: string, items: { citizen: Citizen; score: number }[], tone: string) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
        <h4 className="font-display text-xs font-semibold text-slate-200">{title}</h4>
        <div className="divide-y divide-slate-800/70">
          {items.map(({ citizen, score }) => {
            const p = city.sharity.profiles[citizen.id];
            if (!p) return null;
            return (
              <button
                key={citizen.id}
                type="button"
                onClick={() => onOpenProfile(citizen.id)}
                className="w-full flex items-center justify-between gap-2 py-2 px-1.5 rounded hover:bg-slate-800/50 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <SharityAvatar profile={p} citizen={citizen} size="sm" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-100 truncate">{p.name}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">{p.handle} · {citizen.roleLevel}</div>
                  </div>
                </div>
                <span className={`font-mono text-xs tabular-nums shrink-0 ${tone}`}>
                  {score > 0 ? `+${score}` : score}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {affinityRows && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderAffinityList('Top 5 Highest Affinity', affinityRows.highest, 'text-emerald-300')}
          {renderAffinityList('Top 5 Lowest Affinity', affinityRows.lowest, 'text-rose-300')}
        </div>
      )}

      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#090d16] border border-slate-800 rounded-md">
            <button
              type="button"
              onClick={() => setFollowTab('followers')}
              className={`px-3 py-1 text-xs rounded cursor-pointer ${followTab === 'followers' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}
            >
              Followers ({followerIds.length})
            </button>
            {profile.kind === 'citizen' && (
              <button
                type="button"
                onClick={() => setFollowTab('following')}
                className={`px-3 py-1 text-xs rounded cursor-pointer ${followTab === 'following' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}
              >
                Following ({followingIds.length})
              </button>
            )}
          </div>
        </div>

        {activeIds.length === 0 ? (
          <div className="text-xs text-slate-400 py-3">No accounts in this list yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {activeIds.map((id) => {
              const p = city.sharity.profiles[id];
              if (!p) return null;
              const cit = p.kind === 'citizen' ? citizensById.get(id) : undefined;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenProfile(id)}
                  className="flex items-center gap-2.5 p-2 rounded bg-[#0c1220] border border-slate-800/80 hover:border-slate-600 text-left cursor-pointer"
                >
                  <SharityAvatar profile={p} citizen={cit} size="sm" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-100 truncate">{p.name}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">{p.handle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
