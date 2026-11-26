// recordsDiff.ts — Citizen diff recorder for health, breakdowns, traits, living standards, and homelessness

import { formatSimDate } from './formatters';
import { diffCitizenNeeds, diffCitizenWellbeing } from './recordsDiffWellbeing';
import type { PreDaySnapshot } from './recordsSnapshot';
import { recordSimEvent } from './recordsStore';
import type { CityState } from './types';

export function diffCitizensPostDay(snap: PreDaySnapshot, city: CityState): void {
  const simDay = city.totalDays;
  const dateLabel = formatSimDate(city.day, city.month, city.year);

  for (const c of city.citizens) {
    const prev = snap.citizens.get(c.id);
    if (!prev || (!prev.alive && !c.alive)) continue;

    diffCitizenWellbeing(c, prev, simDay, dateLabel);
    diffCitizenNeeds(c, prev, simDay, dateLabel);

    const hp = c.healthProfile;
    const illNow = hp.illnessDaysLeft ?? 0;
    const breakdownNow = Boolean(hp.breakdownUntilDay && hp.breakdownUntilDay >= simDay);
    if (
      Math.abs(Math.round(hp.physical) - prev.physical) >= 3
      || Math.abs(Math.round(hp.mental) - prev.mental) >= 3
      || Math.abs(Math.round(hp.immunity) - prev.immunity) >= 3
      || Math.abs(Math.round(hp.fitness) - prev.fitness) >= 3
      || (prev.illnessDaysLeft === 0 && illNow > 0)
      || (prev.illnessDaysLeft > 0 && illNow === 0)
      || prev.inBreakdown !== breakdownNow
    ) {
      recordSimEvent({
        simDay, dateLabel, category: 'citizens', subType: 'health',
        subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
        summary: !prev.inBreakdown && breakdownNow
          ? `${c.name} suffered breakdown (mental ${Math.round(hp.mental)})`
          : prev.inBreakdown && !breakdownNow
            ? `${c.name} recovered from mental breakdown`
            : illNow > prev.illnessDaysLeft
              ? `${c.name} fell ill (${hp.illnessName ?? 'sickness'}, ${illNow}d)`
              : prev.illnessDaysLeft > 0 && illNow === 0
                ? `${c.name} recovered from illness`
                : `${c.name} health metrics updated (phys ${Math.round(hp.physical)}, mental ${Math.round(hp.mental)})`,
        detail: {
          physical: { from: prev.physical, to: Math.round(hp.physical) },
          mental: { from: prev.mental, to: Math.round(hp.mental) },
          immunity: { from: prev.immunity, to: Math.round(hp.immunity) },
          fitness: { from: prev.fitness, to: Math.round(hp.fitness) },
          illnessDaysLeft: illNow,
          inBreakdown: breakdownNow,
        },
      });
    }

    const traitChanges: Record<string, { from: number; to: number }> = {};
    for (const [tk, tv] of Object.entries(c.traits as unknown as Record<string, number>)) {
      if (prev.traits[tk] !== undefined && prev.traits[tk] !== tv) traitChanges[tk] = { from: prev.traits[tk], to: tv };
    }
    if (Object.keys(traitChanges).length > 0) {
      recordSimEvent({
        simDay, dateLabel, category: 'citizens', subType: 'trait',
        subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
        summary: `${c.name} experience shifted traits (${Object.keys(traitChanges).join(', ')})`,
        detail: { traitChanges },
      });
    }

    for (const cat of ['food', 'water', 'clothes', 'household'] as const) {
      if (c.standards[cat] !== prev.standards[cat]) {
        const up = c.standards[cat] > prev.standards[cat];
        recordSimEvent({
          simDay, dateLabel, category: 'shopping', subType: 'standard_shift',
          subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
          summary: `${c.name} ${up ? 'upgraded' : 'downgraded'} ${cat} standard L${prev.standards[cat]} → L${c.standards[cat]}`,
          detail: { category: cat, from: prev.standards[cat], to: c.standards[cat] },
        });
      }
    }

    if (prev.homeId && !c.homeId) {
      recordSimEvent({ simDay, dateLabel, category: 'housing', subType: 'homeless', subjectId: c.id, subjectKind: 'citizen', subjectName: c.name, summary: `${c.name} became homeless`, detail: { previousHomeId: prev.homeId } });
    } else if (!prev.homeId && c.homeId) {
      recordSimEvent({ simDay, dateLabel, category: 'housing', subType: 'homeless', subjectId: c.id, subjectKind: 'citizen', subjectName: c.name, summary: `${c.name} exited homelessness into ${c.homeId}`, detail: { homeId: c.homeId } });
    }
  }
}
