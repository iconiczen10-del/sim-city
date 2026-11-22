// SharityProfileView.tsx — Detailed Sharity profile page with bio, badge history, connections, and posts

import { ArrowLeft, ExternalLink, MessageSquare } from 'lucide-react';
import { SharityAvatar, SharityVerifiedBadge } from './SharityAvatar';
import { SharityPostCard } from './SharityPostCard';
import { SharityProfileLists } from './SharityProfileLists';
import { getFollowersOf } from './sharityNetwork';
import type { SharityProfile } from './sharityTypes';
import type { CityState } from './types';

interface SharityProfileViewProps {
  profile: SharityProfile;
  city: CityState;
  onBack: () => void;
  onOpenProfile: (id: string) => void;
  onSelectCitizen: (id: string) => void;
}

export function SharityProfileView({
  profile,
  city,
  onBack,
  onOpenProfile,
  onSelectCitizen,
}: SharityProfileViewProps) {
  const citizen = profile.kind === 'citizen' ? city.citizens.find((c) => c.id === profile.id) : undefined;
  const company = profile.kind === 'company'
    ? city.companies.find((c) => c.id === profile.id)
    : citizen?.employerId ? city.companies.find((c) => c.id === citizen.employerId) : undefined;

  const followersCount = getFollowersOf(city.sharity, profile.id).length;
  const followingCount = (city.sharity.follows[profile.id] ?? []).length;
  const posts = city.sharity.posts.filter((p) => p.authorId === profile.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-amber-300 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Sharity</span>
        </button>
        {citizen && (
          <button
            type="button"
            onClick={() => onSelectCitizen(citizen.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#111827] border border-slate-700 hover:border-amber-500/60 text-slate-200 rounded-md cursor-pointer"
          >
            <span>Open Citizen Dossier</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <SharityAvatar profile={profile} citizen={citizen} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-lg font-semibold text-slate-50">{profile.name}</h2>
                <SharityVerifiedBadge profile={profile} />
                {citizen && !citizen.alive && (
                  <span className="text-xs font-medium text-rose-300">In memory · {citizen.deathDate}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                <span className="font-mono text-slate-300">{profile.handle}</span>
                <span aria-hidden="true">·</span>
                <span>{citizen ? `${citizen.tier} · ${citizen.roleLevel}` : company?.sector ?? 'Organization'}</span>
                {company && citizen && <><span aria-hidden="true">·</span><span>{company.name}</span></>}
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Joined Day {profile.joinedDay}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 font-mono text-xs tabular-nums">
            <div><span className="text-base font-semibold text-slate-100">{followersCount}</span> <span className="text-slate-400">followers</span></div>
            {profile.kind === 'citizen' && (
              <div><span className="text-base font-semibold text-slate-100">{followingCount}</span> <span className="text-slate-400">following</span></div>
            )}
            <div><span className="text-base font-semibold text-slate-100">{posts.length}</span> <span className="text-slate-400">posts</span></div>
          </div>
        </div>

        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-4 py-3 space-y-1">
          <p className="text-sm text-slate-200">
            {profile.bio || <span className="italic text-slate-500">No bio written.</span>}
          </p>
          <div className="text-[11px] font-mono text-slate-500 tabular-nums">Bio updated Day {profile.bioUpdatedDay}</div>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2.5">
        <h3 className="font-display text-sm font-semibold text-slate-100">Badge History</h3>
        {profile.badgeHistory.length === 0 ? (
          <div className="text-xs text-slate-400">No Rising or Verified badges recorded yet. Citizens earn Rising verification upon moving up a tier.</div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {profile.badgeHistory.map((b) => (
              <div key={b.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className={b.kind === 'earned' ? 'text-amber-300 font-medium' : 'text-rose-300 font-medium'}>
                    {b.kind === 'earned' ? 'Earned' : 'Lost'} {b.badge}{b.tier ? ` (${b.tier})` : ''}
                  </span>
                  <span className="text-slate-400 ml-2">{b.detail}</span>
                </div>
                <span className="font-mono text-slate-500 shrink-0 tabular-nums">{b.dateLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <SharityProfileLists profile={profile} city={city} onOpenProfile={onOpenProfile} />

      <div className="space-y-3">
        <div className="font-display text-sm font-semibold text-slate-100">Posts ({posts.length})</div>
        {posts.length === 0 ? (
          <div className="bg-[#111827] border border-slate-800 rounded-lg p-6 text-center space-y-1.5">
            <MessageSquare className="w-5 h-5 text-slate-500 mx-auto" aria-hidden="true" />
            <div className="text-xs text-slate-400">No posts from {profile.name} yet.</div>
          </div>
        ) : (
          posts.map((post) => (
            <SharityPostCard key={post.id} post={post} profile={profile} citizen={citizen} onOpenProfile={onOpenProfile} />
          ))
        )}
      </div>
    </div>
  );
}
