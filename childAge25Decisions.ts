// childAge25Decisions.ts — Age 25 life path choices, parent capital requests, housing separation, and empty-nest downsizing

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { applyEmotionPulse } from './citizenEmotions';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { syncCitizenHousingLinks } from './housingScores';
import { recordSimEvent } from './recordsStore';
import { adjustAffinity } from './sharityAffinity';
import { recordPost } from './sharityPosting';
import type { Citizen, CityEvent, CityState } from './types';

function moveOutToOwnPlace(child: Citizen, city: CityState): boolean {
  const houses = city.housing.houses;
  for (const h of houses) h.occupantIds = h.occupantIds.filter((id) => id !== child.id);
  const affordable = houses
    .filter((h) => !h.condemned && h.occupantIds.length < h.capacity && child.savings >= h.rentPrice)
    .sort((a, b) => a.rentPrice - b.rentPrice);
  const target = affordable[0] ?? houses.find((h) => !h.condemned && h.type === 'shared_room' && h.occupantIds.length < h.capacity);
  if (target) target.occupantIds.push(child.id);
  syncCitizenHousingLinks(city.citizens, houses, city.sharity);
  return Boolean(target);
}

export function resolveAge25Transition(child: Citizen, parents: Citizen[], city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  const bond = child.parentBond ?? { love: 60, financialTension: 20, independenceTension: 35, gratitude: 50 };
  const cap = child.capabilityScore ?? 50;
  const livingParents = parents.filter((p) => p.alive);
  const parentSavings = livingParents.reduce((s, p) => s + p.savings, 0);

  const scores = {
    leave_independent: cap * 0.6 + bond.gratitude * 0.25 + (child.savings > 400 ? 22 : 0) + (child.traits.discipline - 40) * 0.3,
    stay_home: bond.love * 0.5 + (100 - bond.independenceTension) * 0.35 + (child.savings < 300 ? 18 : 0) - child.traits.pride * 0.15,
    leave_tension: bond.independenceTension * 0.55 + bond.financialTension * 0.35 + (100 - bond.love) * 0.2,
    leave_conflict: (bond.financialTension >= 55 && bond.love < 45 ? 48 : 10) + (100 - child.traits.patience) * 0.35,
    ask_large_sum: (parentSavings > 4500 && child.traits.ambition >= 55 ? 42 : 12) + child.traits.greed * 0.3 + cap * 0.2,
  };
  const chosen = (Object.entries(scores) as [keyof typeof scores, number][]).sort((a, b) => b[1] - a[1])[0][0];

  let summaryText = '';
  let chosenLabel = '';
  if (chosen === 'stay_home') {
    child.youngAdultPhase = 'stay_home';
    chosenLabel = 'Stay Home With Parents';
    summaryText = `Turned 25 and stayed in the family home with mutual warmth.`;
    for (const p of livingParents) adjustAffinity(city.sharity, child.id, p.id, 6);
  } else if (chosen === 'ask_large_sum') {
    child.youngAdultPhase = 'independent';
    chosenLabel = 'Request Launch Sum & Move Out';
    const askAmt = Math.min(3500, Math.max(1200, Math.round(parentSavings * 0.25)));
    const donor = [...livingParents].sort((a, b) => b.savings - a.savings)[0];
    const donorAccepts = Boolean(donor && donor.savings >= askAmt + 600 && (donor.traits.kindness >= 45 || donor.traits.greed < 65));
    if (donor && donorAccepts) {
      donor.savings = Math.round((donor.savings - askAmt) * 100) / 100;
      child.savings = Math.round((child.savings + askAmt) * 100) / 100;
      appendLedgerEntry(donor, clock.totalDays, dateLabel, 'expense', 'Family Launch', `Gifted launch funds to ${child.name}`, askAmt);
      appendLedgerEntry(child, clock.totalDays, dateLabel, 'income', 'Family Launch', `Received launch funds from ${donor.name}`, askAmt);
      summaryText = `Turned 25, requested ${formatDelta(askAmt)} launch support (accepted by ${donor.name}), and moved out.`;
    } else {
      bond.financialTension = Math.round(clamp(bond.financialTension + 18, 0, 100));
      summaryText = `Turned 25, requested ${formatDelta(askAmt)} launch support (declined), and moved out on own.`;
    }
    moveOutToOwnPlace(child, city);
  } else if (chosen === 'leave_conflict') {
    child.youngAdultPhase = 'independent';
    chosenLabel = 'Leave in Conflict';
    moveOutToOwnPlace(child, city);
    for (const p of livingParents) {
      adjustAffinity(city.sharity, child.id, p.id, -24);
      applyEmotionPulse(p.emotions, 'anger', 16, `Conflict as ${child.name} left home`, clock, dateLabel);
    }
    const prof = city.sharity.profiles[child.id];
    if (prof) {
      recordPost(city.sharity, {
        id: `post_c25_${clock.totalDays}_${child.id}`, authorId: child.id, handle: prof.handle, createdDay: clock.totalDays, dateLabel,
        topic: 'social_drama', triggerKey: 'leave_conflict', voice: 'angry', sentiment: 'negative',
        text: `Finally out on my own at 25. Enough tension under one roof — starting completely fresh.`, hashtags: ['#Vij'], mentions: [], urgencyWeight: 68,
        why: { trigger: 'Left home in conflict', gateScores: { sociability: child.traits.sociability, eventStrength: 68, socialNeed: 50, moodSwing: 20, postWeight: 68 }, voiceReason: 'Family conflict', templateId: 'child_leave_conflict', styleNote: 'Age 25 exit' },
        likes: 0, dislikes: 0, replies: 0, reposts: 0, score: 70,
      }, clock, dateLabel);
    }
    summaryText = `Left the family home at 25 after sharp conflict.`;
  } else if (chosen === 'leave_tension') {
    child.youngAdultPhase = 'independent';
    chosenLabel = 'Move Out With Tension';
    moveOutToOwnPlace(child, city);
    for (const p of livingParents) adjustAffinity(city.sharity, child.id, p.id, -10);
    summaryText = `Turned 25 and moved out to gain space from mounting household tension.`;
  } else {
    child.youngAdultPhase = 'independent';
    chosenLabel = 'Move Out Independently';
    moveOutToOwnPlace(child, city);
    for (const p of livingParents) adjustAffinity(city.sharity, child.id, p.id, 4);
    summaryText = `Turned 25, stepped into full independence, and moved into own place (capability ${cap}).`;
  }

  for (const p of livingParents) {
    if (p.housingPrefs && (p.housingPrefs.preferredType === 'villa' || p.housingPrefs.preferredType === 'mansion') && (p.childrenIds ?? []).every((id) => id === child.id || city.citizens.find((c) => c.id === id)?.youngAdultPhase === 'independent')) {
      p.housingPrefs.preferredType = 'apartment';
    }
  }
  child.jobHunting = true;
  appendLifeLog(child, clock.totalDays, dateLabel, 'mood', summaryText);
  recordConsequentialDecision({
    citizen: child, clock, dateLabel, kind: 'child_launch', category: 'family',
    title: 'Age 25 Independence Decision', chosenOption: chosenLabel, altOption: chosen === 'stay_home' ? 'Move Out' : 'Stay Home',
    chosenReason: summaryText, chosenFactors: [{ label: 'Capability', value: Math.round(cap) }, { label: 'Bond Love', value: Math.round(bond.love) }],
    altFactors: [{ label: 'Comfort / Friction', value: Math.round(bond.independenceTension) }], diarySentence: summaryText,
  });
  events.push(makeCityEvent(clock, `c25_${child.id}`, { type: 'child-adult', citizenId: child.id, citizenName: child.name, title: 'Young Adult Turned 25', detail: `${child.name}: ${chosenLabel}.` }));
  recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'child_age_25', subjectId: child.id, subjectKind: 'citizen', subjectName: child.name, summary: `${child.name} reached 25: ${chosenLabel}`, detail: { choice: chosen, capabilityScore: cap, bond, summary: summaryText } });
}
