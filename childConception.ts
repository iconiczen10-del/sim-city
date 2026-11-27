// childConception.ts — Guaranteed married conception (100d + age delay), spaced later children (120-300d), compulsory 60d pregnancy

import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { ensureFamilyState } from './familyTreeEngine';
import { recordSimEvent } from './recordsStore';
import { simRandInt } from './rng';
import { recordPost } from './sharityPosting';
import type { Citizen, CityEvent, CityState } from './types';

function postPregnancySharity(city: CityState, author: Citizen, partner: Citizen, clock: SimClock, dateLabel: string): void {
  const prof = city.sharity.profiles[author.id];
  if (!prof || !author.alive) return;
  recordPost(city.sharity, {
    id: `post_preg_${clock.totalDays}_${author.id}`, authorId: author.id, handle: prof.handle, createdDay: clock.totalDays, dateLabel,
    topic: 'celebrations', triggerKey: 'pregnancy', voice: 'hopeful', sentiment: 'positive',
    text: `${partner.name} and I are expecting a child! Preparing our home for a new chapter in Vij.`,
    hashtags: ['#VijFamily', '#NewBeginnings'], mentions: [], urgencyWeight: 74,
    why: { trigger: 'Expecting a child', gateScores: { sociability: author.traits.sociability, eventStrength: 74, socialNeed: 60, moodSwing: 20, postWeight: 74 }, voiceReason: 'Family milestone', templateId: 'fam_pregnancy', styleNote: 'Expecting child' },
    likes: 0, dislikes: 0, replies: 0, reposts: 0, score: 85,
  }, clock, dateLabel);
}

export function scheduleFirstConception(a: Citizen, b: Citizen, clock: SimClock, dateLabel: string): void {
  const ra = a.relationship;
  const rb = b.relationship;
  if (!ra || !rb) return;
  const avgAge = (a.age + b.age) / 2;
  const extraDelay = avgAge <= 30 ? 0 : avgAge <= 40 ? simRandInt(10, 40) : simRandInt(60, 150);
  const marriedDay = ra.marriedSinceDay ?? ra.stageSinceDay;
  const targetDay = Math.max(clock.totalDays, marriedDay + 100 + extraDelay);
  const note = extraDelay === 0
    ? `First child: Day ${targetDay} (100d rule, avg age <=30)`
    : `First child: Day ${targetDay} (100d + ${extraDelay}d age delay)`;
  ra.nextConceptionDay = targetDay; rb.nextConceptionDay = targetDay;
  ra.conceptionRuleNote = note; rb.conceptionRuleNote = note;
  recordSimEvent({
    simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'conception_scheduled',
    subjectId: a.id, subjectKind: 'citizen', subjectName: a.name,
    summary: `${a.name} & ${b.name} first child window scheduled for Day ${targetDay} (${extraDelay === 0 ? '100d' : `100d + ${extraDelay}d`})`,
    detail: { partnerA: a.id, partnerB: b.id, avgAge: Math.round(avgAge), extraDelay, targetDay },
  });
}

export function scheduleNextConceptionAfterBirth(p1: Citizen, p2: Citizen, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  const canContinue = p1.alive && p2.alive && p1.relationship?.stage === 'married' && p2.relationship?.stage === 'married'
    && p1.relationship.partnerId === p2.id && p1.age <= 54 && p2.age <= 54;
  if (!canContinue) {
    for (const p of [p1, p2]) {
      if (p.relationship) { p.relationship.nextConceptionDay = undefined; p.relationship.conceptionRuleNote = undefined; }
    }
    return;
  }
  const avgAge = (p1.age + p2.age) / 2;
  const spacing = avgAge <= 30 ? simRandInt(120, 185) : avgAge <= 40 ? simRandInt(165, 240) : simRandInt(215, 300);
  const nextDay = clock.totalDays + spacing;
  const note = `Next child window: Day ${nextDay} (${spacing}d spacing, avg age ${Math.round(avgAge)})`;
  for (const p of [p1, p2]) {
    p.relationship!.lastBirthDayInMarriage = clock.totalDays;
    p.relationship!.nextConceptionDay = nextDay;
    p.relationship!.conceptionRuleNote = note;
  }
  events.push(makeCityEvent(clock, `nchild_${p1.id}_${clock.totalDays}`, {
    type: 'pregnancy', citizenId: p1.id, citizenName: p1.name,
    title: 'Next Child Window Scheduled', detail: `${p1.name} and ${p2.name} scheduled next conception in ${spacing} days (Day ${nextDay}).`,
  }));
  recordSimEvent({
    simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'next_child_scheduled',
    subjectId: p1.id, subjectKind: 'citizen', subjectName: p1.name,
    summary: `${p1.name} & ${p2.name} next child spaced +${spacing}d (Day ${nextDay})`,
    detail: { partnerA: p1.id, partnerB: p2.id, avgAge: Math.round(avgAge), spacingDays: spacing, nextConceptionDay: nextDay },
  });
}

export function stepConceptionAndPregnancyDaily(city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  const fam = ensureFamilyState(city);
  const byId = new Map(city.citizens.map((c) => [c.id, c]));

  for (const preg of fam.pregnancies) {
    const c1 = byId.get(preg.carrierId);
    const c2 = byId.get(preg.partnerId);
    const combinedSav = (c1?.alive ? c1.savings : 0) + (c2?.alive ? c2.savings : 0);
    for (const p of [c1, c2]) {
      if (!p || !p.alive) continue;
      if (p.roleLevel === 'Unemployed' && p.age >= 25) p.jobHunting = true;
      if (combinedSav < 5000) p.stress = Math.round(clamp(p.stress + 1.2, 0, 100) * 10) / 10;
      if (p.housingPrefs && (p.housingPrefs.preferredType === 'shared_room' || p.housingPrefs.preferredType === 'small_flat')) {
        p.housingPrefs.preferredType = 'apartment';
      }
    }
  }

  const seen = new Set<string>();
  for (const a of city.citizens) {
    if (!a.alive || a.relationship?.stage !== 'married' || !a.relationship.partnerId) continue;
    if (seen.has(a.id) || seen.has(a.relationship.partnerId)) continue;
    const b = byId.get(a.relationship.partnerId);
    if (!b || !b.alive || b.relationship?.stage !== 'married' || b.relationship.partnerId !== a.id) continue;
    seen.add(a.id); seen.add(b.id);

    const alreadyPreg = fam.pregnancies.some((p) => p.carrierId === a.id || p.partnerId === a.id || p.carrierId === b.id || p.partnerId === b.id);
    if (alreadyPreg) continue;

    if (a.age > 54 || b.age > 54) {
      a.relationship.nextConceptionDay = undefined; b.relationship.nextConceptionDay = undefined;
      continue;
    }

    if (a.relationship.nextConceptionDay === undefined) {
      if (a.relationship.lastBirthDayInMarriage !== undefined) scheduleNextConceptionAfterBirth(a, b, clock, dateLabel, events);
      else scheduleFirstConception(a, b, clock, dateLabel);
    }
    if (a.relationship.nextConceptionDay === undefined || clock.totalDays < a.relationship.nextConceptionDay) continue;

    const carrier = a.gender === 'Female' ? a : b.gender === 'Female' ? b : a;
    const partner = carrier.id === a.id ? b : a;
    const preg = {
      id: `preg_${clock.totalDays}_${carrier.id}`, carrierId: carrier.id, partnerId: partner.id,
      familyId: carrier.familyId ?? `fam_${carrier.id}`, conceivedDay: clock.totalDays, dueDay: clock.totalDays + 60,
    };
    fam.pregnancies.push(preg);
    carrier.pregnancy = preg; partner.pregnancy = preg;
    carrier.relationship!.nextConceptionDay = undefined; partner.relationship!.nextConceptionDay = undefined;
    carrier.relationship!.conceptionRuleNote = undefined; partner.relationship!.conceptionRuleNote = undefined;

    postPregnancySharity(city, carrier, partner, clock, dateLabel);
    events.push(makeCityEvent(clock, `preg_${carrier.id}_${clock.totalDays}`, {
      type: 'pregnancy', citizenId: carrier.id, citizenName: carrier.name,
      title: 'Couple Expecting Child', detail: `${carrier.name} and ${partner.name} conceived and are expecting a child (due Day ${preg.dueDay}).`,
    }));
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'pregnancy',
      subjectId: carrier.id, subjectKind: 'citizen', subjectName: carrier.name,
      summary: `${carrier.name} and ${partner.name} expecting a child (due Day ${preg.dueDay})`,
      detail: { carrierId: carrier.id, partnerId: partner.id, conceivedDay: clock.totalDays, dueDay: preg.dueDay, childNumber: (carrier.childrenIds?.length ?? 0) + 1 },
    });
  }
}
