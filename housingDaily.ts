// housingDaily.ts — Daily housing & homelessness effects, satisfaction life outcomes, and maintenance shortage recovery

import { applyEmotionPulse } from './citizenEmotions';
import { appendLifeLog } from './citizenLedger';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { computeHousingSatisfaction } from './housingPreferences';
import { computeHouseScores, syncCitizenHousingLinks } from './housingScores';
import type { HousingState } from './housingTypes';
import { simRand } from './rng';
import { getAffinity } from './sharityAffinity';
import type { SharityState } from './sharityTypes';
import type { Citizen, CityEvent } from './types';

function r1(n: number): number { return Math.round(n * 10) / 10; }

export function stepHousingDailyEffects(params: {
  citizens: Citizen[];
  housing: HousingState;
  sharity: SharityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): number {
  const { citizens, housing, sharity, clock, dateLabel, events } = params;
  for (const h of housing.houses) {
    if (h.maintenanceUntilDay && clock.totalDays > h.maintenanceUntilDay) {
      h.maintenanceUntilDay = undefined;
      if (h.condition > 0) h.condemned = false;
    }
  }
  syncCitizenHousingLinks(citizens, housing.houses, sharity);
  const byHouse = new Map(housing.houses.map((h) => [h.id, h]));
  const byCit = new Map(citizens.map((c) => [c.id, c]));
  let homelessCount = 0;

  for (const c of citizens) {
    if (!c.alive) continue;
    const house = c.homeId ? byHouse.get(c.homeId) : undefined;
    if (house && !house.condemned && !house.maintenanceUntilDay) {
      c.homelessDays = 0;
      const occ = house.occupantIds.map((id) => byCit.get(id)!).filter(Boolean);
      const scores = computeHouseScores(house, occ, sharity);
      house.scores = scores;
      const sat = computeHousingSatisfaction(c, house, sharity);
      c.housingSatisfaction = sat;

      const powerOff = Boolean(house.electricLedger?.powerCut || house.electricLedger?.blackedOutToday);
      const shelterVal = r1(clamp(scores.comfort * 0.5 + scores.space * 0.3 + scores.privacy * 0.2 - (powerOff ? 12 : 0), 5, 100));
      c.needs.shelter.value = shelterVal;
      c.needs.shelter.lastRestoredDay = clock.totalDays;
      c.needs.safety.value = scores.safety;
      if (scores.safety >= 65) c.needs.safety.lastRestoredDay = clock.totalDays;

      const poorSleep = scores.comfort < 35 || scores.noise > 68 || sat.total < 30;
      c.sleepEnergyMult = sat.total > 75 ? 0.85 : poorSleep ? 1.35 : 1.0;
      c.hygieneDrainMult = powerOff ? 1.25 : 1.0;
      c.housingSkillMult = sat.total > 75 ? 1.1 : sat.total < 30 ? 0 : 1.0;

      if (sat.total > 75) {
        c.healthProfile.immunity = r1(clamp(c.healthProfile.immunity + 0.12, 5, 100));
        c.healthProfile.mental = r1(clamp(c.healthProfile.mental + 0.25, 0, 100));
        c.emotions.loneliness.value = r1(c.emotions.loneliness.value * 0.92);
        c.emotions.fear.value = r1(c.emotions.fear.value * 0.92);
      } else if (sat.total < 30) {
        c.healthProfile.immunity = r1(clamp(c.healthProfile.immunity - 0.22, 5, 100));
        c.healthProfile.mental = r1(clamp(c.healthProfile.mental - 0.45, 0, 100));
        applyEmotionPulse(c.emotions, 'anger', 1.2, `Dissatisfied in ${house.name}`, clock, dateLabel);
        applyEmotionPulse(c.emotions, 'shame', 1.0, `Poor living conditions at ${house.name}`, clock, dateLabel);
      }

      let moodOff = (shelterVal - 50) * 0.14 - (powerOff ? 4 : 0);
      if (house.occupantIds.length > house.capacity) {
        c.stress = r1(clamp(c.stress + 1.5, 0, 100));
        moodOff -= 2.5;
      }
      if (house.condition < 40) { moodOff -= 3; if (simRand() < 0.015) c.health = clamp(c.health - 3, 0, 100); }
      if (c.traits.neatness >= 62 && house.condition < 50) moodOff -= 2.5;
      for (const rId of c.roommateIds ?? []) {
        const aff = getAffinity(sharity, c.id, rId);
        if (aff > 50) {
          c.needs.social.value = r1(clamp(c.needs.social.value + 5, 0, 100));
          c.needs.social.lastRestoredDay = clock.totalDays;
          applyEmotionPulse(c.emotions, 'joy', 1.8, 'Warm roommate company', clock, dateLabel);
        } else if (aff < 10) {
          c.stress = r1(clamp(c.stress + 1, 0, 100));
          moodOff -= 1.5;
          applyEmotionPulse(c.emotions, 'anger', 0.8, 'Roommate tension', clock, dateLabel);
        }
      }
      c.housingMoodOffset = r1(moodOff);
    } else {
      homelessCount += 1;
      c.homeId = null; c.ownershipType = 'homeless'; c.seekingHousing = c.youngAdultPhase !== 'dependent_youth'; c.housingSkillMult = 0;
      c.housingSatisfaction = computeHousingSatisfaction(c, null, sharity);
      const days = (c.homelessDays ?? 0) + 1;
      c.homelessDays = days; c.needs.shelter.value = 0; c.needs.safety.value = 20;
      c.sleepEnergyMult = 1.5; c.hygieneDrainMult = 1.35; c.housingMoodOffset = -12;
      c.health = clamp(c.health - 1, 0, 100);
      c.healthProfile.physical = r1(c.health);
      c.healthProfile.mental = r1(clamp(c.healthProfile.mental - 2, 0, 100));
      c.healthProfile.immunity = r1(clamp(c.healthProfile.immunity - 1, 5, 100));
      if (days === 1) {
        applyEmotionPulse(c.emotions, 'shame', 24 + c.traits.pride * 0.14, 'Became homeless', clock, dateLabel);
        applyEmotionPulse(c.emotions, 'fear', 26, 'Sleeping without shelter', clock, dateLabel);
        events.push(makeCityEvent(clock, `homeless_${c.id}`, { type: 'homeless', citizenId: c.id, citizenName: c.name, title: 'Citizen Homeless', detail: `${c.name} is now homeless and searching for shelter.` }));
      }
      if (days >= 14) {
        c.stress = r1(clamp(Math.max(c.stress, 78) + 2, 0, 100));
        c.healthProfile.mental = r1(clamp(c.healthProfile.mental - 1.2, 0, 100));
      }
    }
  }

  if (homelessCount > 5 && clock.totalDays % 7 === 0) {
    events.push(makeCityEvent(clock, `hwave_${clock.totalDays}`, { type: 'homeless', title: 'City Homelessness Crisis', detail: `${homelessCount} citizens are currently homeless across Vij.` }));
    appendLifeLog(citizens.find((c) => c.alive)!, clock.totalDays, dateLabel, 'mood', `Heard concern across Vij about ${homelessCount} homeless residents.`);
  }
  return homelessCount;
}
