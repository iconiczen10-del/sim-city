// relationshipStages.ts — Stage transition engine from awareness through dating, cohabitation, and marriage proposals

import { appendLifeLog } from './citizenLedger';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { attemptMarriageProposal, moveCoupleTogether, triggerBreakup } from './relationshipMarriage';
import { recordSimEvent } from './recordsStore';
import { simRand } from './rng';
import { adjustAffinity, getAffinity } from './sharityAffinity';
import type { Citizen, CityEvent, CityState } from './types';

export function computeCompatibility(a: Citizen, b: Citizen): number {
  const traitGap = (
    Math.abs(a.traits.kindness - b.traits.kindness) +
    Math.abs(a.traits.loyalty - b.traits.loyalty) +
    Math.abs(a.traits.neatness - b.traits.neatness) +
    Math.abs(a.traits.thriftiness - b.traits.thriftiness) +
    Math.abs(a.traits.patience - b.traits.patience)
  ) / 5;
  const ageGap = Math.abs(a.age - b.age);
  const agePen = ageGap > 14 ? (ageGap - 14) * 1.4 : 0;
  return Math.round(clamp(92 - traitGap * 0.9 - agePen, 10, 98));
}

export function advanceActiveCouple(a: Citizen, b: Citizen, city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  const ra = a.relationship!;
  const rb = b.relationship!;
  const aff = getAffinity(city.sharity, a.id, b.id);
  const compat = ra.compatibility ?? computeCompatibility(a, b);
  ra.compatibility = compat;
  rb.compatibility = compat;
  const daysInStage = clock.totalDays - ra.stageSinceDay;
  const avgAge = (a.age + b.age) / 2;
  const pace = ra.paceFactor ?? (avgAge <= 30 ? 0.58 : avgAge <= 40 ? 1.0 : 1.5);

  if (ra.stage === 'awareness') {
    adjustAffinity(city.sharity, a.id, b.id, 1);
    if (aff > 65 && compat >= 50 && daysInStage >= Math.max(2, Math.round(5 * pace))) {
      ra.stage = 'interest'; rb.stage = 'interest';
      ra.stageSinceDay = clock.totalDays; rb.stageSinceDay = clock.totalDays;
    } else if (daysInStage >= Math.max(15, Math.round(25 * pace)) && aff < 45) {
      ra.stage = 'single'; ra.partnerId = null; rb.stage = 'single'; rb.partnerId = null;
    }
    return;
  }

  if (ra.stage === 'interest') {
    adjustAffinity(city.sharity, a.id, b.id, 1);
    if (daysInStage >= Math.max(3, Math.round(7 * pace)) && aff >= 68) {
      ra.stage = 'pursuit'; rb.stage = 'pursuit';
      ra.stageSinceDay = clock.totalDays; rb.stageSinceDay = clock.totalDays;
    } else if (aff < 40 || daysInStage > Math.max(18, Math.round(30 * pace))) {
      ra.stage = 'single'; ra.partnerId = null; rb.stage = 'single'; rb.partnerId = null;
    }
    return;
  }

  if (ra.stage === 'pursuit') {
    adjustAffinity(city.sharity, a.id, b.id, 1);
    if (daysInStage >= Math.max(4, Math.round(10 * pace)) && aff >= 72) {
      ra.stage = 'dating'; rb.stage = 'dating';
      ra.stageSinceDay = clock.totalDays; rb.stageSinceDay = clock.totalDays;
      ra.datingSinceDay = clock.totalDays; rb.datingSinceDay = clock.totalDays;
      appendLifeLog(a, clock.totalDays, dateLabel, 'mood', `Started dating ${b.name}.`);
      appendLifeLog(b, clock.totalDays, dateLabel, 'mood', `Started dating ${a.name}.`);
      events.push(makeCityEvent(clock, `date_${a.id}_${b.id}`, { type: 'courtship', citizenId: a.id, citizenName: a.name, title: 'New Couple Dating', detail: `${a.name} and ${b.name} started dating.` }));
      recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'dating', subjectId: a.id, subjectKind: 'citizen', subjectName: a.name, summary: `${a.name} and ${b.name} started dating`, detail: { partnerA: a.id, partnerB: b.id, affinity: aff, compatibility: compat, paceFactor: Math.round(pace * 100) / 100 } });
    } else if (aff < 42 || daysInStage > Math.max(20, Math.round(35 * pace))) {
      ra.stage = 'single'; ra.partnerId = null; rb.stage = 'single'; rb.partnerId = null;
    }
    return;
  }

  if (ra.stage === 'dating') {
    if (aff < 32 || (compat < 45 && (a.stress > 78 || b.stress > 78) && simRand() < 0.08)) {
      triggerBreakup(a, b, aff < 32 ? 'faded affinity' : 'stress and incompatibility', city, clock, dateLabel, events);
      return;
    }
    const datingDays = clock.totalDays - (ra.datingSinceDay ?? ra.stageSinceDay);
    const moveEarly = (a.traits.impulsiveness > 72 || b.traits.impulsiveness > 72 || a.homeId === null || b.homeId === null) && datingDays >= Math.max(12, Math.round(35 * pace));
    if (datingDays >= Math.max(18, Math.round(60 * pace)) && (moveEarly || datingDays >= Math.max(24, Math.round(75 * pace)) || simRand() < Math.min(0.2, 0.06 / pace))) {
      moveCoupleTogether(a, b, city, clock, dateLabel, events);
    }
    return;
  }

  if (ra.stage === 'cohabiting') {
    if (Math.abs(a.traits.neatness - b.traits.neatness) > 48 && simRand() < 0.12) {
      adjustAffinity(city.sharity, a.id, b.id, -2);
    } else if (aff >= 60) {
      a.mood = Math.round(clamp(a.mood + 0.4, 0, 100) * 10) / 10;
      b.mood = Math.round(clamp(b.mood + 0.4, 0, 100) * 10) / 10;
    }
    if (aff < 28) { triggerBreakup(a, b, 'cohabitation conflicts', city, clock, dateLabel, events); return; }
    const datingDays = clock.totalDays - (ra.datingSinceDay ?? ra.stageSinceDay);
    const cohabDays = clock.totalDays - (ra.cohabitingSinceDay ?? ra.stageSinceDay);
    if (datingDays >= Math.max(28, Math.round(90 * pace)) && cohabDays >= Math.max(10, Math.round(30 * pace)) && (cohabDays >= Math.max(22, Math.round(60 * pace)) || simRand() < Math.min(0.25, 0.06 / pace))) {
      attemptMarriageProposal(a, b, city, clock, dateLabel, events);
    }
  }
}
