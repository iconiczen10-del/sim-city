// electricityAwarenessEngine.ts — Daily subsidy awareness spread (1-3d), usage conservation, GJ trust, and billing choice logging

import { appendLifeLog } from './citizenLedger';
import { clamp } from './economy';
import { ensureCitizenElectricityAwareness } from './electricityAwarenessSeed';
import { processCitizenBillingReactions } from './electricityBillingReactions';
import type { SimClock } from './eventFactory';
import type { SubsidyLearnSource } from './gjSubsidyTypes';
import type { HousingState } from './housingTypes';
import { recordSimEvent } from './recordsStore';
import { simRand, simRandInt } from './rng';
import type { SharityState } from './sharityTypes';
import type { Citizen } from './types';

export { processCitizenBillingReactions };

function queueAwareness(c: Citizen, source: SubsidyLearnSource, totalDays: number): void {
  const aw = ensureCitizenElectricityAwareness(c);
  if (aw.knowsSubsidy || aw.pendingSubsidyLearnDay !== undefined) return;
  aw.pendingSubsidyLearnDay = totalDays + simRandInt(1, 3);
  aw.pendingSubsidySource = source;
}

export function stepElectricityAwarenessDaily(params: {
  citizens: Citizen[];
  housing: HousingState;
  sharity: SharityState;
  clock: SimClock;
  dateLabel: string;
}): void {
  const { citizens, housing, sharity, clock, dateLabel } = params;
  const byId = new Map(citizens.map((c) => [c.id, c]));

  for (const c of citizens) {
    if (!c.alive) continue;
    const aw = ensureCitizenElectricityAwareness(c);
    if (!aw.knowsSubsidy && aw.pendingSubsidyLearnDay !== undefined && clock.totalDays >= aw.pendingSubsidyLearnDay) {
      aw.knowsSubsidy = true;
      aw.subsidySource = aw.pendingSubsidySource ?? 'neighbor';
      aw.subsidyLearnedDay = clock.totalDays;
      aw.pendingSubsidyLearnDay = undefined;
      appendLifeLog(c, clock.totalDays, dateLabel, 'money', `Learned about GJ electricity subsidies (${aw.subsidySource.replace('_', ' ')}).`);
      recordSimEvent({
        simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'subsidy_awareness',
        subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
        summary: `${c.name} learned about GJ subsidies via ${aw.subsidySource.replace('_', ' ')}`,
        detail: { source: aw.subsidySource },
      });
    }
    if (c.employerId === 'gjelectricity' && !aw.knowsSubsidy) queueAwareness(c, 'coworker', clock.totalDays);

    const house = c.homeId ? housing.houses.find((h) => h.id === c.homeId) : undefined;
    const mtd = house?.electricLedger?.monthUnits ?? 0;
    const careful = (c.traits.discipline + c.traits.thriftiness) / 2;
    const projectedMonth = (mtd / Math.max(1, clock.day)) * 30;
    if (careful >= 55 && (aw.knowsSubsidy || aw.lastKnownBill > 45) && projectedMonth > 102) {
      aw.monthlyConservationPct = Math.round(clamp(aw.monthlyConservationPct + 1.5, 4, 26));
    } else if (careful < 40 && aw.lastKnownBill < 30 && aw.monthlyConservationPct > 0) {
      aw.monthlyConservationPct = Math.max(0, aw.monthlyConservationPct - 1);
    }
  }

  for (const h of housing.houses) {
    const occ = h.occupantIds.map((id) => byId.get(id)).filter((c): c is Citizen => Boolean(c && c.alive));
    if (occ.some((c) => c.electricityAwareness?.knowsSubsidy) && simRand() < 0.35) {
      for (const c of occ) queueAwareness(c, 'neighbor', clock.totalDays);
    }
  }
  const hasSubsidyPost = sharity.posts.slice(0, 12).some((p) => p.triggerKey === 'subsidy_relief' || p.triggerKey === 'power_cut_notice');
  for (const c of citizens) {
    if (!c.alive || c.electricityAwareness?.knowsSubsidy) continue;
    if (hasSubsidyPost && simRand() < 0.04) queueAwareness(c, 'sharity', clock.totalDays);
    else if (c.employerId && simRand() < 0.035 && citizens.some((o) => o.alive && o.employerId === c.employerId && o.electricityAwareness?.knowsSubsidy)) {
      queueAwareness(c, 'coworker', clock.totalDays);
    }
  }
}
