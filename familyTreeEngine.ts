// familyTreeEngine.ts — Family tree initialization, node synchronization, surname rules, and marriage/child links

import { ROLE_RANK } from './companyRules';
import type { CityFamilyState, FamilyLine, FamilyTreeNode } from './familyTypes';
import type { Citizen, CityState } from './types';

export function extractSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function makeDefaultRel(stageSinceDay = 1) {
  return { stage: 'single' as const, partnerId: null, stageSinceDay, pastSpouseIds: [], exPartnerIds: [] };
}

export function makeTreeNodeFromCitizen(c: Citizen, familyId: string, generation: number): FamilyTreeNode {
  return {
    citizenId: c.id,
    name: c.name,
    surname: extractSurname(c.name),
    familyId,
    generation,
    birthYear: c.birthYear ?? Math.max(-65, 1 - c.age),
    alive: c.alive,
    parentIds: [...(c.parentIds ?? [])],
    spouseIds: c.relationship?.stage === 'married' && c.relationship.partnerId ? [c.relationship.partnerId] : [],
    pastSpouseIds: [...(c.relationship?.pastSpouseIds ?? [])],
    childrenIds: [...(c.childrenIds ?? [])],
    stepParentIds: [],
    stepChildIds: [],
    peakSavings: Math.round(c.savings),
    peakRole: c.alive ? c.roleLevel : (c.previousRole ?? c.roleLevel),
  };
}

export function createInitialFamilyState(citizens: Citizen[]): CityFamilyState {
  const families: Record<string, FamilyLine> = {};
  const nodes: Record<string, FamilyTreeNode> = {};
  citizens.forEach((c, idx) => {
    const famId = `fam_${idx + 1}`;
    const surname = extractSurname(c.name);
    c.familyId = famId;
    c.generation = 1;
    c.parentIds = c.parentIds ?? [];
    c.childrenIds = c.childrenIds ?? [];
    c.youngAdultPhase = c.youngAdultPhase ?? 'none';
    c.relationship = c.relationship ?? makeDefaultRel(1);
    families[famId] = {
      id: famId,
      surname,
      foundedDay: 1,
      founderIds: [c.id],
      achievements: [],
      genPeaks: { 1: { generation: 1, peakSavings: Math.round(c.savings), peakStatus: Math.round(c.statusScore), bestRole: c.roleLevel, memberName: c.name } },
      legacyLine: `${surname} family founded in Year 1 by ${c.name}.`,
    };
    nodes[c.id] = makeTreeNodeFromCitizen(c, famId, 1);
  });
  return { nextCitizenSeq: citizens.length + 1, families, nodes, pregnancies: [] };
}

export function ensureFamilyState(city: CityState): CityFamilyState {
  if (!city.family || !city.family.families || !city.family.nodes) {
    city.family = createInitialFamilyState(city.citizens);
  }
  const fam = city.family;
  if (typeof fam.nextCitizenSeq !== 'number' || fam.nextCitizenSeq <= city.citizens.length) {
    fam.nextCitizenSeq = city.citizens.length + 1;
  }
  if (!Array.isArray(fam.pregnancies)) fam.pregnancies = [];

  for (const c of city.citizens) {
    if (typeof c.birthDay !== 'number') {
      const seedIdx = Math.max(1, parseInt(c.id.replace(/\D/g, ''), 10) || 1);
      c.birthDay = ((seedIdx * 7) % 30) + 1;
      c.birthMonth = ((seedIdx * 5) % 12) + 1;
      c.birthYear = city.year - c.age;
    }
    if (typeof c.lucky !== 'boolean') { c.lucky = false; c.luckyExtraYears = 0; c.luckyYearsUsed = 0; }
    if (!c.relationship) c.relationship = makeDefaultRel(city.totalDays);
    if (!Array.isArray(c.parentIds)) c.parentIds = [];
    if (!Array.isArray(c.childrenIds)) c.childrenIds = [];
    if (!c.familyId || !fam.families[c.familyId]) {
      const fId = `fam_${c.id}`;
      const surname = extractSurname(c.name);
      c.familyId = fId;
      c.generation = c.generation ?? 1;
      fam.families[fId] = {
        id: fId, surname, foundedDay: 1, founderIds: [c.id], achievements: [],
        genPeaks: { 1: { generation: 1, peakSavings: Math.round(c.savings), peakStatus: Math.round(c.statusScore), bestRole: c.roleLevel, memberName: c.name } },
        legacyLine: `${surname} family founded by ${c.name}.`,
      };
    }
    if (!fam.nodes[c.id]) fam.nodes[c.id] = makeTreeNodeFromCitizen(c, c.familyId, c.generation ?? 1);
  }
  return fam;
}

export function linkMarriageInFamilyTree(fam: CityFamilyState, a: Citizen, b: Citizen): void {
  const na = fam.nodes[a.id];
  const nb = fam.nodes[b.id];
  if (na && !na.spouseIds.includes(b.id)) na.spouseIds.push(b.id);
  if (nb && !nb.spouseIds.includes(a.id)) nb.spouseIds.push(a.id);

  for (const childId of a.childrenIds ?? []) {
    const nc = fam.nodes[childId];
    if (nc && !nc.parentIds.includes(b.id)) {
      if (!nc.stepParentIds.includes(b.id)) nc.stepParentIds.push(b.id);
      if (nb && !nb.stepChildIds.includes(childId)) nb.stepChildIds.push(childId);
    }
  }
  for (const childId of b.childrenIds ?? []) {
    const nc = fam.nodes[childId];
    if (nc && !nc.parentIds.includes(a.id)) {
      if (!nc.stepParentIds.includes(a.id)) nc.stepParentIds.push(a.id);
      if (na && !na.stepChildIds.includes(childId)) na.stepChildIds.push(childId);
    }
  }
}
