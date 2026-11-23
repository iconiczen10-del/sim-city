// sharityMoodSync.ts — Applies and reconciles Sharity mood and stress factor lines with exact breakdown sums

import type { SharityFactorLine, SignedFactor } from './citizenInspectorTypes';
import { clamp } from './economy';
import type { Citizen } from './types';

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

function upsertLine(lines: SharityFactorLine[] | undefined, next: SharityFactorLine): SharityFactorLine[] {
  const arr = [...(lines ?? [])];
  const idx = arr.findIndex((l) => l.label === next.label && l.postId === next.postId);
  if (idx >= 0) {
    arr[idx] = { ...arr[idx], value: r1(clamp(arr[idx].value + next.value, -24, 24)), decayRate: next.decayRate };
  } else {
    arr.unshift(next);
  }
  return arr.slice(0, 8);
}

function syncBreakdown(
  existing: SignedFactor[],
  label: string,
  delta: number,
  targetTotal: number,
  residualLabel: string
): SignedFactor[] {
  const list = existing.filter((f) => f.label !== residualLabel).map((f) => ({ ...f }));
  const idx = list.findIndex((f) => f.label === label);
  if (idx >= 0) list[idx].value = r1(list[idx].value + delta);
  else list.push({ label, value: r1(delta) });

  const sum = list.reduce((s, f) => s + f.value, 0);
  const gap = r1(targetTotal - sum);
  if (Math.abs(gap) >= 0.1) list.push({ label: residualLabel, value: gap });
  return list;
}

export function applySharityMoodStressShock(
  citizen: Citizen,
  params: { id: string; label: string; moodDelta: number; stressDelta: number; decayRate?: number; postId?: string }
): void {
  const { id, label, moodDelta, stressDelta, decayRate = 0.78, postId } = params;
  if (Math.abs(moodDelta) >= 0.2) {
    citizen.sharityMoodLines = upsertLine(citizen.sharityMoodLines, { id: `${id}_m`, label, value: r1(moodDelta), decayRate, postId });
    citizen.mood = r1(clamp(citizen.mood + moodDelta, 0, 100));
    citizen.moodCrashed = citizen.mood < 25;
    citizen.moodBreakdown = syncBreakdown(citizen.moodBreakdown, label, moodDelta, citizen.mood, 'Daily Drift & Inertia');
  }
  if (Math.abs(stressDelta) >= 0.2) {
    citizen.sharityStressLines = upsertLine(citizen.sharityStressLines, { id: `${id}_s`, label, value: r1(stressDelta), decayRate, postId });
    citizen.stress = r1(clamp(citizen.stress + stressDelta, 0, 100));
    citizen.stressBreakdown = syncBreakdown(citizen.stressBreakdown, label, stressDelta, citizen.stress, 'Daily Recovery / Momentum');
  }
}
