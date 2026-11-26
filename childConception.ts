// childConception.ts — Married couple pregnancy eligibility, 60-day pregnancy tracking, and Sharity expectations

import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { ensureFamilyState } from './familyTreeEngine';
import { recordSimEvent } from './recordsStore';
import { simRand } from './rng';
import { recordPost } from './sharityPosting';
import type { Citizen, CityEvent, CityState } from './types';

function postPregnancySharity(city: CityState, author: Citizen, partner: Citizen, clock: SimClock, dateLabel: string): void {
  const prof = city.sharity.profiles[author.id];
  if (!prof || !author.alive) return;
  recordPost(city.sharity, {
    id: `post_preg_${clock.totalDays}_${author.id}`,
    authorId: author.id, handle: prof.handle, createdDay: clock.totalDays, dateLabel,
    topic: 'celebrations', triggerKey: 'pregnancy', voice: 'hopeful', sentiment: 'positive',
    text: `${partner.name} and I are expecting a child! Preparing our home and savings for a new chapter in Vij.`,
    hashtags: ['#VijFamily', '#NewBeginnings'], mentions: [], urgencyWeight: 74,
    why: { trigger: 'Expecting a child', gateScores: { sociability: author.traits.sociability, eventStrength: 74, socialNeed: 60, moodSwing: 20, postWeight: 74 }, voiceReason: 'Family milestone', templateId: 'fam_pregnancy', styleNote: 'Expecting baby' },
    likes: 0, dislikes: 0, replies: 0, reposts: 0, score: 85,
  }, clock, dateLabel);
}

export function stepConceptionAndPregnancyDaily(city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  const fam = ensureFamilyState(city);
  const byId = new Map(city.citizens.map((c) => [c.id, c]));

  // Active pregnancy stress & preparation
  for (const preg of fam.pregnancies) {
    const c1 = byId.get(preg.carrierId);
    const c2 = byId.get(preg.partnerId);
    const combinedSav = (c1?.alive ? c1.savings : 0) + (c2?.alive ? c2.savings : 0);
    for (const p of [c1, c2]) {
      if (!p || !p.alive) continue;
      if (p.roleLevel === 'Unemployed') p.jobHunting = true;
      if (combinedSav < 5000) {
        p.stress = Math.round(clamp(p.stress + 1.2, 0, 100) * 10) / 10;
      }
      if (p.housingPrefs && (p.housingPrefs.preferredType === 'shared_room' || p.housingPrefs.preferredType === 'small_flat')) {
        p.housingPrefs.preferredType = 'apartment';
      }
    }
  }

  // Check new conceptions
  const seen = new Set<string>();
  for (const a of city.citizens) {
    if (!a.alive || a.relationship?.stage !== 'married' || !a.relationship.partnerId) continue;
    if (seen.has(a.id) || seen.has(a.relationship.partnerId)) continue;
    const b = byId.get(a.relationship.partnerId);
    if (!b || !b.alive) continue;
    seen.add(a.id); seen.add(b.id);

    const marriedDays = clock.totalDays - (a.relationship.marriedSinceDay ?? a.relationship.stageSinceDay);
    if (marriedDays < 180) continue;
    const sharedKids = (a.childrenIds ?? []).filter((id) => (b.childrenIds ?? []).includes(id)).length;
    if (sharedKids >= 2 || (a.childrenIds?.length ?? 0) >= 2 || (b.childrenIds?.length ?? 0) >= 2) continue;
    if (a.age > 54 || b.age > 54) continue;
    if (a.mood <= 50 || b.mood <= 50 || a.healthProfile.mental <= 50 || b.healthProfile.mental <= 50) continue;
    if (a.savings + b.savings <= 5000) continue;

    const alreadyPreg = fam.pregnancies.some((p) => p.carrierId === a.id || p.partnerId === a.id || p.carrierId === b.id || p.partnerId === b.id);
    if (alreadyPreg) continue;

    const house = a.homeId ? city.housing.houses.find((h) => h.id === a.homeId) : undefined;
    if (!house || house.capacity < 2) continue;

    const ageBoost = (a.age <= 36 || b.age <= 36) ? 0.045 : 0.025;
    if (simRand() > ageBoost) continue;

    const carrier = a.gender === 'Female' ? a : b.gender === 'Female' ? b : a;
    const partner = carrier.id === a.id ? b : a;
    const preg = {
      id: `preg_${clock.totalDays}_${carrier.id}`,
      carrierId: carrier.id,
      partnerId: partner.id,
      familyId: carrier.familyId ?? `fam_${carrier.id}`,
      conceivedDay: clock.totalDays,
      dueDay: clock.totalDays + 60,
    };
    fam.pregnancies.push(preg);
    carrier.pregnancy = preg;
    partner.pregnancy = preg;

    postPregnancySharity(city, carrier, partner, clock, dateLabel);
    events.push(makeCityEvent(clock, `preg_${carrier.id}`, {
      type: 'pregnancy', citizenId: carrier.id, citizenName: carrier.name,
      title: 'Couple Expecting Child', detail: `${carrier.name} and ${partner.name} are expecting a child (due in 60 days).`,
    }));
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'pregnancy',
      subjectId: carrier.id, subjectKind: 'citizen', subjectName: carrier.name,
      summary: `${carrier.name} and ${partner.name} expecting a child (due Day ${preg.dueDay})`,
      detail: { carrierId: carrier.id, partnerId: partner.id, dueDay: preg.dueDay, combinedSavings: a.savings + b.savings },
    });
  }
}
