// SharityAvatar.tsx — Tier-colored initials avatar and Rising/Verified badge indicators for Sharity

import { BadgeCheck } from 'lucide-react';
import type { CompanyId } from './companyTypes';
import type { SharityProfile } from './sharityTypes';
import type { Citizen, TierId } from './types';

const TIER_AVATAR_BG: Record<TierId, string> = {
  T1: 'bg-amber-500/20 text-amber-200 border-amber-500/50',
  T2: 'bg-purple-500/20 text-purple-200 border-purple-500/50',
  T3: 'bg-sky-500/20 text-sky-200 border-sky-500/50',
  T4: 'bg-teal-500/20 text-teal-200 border-teal-500/50',
  T5: 'bg-slate-600/30 text-slate-300 border-slate-500/40',
};

const COMPANY_AVATAR_BG: Record<CompanyId, string> = {
  vijtech: 'bg-sky-500/20 text-sky-200 border-sky-400/50',
  vijcapital: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50',
  vijindustries: 'bg-amber-500/20 text-amber-200 border-amber-400/50',
  vijmart: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50',
  gjelectricity: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/50',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VJ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function SharityAvatar({
  profile,
  citizen,
  size = 'md',
}: {
  profile: SharityProfile;
  citizen?: Citizen;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  let tone = 'bg-slate-700/40 text-slate-200 border-slate-600';
  if (profile.kind === 'company') {
    tone = COMPANY_AVATAR_BG[profile.id as CompanyId] ?? tone;
  } else if (citizen) {
    tone = citizen.alive ? TIER_AVATAR_BG[citizen.tier] : 'bg-slate-800/80 text-slate-400 border-slate-700';
  }
  return (
    <div
      className={`${dim} ${tone} rounded-full border flex items-center justify-center font-display font-semibold shrink-0 select-none`}
      aria-hidden="true"
    >
      {getInitials(profile.name)}
    </div>
  );
}

export function SharityVerifiedBadge({ profile }: { profile: SharityProfile }) {
  if (!profile.verified) return null;
  const label = profile.kind === 'company' ? 'Verified' : `Rising${profile.risingTier ? ` ${profile.risingTier}` : ''}`;
  const color = profile.kind === 'company' ? 'text-sky-300' : 'text-amber-300';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${color}`} title={label}>
      <BadgeCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
