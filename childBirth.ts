// childBirth.ts — Age-18 child arrival orchestration, orphan fallback, housing placement, and Sharity onboarding

import { buildBornChildCitizen } from './childFactory';
import { appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { makeCityEvent, type SimClock } from './eventFactory';
import { handleFamilyHousingOnBirth } from './familyHousingMove';
import { ensureFamilyState, extractSurname, makeTreeNodeFromCitizen } from './familyTreeEngine';
import { formatDelta } from './formatters';
import { moveCitizenToHouse } from './housingEviction';
import { syncCitizenHousingLinks } from './housingScores';
import { placeOrphanWithGuardianOrTreasury } from './orphanCare';
import { recordSimEvent } from './recordsStore';
import { adjustAffinity } from './sharityAffinity';
import { buildCitizenBio } from './sharityBios';
import { trackFollowGain } from './sharityNetwork';
import type { CityEvent, CityState } from './types';

export function processDuePregnanciesDaily(city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  const fam = ensureFamilyState(city);
  const due = fam.pregnancies.filter((p) => clock.totalDays >= p.dueDay);
  if (due.length === 0) return;

  const byId = new Map(city.citizens.map((c) => [c.id, c]));
  const existingNames = new Set(city.citizens.map((c) => c.name));
  const takenHandles = new Set(Object.values(city.sharity.profiles).map((p) => p.handle));

  for (const preg of due) {
    const p1 = byId.get(preg.carrierId);
    const p2 = byId.get(preg.partnerId);
    if (!p1 || !p2) continue;
    p1.pregnancy = null;
    p2.pregnancy = null;

    const isOrphan = !p1.alive && !p2.alive;
    const livingParent = p1.alive ? p1 : p2.alive ? p2 : null;
    const childId = `cit_${fam.nextCitizenSeq++}`;
    const child = buildBornChildCitizen({
      childId, p1, p2, livingParent, isOrphan,
      familyId: p1.familyId ?? preg.familyId,
      city, clock, existingNames, takenHandles,
    });

    if (isOrphan) {
      addCitizenMemory(child, clock, dateLabel, 'orphan', `Arrived as an orphan after losing both ${p1.name} and ${p2.name}.`, -45);
      appendLifeLog(child, clock.totalDays, dateLabel, 'mood', `Arrived at age 18 as an orphan; no parents survived to support.`);
    } else {
      appendLifeLog(child, clock.totalDays, dateLabel, 'mood', `Joined the ${extractSurname(p1.name)} household at age 18 with ${formatDelta(child.savings)}.`);
      for (const par of [p1, p2]) {
        if (par.alive) addCitizenMemory(par, clock, dateLabel, 'child_birth', `Welcomed child ${child.name} into the household.`, 40);
      }
    }

    p1.childrenIds = [...(p1.childrenIds ?? []), child.id];
    p2.childrenIds = [...(p2.childrenIds ?? []), child.id];
    city.citizens.push(child);
    byId.set(child.id, child);
    if (isOrphan) placeOrphanWithGuardianOrTreasury(child, city, clock, dateLabel, events);
    else if (livingParent) handleFamilyHousingOnBirth({ livingParent, otherParent: p1.id === livingParent.id ? p2 : p1, child, city, clock, dateLabel, events, moveFn: moveCitizenToHouse });
    fam.nodes[child.id] = makeTreeNodeFromCitizen(child, child.familyId!, child.generation!);
    for (const pid of [p1.id, p2.id]) if (fam.nodes[pid]) fam.nodes[pid].childrenIds.push(child.id);

    city.sharity.profiles[child.id] = {
      id: child.id, kind: 'citizen', name: child.name, handle: child.sharityHandle,
      joinedDay: clock.totalDays, bio: buildCitizenBio(child, city.companies), bioUpdatedDay: clock.totalDays,
      verified: false, badgeHistory: [], followerMilestonesLogged: [],
    };
    for (const par of [p1, p2]) {
      adjustAffinity(city.sharity, child.id, par.id, isOrphan ? 40 : 75);
      if (par.alive) { trackFollowGain(city.sharity, child.id, par.id); trackFollowGain(city.sharity, par.id, child.id); }
    }
    trackFollowGain(city.sharity, child.id, 'vijmart');

    events.push(makeCityEvent(clock, `birth_${child.id}`, {
      type: 'child-birth', citizenId: child.id, citizenName: child.name,
      title: isOrphan ? 'Orphan Child Arrived (Age 18)' : 'Child Arrived at Age 18',
      detail: isOrphan
        ? `${child.name} entered Vij at 18 as an orphan (${p1.name} & ${p2.name} passed away).`
        : `${child.name} joined ${p1.name} & ${p2.name} at age 18 (${formatDelta(child.savings)} gift).`,
    }));
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'child_birth',
      subjectId: child.id, subjectKind: 'citizen', subjectName: child.name,
      summary: `${child.name} arrived at age 18 (${isOrphan ? 'Orphan' : `Parents: ${p1.name} & ${p2.name}`})`,
      detail: { parentIds: [p1.id, p2.id], isOrphan, giftSavings: child.savings, skill: child.skill, traits: child.traits },
    });
  }

  fam.pregnancies = fam.pregnancies.filter((p) => clock.totalDays < p.dueDay);
  syncCitizenHousingLinks(city.citizens, city.housing.houses, city.sharity);
}
