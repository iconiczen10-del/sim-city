// familyDeathInheritance.ts — Widowing, estate & home inheritance, single-parent strain, and death vacancy hooks

import { applyEmotionPulse } from './citizenEmotions';
import { finalizeCitizenDeath } from './citizenHealthEvents';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { openVacancy } from './jobScoring';
import { recordSimEvent } from './recordsStore';
import { simRandInt } from './rng';
import type { Citizen, CityEvent, CityState, DeathCause } from './types';

export function applyFamilyEffectsOnDeath(params: {
  deceased: Citizen;
  estate: number;
  city: CityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): number {
  const { deceased, estate, city, clock, dateLabel, events: _events } = params;
  const byId = new Map(city.citizens.map((c) => [c.id, c]));
  const partnerId = deceased.relationship?.stage === 'married' ? deceased.relationship.partnerId : null;
  const spouse = partnerId ? byId.get(partnerId) : undefined;
  const livingChildren = (deceased.childrenIds ?? [])
    .map((id) => byId.get(id))
    .filter((c): c is Citizen => Boolean(c && c.alive));

  // Widow living spouse
  if (spouse && spouse.alive && spouse.relationship) {
    const griefDays = simRandInt(90, 180);
    spouse.relationship = {
      ...spouse.relationship,
      stage: 'widowed',
      partnerId: null,
      stageSinceDay: clock.totalDays,
      griefUntilDay: clock.totalDays + griefDays,
      pastSpouseIds: [...new Set([...spouse.relationship.pastSpouseIds, deceased.id])],
    };
    spouse.mood = Math.round(clamp(spouse.mood - 24, 0, 100) * 10) / 10;
    spouse.stress = Math.round(clamp(spouse.stress + 20, 0, 100) * 10) / 10;
    spouse.healthProfile.mental = Math.round(clamp(spouse.healthProfile.mental - 16, 0, 100) * 10) / 10;
    applyEmotionPulse(spouse.emotions, 'sadness', 42, `Lost spouse ${deceased.name}`, clock, dateLabel);
    applyEmotionPulse(spouse.emotions, 'loneliness', 36, `Widowed after losing ${deceased.name}`, clock, dateLabel);
    addCitizenMemory(spouse, clock, dateLabel, 'widowed', `Lost beloved spouse ${deceased.name}.`, -55);
    appendLifeLog(spouse, clock.totalDays, dateLabel, 'mood', `Widowed after ${deceased.name} passed away.`);
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'widowed',
      subjectId: spouse.id, subjectKind: 'citizen', subjectName: spouse.name,
      summary: `${spouse.name} became widowed after ${deceased.name} passed away (${griefDays}d mourning)`,
      detail: { spouseId: deceased.id, spouseName: deceased.name, griefUntilDay: clock.totalDays + griefDays },
    });

    // Single-parent mental health strain if raising dependent youths 18-24
    const dependents = livingChildren.filter((ch) => ch.age < 25);
    if (dependents.length > 0) {
      spouse.healthProfile.mental = Math.round(clamp(spouse.healthProfile.mental - 8, 0, 100) * 10) / 10;
      spouse.stress = Math.round(clamp(spouse.stress + 10, 0, 100) * 10) / 10;
      appendLifeLog(spouse, clock.totalDays, dateLabel, 'mood', `Carrying single-parent responsibilities for ${dependents.length} dependent(s).`);
    }
  }

  // Owned houses & estate inheritance (CEO seats never inherited)
  const ownedHouses = city.housing.houses.filter((h) => h.ownerId === deceased.id);
  const heirs: Citizen[] = spouse && spouse.alive ? [spouse] : livingChildren;

  if (heirs.length > 0) {
    ownedHouses.forEach((h, idx) => {
      const heir = heirs[idx % heirs.length];
      h.ownerId = heir.id;
      h.forSale = false;
      appendLifeLog(heir, clock.totalDays, dateLabel, 'money', `Inherited ${h.name} from ${deceased.name}.`);
    });
    if (estate > 0) {
      const share = Math.floor(estate / heirs.length);
      for (const heir of heirs) {
        if (share <= 0) continue;
        heir.savings = Math.round((heir.savings + share) * 100) / 100;
        appendLedgerEntry(heir, clock.totalDays, dateLabel, 'income', 'Inheritance', `Estate from ${deceased.name}`, share);
        appendLifeLog(heir, clock.totalDays, dateLabel, 'money', `Inherited ${formatDelta(share)} from ${deceased.name}.`);
      }
      recordSimEvent({
        simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'inheritance',
        subjectId: deceased.id, subjectKind: 'citizen', subjectName: deceased.name,
        summary: `${deceased.name}'s estate (${formatDelta(estate)}) and ${ownedHouses.length} house(s) inherited by ${heirs.map((h) => h.name).join(', ')}`,
        detail: { estate, houseCount: ownedHouses.length, heirIds: heirs.map((h) => h.id) },
      });
    }
    return 0;
  }

  return estate;
}

export function killCitizenWithFamily(params: {
  citizen: Citizen;
  cause: DeathCause;
  city: CityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): number {
  const { citizen, cause, city, clock, dateLabel, events } = params;
  const prevEmp = citizen.employerId;
  const prevRole = citizen.roleLevel;
  const estate = finalizeCitizenDeath(citizen, clock, dateLabel, events, cause);
  if (prevEmp && prevRole !== 'Unemployed' && prevRole !== 'Retired') {
    const comp = city.companies.find((co) => co.id === prevEmp);
    if (comp) openVacancy(city.vacancies, comp, prevRole, `${citizen.name} passed away`, clock, dateLabel);
  }
  citizen.employerId = null;
  citizen.bossId = null;
  const node = city.family?.nodes[citizen.id];
  if (node) node.alive = false;
  return applyFamilyEffectsOnDeath({ deceased: citizen, estate, city, clock, dateLabel, events });
}
