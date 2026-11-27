// housingRoommates.ts — Roommate compatibility, monthly conflict/neatness friction, and desperate friend shelter requests

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { applyEmotionPulse } from './citizenEmotions';
import { appendLifeLog } from './citizenLedger';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { moveCitizenToHouse } from './housingEviction';
import { getTenantMonthlyRent } from './housingScores';
import type { House, HousingState } from './housingTypes';
import { simRand } from './rng';
import { adjustAffinity, getAffinity } from './sharityAffinity';
import type { SharityState } from './sharityTypes';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent } from './types';

export function canJoinAsRoommate(applicant: Citizen, house: House, occupants: Citizen[], sharity: SharityState): boolean {
  if (occupants.length === 0) return true;
  if (house.type === 'shared_room') return house.occupantIds.length < 2;
  const desperate = applicant.homeId === null || applicant.survivalState === 'Desperate' || applicant.survivalState === 'Critical';
  if (!desperate && applicant.housingPrefs?.roommateTolerance === 'prefers_alone') return false;

  const splitRent = Math.round(house.rentPrice / (occupants.length + 1));
  const netPay = Math.max(0, applicant.lastGrossPay - applicant.lastTax);
  const affordable = splitRent <= Math.max(120, netPay * (applicant.housingPrefs?.maxRentRatio ?? 0.4));
  if (!desperate && !affordable) return false;

  return occupants.every((occ) => {
    const aff = getAffinity(sharity, applicant.id, occ.id);
    const appOk = desperate || aff > 30;
    const occWantsSplit = occ.savings < occ.lastGrossPay * 0.5 || getTenantMonthlyRent(house) > occ.lastGrossPay * 0.45;
    const occOk = aff > 20 || occWantsSplit || occ.traits.kindness > 60;
    return appOk && occOk;
  });
}

export function stepMonthlyRoommateConflicts(params: {
  citizens: Citizen[];
  housing: HousingState;
  sharity: SharityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { citizens, housing, sharity, clock, dateLabel, events } = params;
  const byId = new Map(citizens.map((c) => [c.id, c]));

  for (const h of housing.houses) {
    if (h.condemned || h.occupantIds.length < 2) continue;
    for (let i = 0; i < h.occupantIds.length; i += 1) {
      for (let j = i + 1; j < h.occupantIds.length; j += 1) {
        const a = byId.get(h.occupantIds[i]);
        const b = byId.get(h.occupantIds[j]);
        if (!a || !b || !a.alive || !b.alive || a.youngAdultPhase === 'dependent_youth' || b.youngAdultPhase === 'dependent_youth') continue;
        const aff = getAffinity(sharity, a.id, b.id);
        const neatGap = Math.abs(a.traits.neatness - b.traits.neatness);
        const chance = aff < -20 ? 0.65 : aff < 0 ? 0.35 : neatGap > 50 ? 0.28 : 0;
        if (chance > 0 && simRand() < chance) {
          applyEmotionPulse(a.emotions, 'anger', 16, `Roommate friction with ${b.name}`, clock, dateLabel);
          applyEmotionPulse(b.emotions, 'anger', 16, `Roommate friction with ${a.name}`, clock, dateLabel);
          adjustAffinity(sharity, a.id, b.id, -8);
          adjustAffinity(sharity, b.id, a.id, -8);
          const mover = a.traits.patience <= b.traits.patience ? a : b;
          mover.seekingHousing = true;
          mover.housingEvalUrgent = true;
          appendLifeLog(mover, clock.totalDays, dateLabel, 'mood', `Clashed with roommate ${mover === a ? b.name : a.name} in ${h.name}; looking to move.`);
          events.push(makeCityEvent(clock, `rconf_${a.id}_${b.id}`, {
            type: 'roommate-conflict', citizenId: mover.id, citizenName: mover.name,
            title: 'Roommate Conflict', detail: `${a.name} and ${b.name} clashed in ${h.name}${neatGap > 50 ? ' (neatness clash)' : ''}; ${mover.name} seeks a move.`,
          }));
        }
      }
    }
  }
}

export function tryAskFriendForShelter(params: {
  seeker: Citizen;
  housing: HousingState;
  allCitizens: Citizen[];
  sharity: SharityState;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): boolean {
  const { seeker, housing, allCitizens, sharity, clock, dateLabel, events } = params;
  if (seeker.youngAdultPhase === 'dependent_youth') return false;
  const byHouse = new Map(housing.houses.map((h) => [h.id, h]));
  const friends = allCitizens
    .filter((f) => {
      if (!f.alive || f.id === seeker.id || !f.homeId) return false;
      const fh = byHouse.get(f.homeId);
      return Boolean(fh && !fh.condemned && !fh.maintenanceUntilDay && fh.occupantIds.length < fh.capacity && getAffinity(sharity, f.id, seeker.id) > 60);
    })
    .sort((a, b) => getAffinity(sharity, b.id, seeker.id) - getAffinity(sharity, a.id, seeker.id))
    .slice(0, 3);

  for (const host of friends) {
    const fh = byHouse.get(host.homeId!)!;
    const struggling = host.savings < 300 || host.rentArrears > 0;
    const accepts = !struggling && (host.traits.kindness >= 50 || host.traits.courage < 35);
    recordConsequentialDecision({
      citizen: host, clock, dateLabel, kind: 'help_choice', category: 'housing',
      title: `Shelter Request from ${seeker.name}`, chosenOption: accepts ? `Invite ${seeker.name} In` : 'Decline Request',
      altOption: accepts ? 'Decline Request' : `Invite ${seeker.name} In`,
      chosenReason: accepts ? `Kindness (${host.traits.kindness}) and friendship welcomed ${seeker.name}.` : 'Financial pressure prevented hosting.',
      chosenFactors: [{ label: 'Kindness & Affinity', value: accepts ? 38 : -10 }], altFactors: [{ label: 'Household Pressure', value: struggling ? 25 : -15 }],
    });
    if (!accepts) continue;

    const discount = host.traits.kindness >= 75 ? 0 : host.traits.kindness >= 55 ? 0.5 : 1;
    seeker.friendRentDiscount = discount;
    moveCitizenToHouse({ citizen: seeker, target: fh, housing, allCitizens, clock, dateLabel, reason: `Invited in by friend ${host.name}`, events });
    if (discount < 1) applyEmotionPulse(seeker.emotions, 'gratitude', 26, `${host.name} offered shelter`, clock, dateLabel);
    appendLifeLog(host, clock.totalDays, dateLabel, 'gift', `Took ${seeker.name} in at ${fh.name}.`);
    adjustAffinity(sharity, seeker.id, host.id, 10);
    recordSimEvent({
      simDay: clock.totalDays, dateLabel, category: 'housing', subType: 'friend_stay',
      subjectId: seeker.id, subjectKind: 'citizen', subjectName: seeker.name,
      summary: `${host.name} sheltered ${seeker.name} at ${fh.name} (${Math.round((1 - discount) * 100)}% rent discount)`,
      detail: { hostId: host.id, hostName: host.name, houseId: fh.id, houseName: fh.name, rentDiscountPct: Math.round((1 - discount) * 100) },
    });
    return true;
  }
  seeker.stress = clamp(seeker.stress + 3, 0, 100);
  return false;
}
