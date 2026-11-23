// SharityProfileConsequences.tsx — S4 profile Social Reputation, monthly follower delta, rivals, top posts, and memorial tributes

import { SharityAvatar } from './SharityAvatar';
import { getRivalsForCitizen } from './sharityRelationshipEffects';
import type { SharityPost, SharityProfile } from './sharityTypes';
import type { Citizen, CityState } from './types';

interface SharityProfileConsequencesProps {
  profile: SharityProfile;
  citizen?: Citizen;
  city: CityState;
  posts: SharityPost[];
  onOpenProfile: (id: string) => void;
}

export function SharityProfileConsequences({
  profile,
  citizen,
  city,
  posts,
  onOpenProfile,
}: SharityProfileConsequencesProps) {
  const gained = city.sharity.followerGainedMonth?.[profile.id] ?? 0;
  const lost = city.sharity.followerLostMonth?.[profile.id] ?? 0;
  const rivals = citizen ? getRivalsForCitizen(city.sharity, citizen.id, city.citizens) : [];
  const biggestPosts = [...posts]
    .sort((a, b) => (b.likes + b.dislikes + b.replies * 2 + b.reposts * 3) - (a.likes + a.dislikes + a.replies * 2 + a.reposts * 3))
    .slice(0, 3);
  const tributes = citizen && !citizen.alive ? city.sharity.posts.filter((p) => p.tributeForId === citizen.id) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-slate-400">Social Reputation</div>
          <div className="font-mono text-lg font-semibold text-amber-300 tabular-nums">
            {citizen ? `${(citizen.socialReputation ?? 50).toFixed(1)} / 100` : 'Official Brand'}
          </div>
          {citizen && (citizen.cancelledUntilDay ?? 0) >= city.totalDays && (
            <div className="text-[11px] text-rose-300 font-medium">Cancelled backlash active</div>
          )}
          {citizen && (citizen.sharityBurnedUntilDay ?? 0) >= city.totalDays && (citizen.cancelledUntilDay ?? 0) < city.totalDays && (
            <div className="text-[11px] text-amber-300">Posting less after recent backlash</div>
          )}
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-slate-400">Followers This Month</div>
          <div className="font-mono text-lg font-semibold tabular-nums">
            <span className="text-emerald-300">+{gained}</span>{' '}
            <span className="text-slate-600">/</span>{' '}
            <span className="text-rose-300">-{lost}</span>
          </div>
          <div className="text-[11px] text-slate-500">Gained vs lost since month start</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-slate-400">Active Rivals (Affinity ≤ -35)</div>
          <div className="font-mono text-lg font-semibold text-rose-300 tabular-nums">{rivals.length}</div>
          <div className="text-[11px] text-slate-500">
            {rivals.length > 0 ? rivals.slice(0, 2).map((r) => r.citizen.name).join(', ') : 'No open Sharity rivals'}
          </div>
        </div>
      </div>

      {rivals.length > 0 && (
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
          <h3 className="font-display text-sm font-semibold text-rose-200">Rivals</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {rivals.map(({ citizen: rc, score }) => {
              const rp = city.sharity.profiles[rc.id];
              if (!rp) return null;
              return (
                <button key={rc.id} type="button" onClick={() => onOpenProfile(rc.id)} className="flex items-center justify-between gap-2 p-2 rounded bg-[#0c1220] border border-rose-900/40 hover:border-rose-500/50 text-left cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <SharityAvatar profile={rp} citizen={rc} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-100 truncate">{rp.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">{rp.handle}</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-rose-300 shrink-0">{score}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {biggestPosts.length > 0 && (
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Biggest Posts</h3>
          <div className="divide-y divide-slate-800/70">
            {biggestPosts.map((p) => (
              <div key={p.id} className="py-2 flex items-start justify-between gap-3 text-xs">
                <p className="text-slate-300 line-clamp-2">{p.text}</p>
                <span className="font-mono text-[11px] text-amber-300 shrink-0">
                  {p.likes}👍 {p.dislikes}👎 {p.replies}💬{p.isViral ? ' · Viral' : ''}{p.isCancelled ? ' · Cancelled' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {citizen && !citizen.alive && (
        <div className="bg-[#111827] border border-sky-900/50 rounded-lg p-4 space-y-2">
          <h3 className="font-display text-sm font-semibold text-sky-200">In Memory Tribute Thread ({tributes.length})</h3>
          {tributes.length === 0 ? (
            <div className="text-xs text-slate-400">No Sharity tributes recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {tributes.map((t) => (
                <button key={t.id} type="button" onClick={() => onOpenProfile(t.authorId)} className="w-full py-2 text-left text-xs space-y-0.5 hover:bg-slate-800/30 rounded px-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sky-300">{t.handle}</span>
                    <span className="font-mono text-[11px] text-slate-500">{t.dateLabel} · {t.likes}👍 {t.dislikes}👎</span>
                  </div>
                  <p className="text-slate-300">{t.text}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
