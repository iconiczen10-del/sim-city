// relationshipEngine.ts — Daily courtship pairing, widowed recovery, and active couple orchestration

import type { SimClock } from './eventFactory';
import { areCloseRelatives } from './familyTreeSync';
import { advanceActiveCouple, computeCompatibility } from './relationshipStages';
import { recordSimEvent } from './recordsStore';
import { simRand, simRandFloat, simRandInt } from './rng';
import { adjustAffinity, getAffinity } from './sharityAffinity';
import type { Citizen, CityEvent, CityState } from './types';

function sameDistrict(a: Citizen, b: Citizen, city: CityState): boolean {
  if (!a.homeId || !b.homeId) return false;
  const ha = city.housing.houses.find((h) => h.id === a.homeId);
  const hb = city.housing.houses.find((h) => h.id === b.homeId);
  return Boolean(ha && hb && ha.district === hb.district);
}

export function stepRelationshipsDaily(city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  const byId = new Map(city.citizens.map((c) => [c.id, c]));
  const adults = city.citizens.filter((c) => c.alive && c.age >= 22);

  for (const c of adults) {
    if (!c.relationship) c.relationship = { stage: 'single', partnerId: null, stageSinceDay: clock.totalDays, pastSpouseIds: [], exPartnerIds: [] };
    if (c.relationship.stage === 'widowed' && clock.totalDays >= (c.relationship.griefUntilDay ?? 0)) {
      c.relationship.stage = 'single';
      c.relationship.stageSinceDay = clock.totalDays;
    }
    if (c.relationship.partnerId) {
      const p = byId.get(c.relationship.partnerId);
      if (!p || !p.alive) {
        c.relationship.stage = 'single';
        c.relationship.partnerId = null;
        c.relationship.stageSinceDay = clock.totalDays;
        c.relationship.lastBirthDayInMarriage = undefined;
        c.relationship.nextConceptionDay = undefined;
        c.relationship.conceptionRuleNote = undefined;
      }
    }
  }

  const seen = new Set<string>();
  for (const a of adults) {
    const pid = a.relationship?.partnerId;
    if (!pid || seen.has(a.id) || seen.has(pid)) continue;
    const b = byId.get(pid);
    if (!b || !b.alive || b.relationship?.partnerId !== a.id) continue;
    seen.add(a.id); seen.add(b.id);
    if (a.relationship!.stage !== 'married') advanceActiveCouple(a, b, city, clock, dateLabel, events);
  }

  const singles = adults.filter((c) => c.relationship?.stage === 'single' && !c.relationship.partnerId);
  for (const a of singles) {
    const noticeRate = a.age <= 30 ? 0.3 : a.age <= 40 ? 0.2 : 0.12;
    if (a.relationship?.stage !== 'single' || simRand() > noticeRate) continue;
    let best: { cand: Citizen; score: number } | null = null;
    for (const b of singles) {
      if (b.id === a.id || b.relationship?.stage !== 'single' || areCloseRelatives(a, b)) continue;
      if (a.relationship.exPartnerIds.includes(b.id)) continue;
      const aff = getAffinity(city.sharity, a.id, b.id);
      const sharedWork = Boolean(a.employerId && a.employerId === b.employerId);
      const sharedDist = sameDistrict(a, b, city);
      if (aff <= 50 && !(sharedWork && aff >= 32) && !(sharedDist && aff >= 38)) continue;
      const compat = computeCompatibility(a, b);
      if (compat < 45) continue;
      const sc = aff + compat * 0.5 + (sharedWork ? 12 : 0) + (sharedDist ? 8 : 0);
      if (!best || sc > best.score) best = { cand: b, score: sc };
    }
    if (best) {
      const b = best.cand;
      const compat = computeCompatibility(a, b);
      const avgAge = (a.age + b.age) / 2;
      const paceFactor = avgAge <= 30 ? simRandFloat(0.45, 0.72) : avgAge <= 40 ? simRandFloat(0.85, 1.15) : simRandFloat(1.3, 1.75);
      a.relationship = { ...a.relationship!, stage: 'awareness', partnerId: b.id, stageSinceDay: clock.totalDays, compatibility: compat, paceFactor };
      b.relationship = { ...b.relationship!, stage: 'awareness', partnerId: a.id, stageSinceDay: clock.totalDays, compatibility: compat, paceFactor };
      adjustAffinity(city.sharity, a.id, b.id, simRandInt(4, 9));
      recordSimEvent({
        simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'courtship_awareness',
        subjectId: a.id, subjectKind: 'citizen', subjectName: a.name,
        summary: `${a.name} and ${b.name} noticed each other (compat ${compat})`,
        detail: { partnerA: a.id, partnerB: b.id, affinity: getAffinity(city.sharity, a.id, b.id), compatibility: compat, paceFactor: Math.round(paceFactor * 100) / 100 },
      });
    }
  }
}
