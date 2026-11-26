// familyTreeSync.ts — Syncs family tree peak savings, roles, legacy lines, and close-relative checks

import { ROLE_RANK } from './companyRules';
import { ensureFamilyState } from './familyTreeEngine';
import type { Citizen, CityState } from './types';

export function syncFamilyTreeStats(city: CityState): void {
  const fam = ensureFamilyState(city);
  for (const c of city.citizens) {
    const node = fam.nodes[c.id];
    if (!node) continue;
    node.alive = c.alive;
    node.peakSavings = Math.max(node.peakSavings, Math.round(c.savings));
    const curRole = c.alive ? c.roleLevel : (c.previousRole ?? c.roleLevel);
    if ((ROLE_RANK[curRole] ?? 0) > (ROLE_RANK[node.peakRole as Citizen['roleLevel']] ?? 0)) {
      node.peakRole = curRole;
    }
    const line = fam.families[node.familyId];
    if (!line) continue;
    const g = node.generation;
    const prevPeak = line.genPeaks[g];
    if (!prevPeak || c.savings > prevPeak.peakSavings) {
      line.genPeaks[g] = {
        generation: g,
        peakSavings: Math.max(prevPeak?.peakSavings ?? 0, Math.round(c.savings)),
        peakStatus: Math.max(prevPeak?.peakStatus ?? 0, Math.round(c.statusScore)),
        bestRole: curRole,
        memberName: c.name,
      };
    }
  }
  for (const line of Object.values(fam.families)) {
    const members = Object.values(fam.nodes).filter((n) => n.familyId === line.id);
    const maxGen = members.reduce((m, n) => Math.max(m, n.generation), 1);
    const aliveCount = members.filter((n) => n.alive).length;
    const topSav = Math.max(...Object.values(line.genPeaks).map((p) => p.peakSavings), 0);
    line.legacyLine = `${line.surname} line · ${maxGen} gen · ${aliveCount}/${members.length} living · Peak ∆${topSav.toLocaleString('en-IN')}`;
  }
}

export function areCloseRelatives(a: Citizen, b: Citizen): boolean {
  if (a.id === b.id) return true;
  if ((a.parentIds ?? []).includes(b.id) || (b.parentIds ?? []).includes(a.id)) return true;
  if ((a.childrenIds ?? []).includes(b.id) || (b.childrenIds ?? []).includes(a.id)) return true;
  const ap = a.parentIds ?? [];
  const bp = b.parentIds ?? [];
  if (ap.length > 0 && bp.some((p) => ap.includes(p))) return true;
  return false;
}
