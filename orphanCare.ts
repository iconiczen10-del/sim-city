// orphanCare.ts — Guardian search (grandparents/adult siblings), City Treasury foster fallback, and age-25 trust release

import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { syncCitizenHousingLinks } from './housingScores';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent, CityState } from './types';

export function findLivingGuardianRelative(orphan: Citizen, city: CityState): Citizen | null {
  const byId = new Map(city.citizens.map((c) => [c.id, c]));
  const candidates: Citizen[] = [];

  for (const pid of orphan.parentIds ?? []) {
    const par = byId.get(pid);
    if (!par) continue;
    for (const gpId of par.parentIds ?? []) {
      const gp = byId.get(gpId);
      if (gp && gp.alive && gp.id !== orphan.id) candidates.push(gp);
    }
    for (const sibId of par.childrenIds ?? []) {
      const sib = byId.get(sibId);
      if (sib && sib.alive && sib.id !== orphan.id && sib.age >= 25) candidates.push(sib);
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => ((b.homeId ? 500 : 0) + b.savings) - ((a.homeId ? 500 : 0) + a.savings));
  return candidates[0];
}

export function placeOrphanWithGuardianOrTreasury(
  orphan: Citizen,
  city: CityState,
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): void {
  if (!orphan.alive || orphan.age >= 25) return;
  orphan.youngAdultPhase = 'dependent_youth';
  const relative = findLivingGuardianRelative(orphan, city);

  if (relative) {
    orphan.guardianId = relative.id;
    const relHouse = relative.homeId ? city.housing.houses.find((h) => h.id === relative.homeId) : undefined;
    if (relHouse) {
      for (const h of city.housing.houses) h.occupantIds = h.occupantIds.filter((id) => id !== orphan.id);
      relHouse.occupantIds.push(orphan.id);
    }
    syncCitizenHousingLinks(city.citizens, city.housing.houses, city.sharity);
    addCitizenMemory(orphan, clock, dateLabel, 'helped', `Taken in by relative ${relative.name} after losing parents.`, 16);
    appendLifeLog(orphan, clock.totalDays, dateLabel, 'mood', `Moved under guardianship of relative ${relative.name}.`);
    appendLifeLog(relative, clock.totalDays, dateLabel, 'mood', `Took in orphaned relative ${orphan.name}.`);
    events.push(makeCityEvent(clock, `guard_${orphan.id}`, {
      type: 'inheritance', citizenId: orphan.id, citizenName: orphan.name,
      title: 'Relative Guardian Assigned',
      detail: `${relative.name} took in ${orphan.name} (age ${orphan.age}) to raise until 25.`,
    }));
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'orphan_guardian',
      subjectId: orphan.id, subjectKind: 'citizen', subjectName: orphan.name,
      summary: `${orphan.name} placed with relative guardian ${relative.name}`,
      detail: { guardianId: relative.id, guardianName: relative.name },
    });
    return;
  }

  // No living relative: City Treasury provides housing + upkeep until 25
  orphan.guardianId = 'treasury';
  if (!orphan.homeId) {
    const room = city.housing.houses.find((h) => h.type === 'shared_room' && !h.condemned && h.occupantIds.length < h.capacity)
      ?? city.housing.houses.find((h) => !h.condemned && h.occupantIds.length < h.capacity);
    if (room && !room.occupantIds.includes(orphan.id)) {
      room.occupantIds.push(orphan.id);
      syncCitizenHousingLinks(city.citizens, city.housing.houses, city.sharity);
    }
  }
  appendLifeLog(orphan, clock.totalDays, dateLabel, 'money', 'City Treasury assigned youth housing & basic upkeep until age 25.');
  events.push(makeCityEvent(clock, `tguard_${orphan.id}`, {
    type: 'inheritance', citizenId: orphan.id, citizenName: orphan.name,
    title: 'Treasury Youth Care',
    detail: `${orphan.name} (no living relatives) placed under City Treasury support until 25.`,
  }));
}

export function releaseMinorTrustFundAt25(child: Citizen, totalDay: number, dateLabel: string): void {
  const fund = child.trustFund ?? 0;
  if (fund <= 0) { child.guardianId = null; return; }
  child.savings = Math.round((child.savings + fund) * 100) / 100;
  child.trustFund = 0;
  child.guardianId = null;
  appendLedgerEntry(child, totalDay, dateLabel, 'income', 'Trust Fund', 'Age-25 inheritance trust released', fund);
  appendLifeLog(child, totalDay, dateLabel, 'money', `Received ${formatDelta(fund)} inheritance trust fund upon turning 25.`);
}
