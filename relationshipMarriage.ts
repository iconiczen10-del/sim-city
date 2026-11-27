// relationshipMarriage.ts — Cohabitation housing merge, marriage proposals, accept/decline decisions, breakups, and Sharity announcements

import { scheduleFirstConception } from './childConception';
import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { applyEmotionPulse } from './citizenEmotions';
import { appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { ensureFamilyState, linkMarriageInFamilyTree } from './familyTreeEngine';
import { syncCitizenHousingLinks } from './housingScores';
import { recordSimEvent } from './recordsStore';
import { simRand } from './rng';
import { adjustAffinity, getAffinity } from './sharityAffinity';
import { recordPost } from './sharityPosting';
import type { Citizen, CityEvent, CityState } from './types';

function postFamilySharity(city: CityState, author: Citizen, key: string, text: string, sentiment: 'positive' | 'negative', clock: SimClock, dateLabel: string): void {
  const prof = city.sharity.profiles[author.id];
  if (!prof || !author.alive) return;
  recordPost(city.sharity, {
    id: `post_fam_${key}_${clock.totalDays}_${author.id}`,
    authorId: author.id, handle: prof.handle, createdDay: clock.totalDays, dateLabel,
    topic: sentiment === 'positive' ? 'celebrations' : 'social_drama',
    triggerKey: key, voice: sentiment === 'positive' ? 'hopeful' : 'anxious', sentiment,
    text, hashtags: ['#VijLife'], mentions: [], urgencyWeight: 72,
    why: { trigger: key.replace(/_/g, ' '), gateScores: { sociability: author.traits.sociability, eventStrength: 72, socialNeed: 60, moodSwing: 20, postWeight: 72 }, voiceReason: 'Major personal milestone', templateId: `fam_${key}`, styleNote: 'Life event' },
    likes: 0, dislikes: 0, replies: 0, reposts: 0, score: 80,
  }, clock, dateLabel);
}

export function moveCoupleTogether(a: Citizen, b: Citizen, city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[], keepMarried = false): boolean {
  const houses = city.housing.houses;
  const ha = a.homeId ? houses.find((h) => h.id === a.homeId) : undefined;
  const hb = b.homeId ? houses.find((h) => h.id === b.homeId) : undefined;
  let target = (hb && (!ha || hb.capacity > ha.capacity || hb.ownerId === b.id)) ? hb : ha;
  if (!target || target.capacity < 2 || target.occupantIds.length >= target.capacity) {
    target = houses.find((h) => !h.condemned && h.capacity >= 2 && h.occupantIds.length === 0 && (a.savings + b.savings >= h.rentPrice * 2))
      ?? houses.find((h) => !h.condemned && h.capacity >= 2 && h.occupantIds.length < h.capacity)
      ?? target;
  }
  if (!target) return false;
  for (const h of houses) {
    if (h.id !== target.id) h.occupantIds = h.occupantIds.filter((id) => id !== a.id && id !== b.id);
  }
  if (!target.occupantIds.includes(a.id)) target.occupantIds.push(a.id);
  if (!target.occupantIds.includes(b.id)) target.occupantIds.push(b.id);
  syncCitizenHousingLinks(city.citizens, houses, city.sharity);

  for (const p of [a, b]) {
    const other = p.id === a.id ? b : a;
    if (!keepMarried) p.relationship!.stage = 'cohabiting';
    p.relationship!.stageSinceDay = clock.totalDays;
    p.relationship!.cohabitingSinceDay = p.relationship!.cohabitingSinceDay ?? clock.totalDays;
    appendLifeLog(p, clock.totalDays, dateLabel, 'mood', `Moved in with ${other.name} at ${target.name}.`);
    recordConsequentialDecision({
      citizen: p, clock, dateLabel, kind: 'cohabitation', category: 'family',
      title: `Move In With ${other.name}`, chosenOption: `Share ${target.name}`, altOption: 'Keep Separate Homes',
      chosenReason: `Strong bond and shared housing savings made living together natural.`,
      chosenFactors: [{ label: 'Affinity', value: getAffinity(city.sharity, a.id, b.id) }, { label: 'Shared Rent', value: 18 }],
      altFactors: [{ label: 'Privacy', value: 14 }], diarySentence: `Moved in together with ${other.name} at ${target.name}.`,
    });
  }
  events.push(makeCityEvent(clock, `cohab_${a.id}_${b.id}`, { type: 'courtship', citizenId: a.id, citizenName: a.name, title: 'Couple Moved In Together', detail: `${a.name} and ${b.name} are now cohabiting at ${target.name}.` }));
  recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'cohabitation', subjectId: a.id, subjectKind: 'citizen', subjectName: a.name, summary: `${a.name} and ${b.name} moved in together at ${target.name}`, detail: { partnerA: a.id, partnerB: b.id, houseId: target.id, houseName: target.name } });
  return true;
}

export function triggerBreakup(a: Citizen, b: Citizen, reason: string, city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  for (const [p, other] of [[a, b], [b, a]] as const) {
    if (!p.relationship) continue;
    p.relationship = { ...p.relationship, stage: 'single', partnerId: null, stageSinceDay: clock.totalDays, exPartnerIds: [...new Set([...p.relationship.exPartnerIds, other.id])] };
    p.mood = Math.round(clamp(p.mood - 14, 0, 100) * 10) / 10;
    p.stress = Math.round(clamp(p.stress + 12, 0, 100) * 10) / 10;
    applyEmotionPulse(p.emotions, 'sadness', 28, `Broke up with ${other.name}`, clock, dateLabel);
    addCitizenMemory(p, clock, dateLabel, 'heartbreak', `Ended relationship with ${other.name}: ${reason}.`, -32);
    appendLifeLog(p, clock.totalDays, dateLabel, 'mood', `Broke up with ${other.name} (${reason}).`);
    recordConsequentialDecision({
      citizen: p, clock, dateLabel, kind: 'breakup', category: 'family',
      title: `Breakup With ${other.name}`, chosenOption: 'Part Ways', altOption: 'Keep Trying',
      chosenReason: reason, chosenFactors: [{ label: 'Strain / Clash', value: 26 }], altFactors: [{ label: 'History', value: 14 }],
      diarySentence: `Ended relationship with ${other.name}.`,
    });
  }
  adjustAffinity(city.sharity, a.id, b.id, -28);
  postFamilySharity(city, a, 'breakup', `Stepping back to focus on myself after parting ways. Some chapters close for a reason.`, 'negative', clock, dateLabel);
  events.push(makeCityEvent(clock, `brk_${a.id}_${b.id}`, { type: 'breakup', citizenId: a.id, citizenName: a.name, title: 'Couple Broke Up', detail: `${a.name} and ${b.name} ended their relationship (${reason}).` }));
  recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'breakup', subjectId: a.id, subjectKind: 'citizen', subjectName: a.name, summary: `${a.name} and ${b.name} broke up: ${reason}`, detail: { partnerA: a.id, partnerB: b.id, reason } });
}

export function attemptMarriageProposal(a: Citizen, b: Citizen, city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  const aff = getAffinity(city.sharity, a.id, b.id);
  const compat = a.relationship?.compatibility ?? 65;
  const acceptScore = aff * 0.6 + compat * 0.5 + (b.traits.loyalty - 50) * 0.35 + (b.mood - 50) * 0.25;
  const fearPenalty = (b.savings + a.savings < 600 ? 22 : 0) + (b.stress > 75 ? 16 : 0) + (100 - b.traits.loyalty) * 0.2;
  const accepted = acceptScore >= 62 + fearPenalty * 0.35;

  if (!accepted) {
    const declineReason = b.savings + a.savings < 600 ? 'worried about financial stability' : b.stress > 75 ? 'overwhelmed by stress' : 'not ready for marriage yet';
    recordConsequentialDecision({
      citizen: b, clock, dateLabel, kind: 'marriage_proposal', category: 'family',
      title: `Marriage Proposal From ${a.name}`, chosenOption: 'Decline For Now', altOption: 'Accept Marriage',
      chosenReason: `Declined because ${b.name} is ${declineReason}.`,
      chosenFactors: [{ label: 'Caution', value: Math.round(fearPenalty + 20) }], altFactors: [{ label: 'Bond', value: Math.round(acceptScore) }],
      diarySentence: `Turned down ${a.name}'s marriage proposal (${declineReason}).`,
    });
    adjustAffinity(city.sharity, a.id, b.id, -14);
    if (simRand() < 0.45) triggerBreakup(a, b, `declined marriage proposal (${declineReason})`, city, clock, dateLabel, events);
    else { a.relationship!.stageSinceDay = clock.totalDays; b.relationship!.stageSinceDay = clock.totalDays; }
    return;
  }

  const total = a.savings + b.savings;
  const pooledEach = Math.round(total / 2);
  a.savings = pooledEach;
  b.savings = Math.round(total - pooledEach);
  const fam = ensureFamilyState(city);
  linkMarriageInFamilyTree(fam, a, b);

  for (const [p, other] of [[a, b], [b, a]] as const) {
    p.relationship = { ...p.relationship!, stage: 'married', partnerId: other.id, stageSinceDay: clock.totalDays, marriedSinceDay: clock.totalDays, lastBirthDayInMarriage: undefined, nextConceptionDay: undefined, conceptionRuleNote: undefined };
    p.mood = Math.round(clamp(p.mood + 18, 0, 100) * 10) / 10;
    p.healthProfile.mental = Math.round(clamp(p.healthProfile.mental + 14, 0, 100) * 10) / 10;
    p.respect = Math.round(clamp(p.respect + 4, 0, 100) * 10) / 10;
    if (p.housingPrefs && (p.housingPrefs.preferredType === 'shared_room' || p.housingPrefs.preferredType === 'small_flat')) p.housingPrefs.preferredType = 'apartment';
    applyEmotionPulse(p.emotions, 'joy', 36, `Married ${other.name}`, clock, dateLabel);
    applyEmotionPulse(p.emotions, 'gratitude', 28, `Partnered with ${other.name}`, clock, dateLabel);
    applyEmotionPulse(p.emotions, 'hope', 24, 'Starting married life together', clock, dateLabel);
    addCitizenMemory(p, clock, dateLabel, 'marriage', `Married ${other.name} on ${dateLabel}.`, 48);
    appendLifeLog(p, clock.totalDays, dateLabel, 'mood', `Married ${other.name}!`);
    recordConsequentialDecision({
      citizen: p, clock, dateLabel, kind: 'marriage_proposal', category: 'family',
      title: `Marry ${other.name}`, chosenOption: 'Accept & Marry', altOption: 'Stay Unmarried',
      chosenReason: `High compatibility (${Math.round(compat)}) and mutual affinity (${aff}).`,
      chosenFactors: [{ label: 'Love & Compatibility', value: Math.round(acceptScore) }], altFactors: [{ label: 'Independence', value: 18 }],
      diarySentence: `Got married to ${other.name}.`,
    });
  }
  if (a.age <= 54 && b.age <= 54) scheduleFirstConception(a, b, clock, dateLabel);
  if (!a.homeId || a.homeId !== b.homeId) moveCoupleTogether(a, b, city, clock, dateLabel, events, true);
  adjustAffinity(city.sharity, a.id, b.id, 18);
  const compMsg = a.employerId ? ` Congratulations from ${city.companies.find((co) => co.id === a.employerId)?.name ?? 'colleagues'}!` : '';
  postFamilySharity(city, a, 'marriage', `Overjoyed to share that ${b.name} and I just got married! Here is to our future in Vij.`, 'positive', clock, dateLabel);
  events.push(makeCityEvent(clock, `mar_${a.id}_${b.id}`, { type: 'marriage', citizenId: a.id, citizenName: a.name, companyId: a.employerId ?? undefined, title: 'City Wedding', detail: `${a.name} and ${b.name} got married!${compMsg}` }));
  recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'marriage', subjectId: a.id, subjectKind: 'citizen', subjectName: a.name, summary: `${a.name} married ${b.name} (combined savings ∆${(a.savings + b.savings).toLocaleString('en-IN')})`, detail: { spouseA: a.id, spouseB: b.id, affinity: aff, compatibility: compat, combinedSavings: a.savings + b.savings } });
}
