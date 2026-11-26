// recordsDiffWellbeing.ts — Post-day citizen diff recorder for 8 needs, mood, emotions, and stress

import type { CitizenPreSnap } from './recordsSnapshot';
import { recordSimEvent } from './recordsStore';
import type { Citizen } from './types';

export function diffCitizenNeeds(c: Citizen, prev: CitizenPreSnap, simDay: number, dateLabel: string): void {
  const checks: [string, number, number][] = [
    ['hunger', prev.hunger, Math.round(c.hunger)],
    ['thirst', prev.thirst, Math.round(c.thirst)],
    ['energy', prev.energy, Math.round(c.needs.energy.value)],
    ['hygiene', prev.hygiene, Math.round(c.needs.hygiene.value)],
    ['safety', prev.safety, Math.round(c.needs.safety.value)],
    ['social', prev.social, Math.round(c.needs.social.value)],
    ['fun', prev.fun, Math.round(c.needs.fun.value)],
    ['shelter', prev.shelter, Math.round(c.needs.shelter.value)],
  ];
  const changes: Record<string, { from: number; to: number }> = {};
  for (const [key, before, after] of checks) {
    if (Math.abs(after - before) >= 5 || (before >= 30 && after < 30)) {
      changes[key] = { from: before, to: after };
    }
  }
  if (Object.keys(changes).length > 0) {
    recordSimEvent({
      simDay, dateLabel, category: 'citizens', subType: 'needs',
      subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
      summary: `${c.name} need shifts (${Object.keys(changes).join(', ')})`,
      detail: { changes },
    });
  }
}

export function diffCitizenWellbeing(c: Citizen, prev: CitizenPreSnap, simDay: number, dateLabel: string): void {
  const moodDelta = Math.round((c.mood - prev.mood) * 10) / 10;
  if (Math.abs(moodDelta) >= 2) {
    const cause = c.moodBreakdown?.[0]?.label ?? c.changeExplanations[0]?.summary ?? 'Daily life balance';
    recordSimEvent({
      simDay, dateLabel, category: 'citizens', subType: 'mood',
      subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
      summary: `${c.name} mood ${moodDelta > 0 ? `+${moodDelta}` : moodDelta} → ${Math.round(c.mood)} (${cause})`,
      detail: { from: prev.mood, to: Math.round(c.mood * 10) / 10, delta: moodDelta, cause },
    });
  }

  const emoDeltas: Record<string, number> = {};
  let emoCause = 'Daily social & life pulse';
  for (const [k, em] of Object.entries(c.emotions)) {
    const d = Math.round(em.value) - (prev.emotions[k] ?? 0);
    if (Math.abs(d) >= 4) {
      emoDeltas[k] = d;
      if (em.triggers[0]?.summary) emoCause = em.triggers[0].summary;
    }
  }
  if (Object.keys(emoDeltas).length > 0) {
    recordSimEvent({
      simDay, dateLabel, category: 'citizens', subType: 'emotion',
      subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
      summary: `${c.name} emotions shifted (${emoCause})`,
      detail: { deltas: emoDeltas, cause: emoCause },
    });
  }

  const stressDelta = Math.round((c.stress - prev.stress) * 10) / 10;
  if (Math.abs(stressDelta) >= 2) {
    const cause = c.stressBreakdown?.[0]?.label ?? 'Daily stress factors';
    recordSimEvent({
      simDay, dateLabel, category: 'citizens', subType: 'stress',
      subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
      summary: `${c.name} stress ${stressDelta > 0 ? `+${stressDelta}` : stressDelta} → ${Math.round(c.stress)} (${cause})`,
      detail: { from: prev.stress, to: Math.round(c.stress * 10) / 10, delta: stressDelta, cause },
    });
  }
}
