// sharityBios.ts — Unique Sharity handles, official company bios, and event-driven citizen bios

import type { Company, CompanyId } from './companyTypes';
import { simPick, simRand } from './rng';
import type { SharityProfile } from './sharityTypes';
import type { Citizen } from './types';

export const COMPANY_OFFICIAL_BIOS: Record<CompanyId, string> = {
  vijtech: 'Enterprise software systems, civic platforms, and technical infrastructure built in Vij.',
  vijcapital: 'Commercial banking, treasury credit, and capital allocation across Vij.',
  vijindustries: 'Primary manufacturing, export fabrication, and wholesale supply for Vij.',
  vijmart: 'Daily food, water, clothing, and household essentials for every neighborhood in Vij.',
  gjelectricity: 'City power generation, grid stability, and gas plant operations across Vij.',
};

export function buildUniqueHandle(name: string, taken: Set<string>): string {
  const parts = name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
  const base = parts.length >= 2 ? `@${parts[0]}.${parts[parts.length - 1]}` : `@${parts[0] || 'citizen'}`;
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let n = 2;
  while (taken.has(`${base}${n}`)) n += 1;
  const candidate = `${base}${n}`;
  taken.add(candidate);
  return candidate;
}

function getTraitLine(c: Citizen, polished: boolean): string {
  const ranked: [string, number][] = [
    ['disciplined', c.traits.discipline],
    ['ambitious', c.traits.ambition],
    ['kind', c.traits.kindness],
    ['greedy', c.traits.greed],
    ['social', c.traits.sociability],
  ];
  ranked.sort((a, b) => b[1] - a[1]);
  const top = ranked[0][0];
  if (polished) {
    if (top === 'disciplined') return 'Focused on long-term execution and steady standards.';
    if (top === 'ambitious') return 'Always looking toward the next milestone and higher ground.';
    if (top === 'kind') return 'Committed to fair teams, steady neighbors, and mutual respect.';
    if (top === 'greedy') return 'Focused on returns, leverage, and protecting hard-won margins.';
    return 'Building broad alliances and staying active across civic circles.';
  }
  if (top === 'disciplined') return 'Keeps a strict routine.';
  if (top === 'ambitious') return 'Chasing the next step up.';
  if (top === 'kind') return 'Looks out for neighbors and coworkers.';
  if (top === 'greedy') return 'Watching every coin carefully.';
  return 'Always around for a good conversation.';
}

function getLifeLine(c: Citizen, polished: boolean, hint?: string): string {
  if (hint === 'fired' || hint === 'layoff') return 'Rebuilding after a sudden job loss.';
  if (hint === 'promoted' || hint === 'tier_up') return polished ? 'Stepping into greater responsibility this season.' : 'Things are finally looking up.';
  if (c.rentArrears > 0 || c.savings < 260 || c.hunger < 55 || c.thirst < 55) {
    return polished ? 'Navigating tight liquidity right now.' : 'Stretching every coin to make ends meet.';
  }
  if (c.savings >= 4000 || c.tier === 'T1' || c.tier === 'T2') {
    return polished ? 'Living well and building lasting reserves.' : 'Life feels steady and comfortable.';
  }
  if (c.monthsSincePromotion <= 2 && c.roleLevel !== 'Entry' && c.roleLevel !== 'Unemployed') {
    return 'Riding fresh momentum at work.';
  }
  return 'Taking each month in Vij as it comes.';
}

export function buildCitizenBio(citizen: Citizen, companies: Company[], hint?: string): string {
  if (!citizen.alive) return 'Remembered across Vij.';
  const comp = citizen.employerId ? companies.find((co) => co.id === citizen.employerId) : null;
  const lowEdu = citizen.education === 'none' || citizen.education === 'school';
  const struggling = citizen.tier === 'T5' || citizen.savings < 250 || citizen.rentArrears > 0;

  if (struggling && lowEdu) {
    const roll = simRand();
    if (roll < 0.34) return '';
    if (citizen.roleLevel === 'Unemployed') {
      return simPick(['Looking for steady work.', 'Between jobs right now.', 'Need a break soon.']);
    }
    return `${citizen.roleLevel} at ${comp?.name ?? 'Vij'}. Getting through the week.`;
  }

  const polished = citizen.tier === 'T1' || citizen.tier === 'T2' || citizen.roleLevel === 'CEO' || citizen.roleLevel === 'Executive';
  const workLine = citizen.roleLevel === 'Unemployed'
    ? (polished ? 'Evaluating new leadership and career options.' : 'Currently between roles and watching the job board.')
    : `${citizen.roleLevel} at ${comp?.name ?? 'Vij'}.`;

  return `${workLine} ${getTraitLine(citizen, polished)} ${getLifeLine(citizen, polished, hint)}`.trim();
}

export function maybeRefreshCitizenBio(
  profile: SharityProfile,
  citizen: Citizen,
  companies: Company[],
  totalDay: number,
  hint?: string
): boolean {
  if (!citizen.alive) return false;
  if (totalDay - profile.bioUpdatedDay < 10) return false;
  const nextBio = buildCitizenBio(citizen, companies, hint);
  profile.bio = nextBio;
  profile.bioUpdatedDay = totalDay;
  return true;
}
