// CitizenSharityCard.tsx — Compact Sharity preview section inside the Citizen Profile Modal

import { ExternalLink } from 'lucide-react';
import { SharityVerifiedBadge } from './SharityAvatar';
import { getFollowersOf } from './sharityNetwork';
import type { Citizen, CityState } from './types';

interface CitizenSharityCardProps {
  citizen: Citizen;
  city: CityState;
  onOpenSharityProfile: (profileId: string) => void;
}

export function CitizenSharityCard({ citizen, city, onOpenSharityProfile }: CitizenSharityCardProps) {
  const profile = city.sharity.profiles[citizen.id];
  if (!profile) return null;
  const followers = getFollowersOf(city.sharity, citizen.id).length;
  const following = (city.sharity.follows[citizen.id] ?? []).length;

  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-200">Sharity</span>
          <span className="font-mono text-amber-300">{profile.handle}</span>
          <SharityVerifiedBadge profile={profile} />
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono tabular-nums text-slate-400">{followers} followers · {following} following</span>
          {!citizen.alive && <span className="text-rose-300">· In memory</span>}
        </div>
        <div className="text-xs text-slate-400 truncate">
          {profile.bio || <span className="italic text-slate-500">No bio written</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpenSharityProfile(citizen.id)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 shrink-0 cursor-pointer"
      >
        <span>Open Sharity Profile</span>
        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
