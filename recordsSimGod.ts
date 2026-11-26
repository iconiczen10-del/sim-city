// recordsSimGod.ts — Dedicated audit record logger for all SimGod interventions (marked SimGod, hidden from citizen tabs)

import { recordSimEvent } from './recordsStore';
import type { RecordSubjectKind } from './recordTypes';
import type { CityState } from './types';

export function recordSimGodAction(params: {
  city: CityState;
  dateLabel: string;
  targetId: string;
  targetKind: RecordSubjectKind;
  targetName: string;
  preview: string;
  cause: string;
  effect: string;
  extra?: Record<string, unknown>;
}): void {
  const { city, dateLabel, targetId, targetKind, targetName, preview, cause, effect, extra } = params;
  recordSimEvent({
    simDay: city.totalDays,
    dateLabel,
    category: 'simgod',
    subType: 'simgod_power',
    subjectId: targetId,
    subjectKind: targetKind,
    subjectName: targetName,
    summary: `[SimGod] ${preview} — ${effect}`,
    detail: {
      time: `Day ${city.totalDays} (${dateLabel})`,
      target: { id: targetId, kind: targetKind, name: targetName },
      preview,
      causeChosen: cause,
      effect,
      ...extra,
    },
    simgodMarked: true,
  });
}
