// gjSubsidyActions.ts — CEO subsidy mood controls and SimGod mood/level overrides for GJ Electricity

import { makeCityEvent } from './eventFactory';
import { formatSimDate } from './formatters';
import type { GJSubsidyMood, SimGodSubsidyLevel } from './gjSubsidyTypes';
import { recordSimEvent } from './recordsStore';
import type { CityState } from './types';

export function setGJSubsidyMood(prev: CityState, mood: GJSubsidyMood): CityState {
  if (!prev.electricity) return prev;
  const next = structuredClone(prev);
  const el = next.electricity!;
  el.subsidyMood = mood;
  const dl = formatSimDate(next.day, next.month, next.year);
  next.events.unshift(makeCityEvent({ totalDays: next.totalDays, day: next.day, month: next.month, year: next.year }, `gjmood_${Date.now()}`, {
    type: 'subsidy', companyId: 'gjelectricity',
    title: 'GJ Subsidy Mood Updated',
    detail: `GJ Electricity CEO set subsidy assessment mood to "${mood}".`,
  }));
  recordSimEvent({
    simDay: next.totalDays, dateLabel: dl, category: 'gjelectricity', subType: 'subsidy_mood',
    subjectId: 'gjelectricity', subjectKind: 'gjelectricity', subjectName: 'GJ Electricity',
    summary: `GJ CEO set subsidy mood to ${mood}`, detail: { mood },
  });
  return next;
}

export function setSimGodSubsidyControls(
  prev: CityState,
  opts: { moodOverride?: GJSubsidyMood | null; levelOverride?: SimGodSubsidyLevel }
): CityState {
  if (!prev.electricity) return prev;
  const next = structuredClone(prev);
  const el = next.electricity!;
  if (opts.moodOverride !== undefined) el.simgodMoodOverride = opts.moodOverride;
  if (opts.levelOverride !== undefined) el.simgodLevelOverride = opts.levelOverride;
  const dl = formatSimDate(next.day, next.month, next.year);
  recordSimEvent({
    simDay: next.totalDays, dateLabel: dl, category: 'simgod', subType: 'subsidy_override',
    subjectId: 'gjelectricity', subjectKind: 'gjelectricity', subjectName: 'GJ Electricity',
    summary: `SimGod updated GJ subsidy overrides (mood=${el.simgodMoodOverride ?? 'auto'}, level=${el.simgodLevelOverride ?? 'auto'})`,
    detail: { moodOverride: el.simgodMoodOverride, levelOverride: el.simgodLevelOverride },
  });
  return next;
}
