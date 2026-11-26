// electricityTapping.ts — Desperate citizen grid tapping attempts, detections, fines, and records when disconnected

import { addCitizenMemory } from './citizenMemory';
import type { ElectricityState } from './electricityTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { HousingState } from './housingTypes';
import { recordSimEvent } from './recordsStore';
import { simRand } from './rng';
import type { Citizen, CityEvent } from './types';

export function stepElectricityTappingDaily(params: {
  electricity: ElectricityState;
  housing: HousingState;
  citizens: Citizen[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { electricity, housing, citizens, clock, dateLabel, events } = params;
  const byHouse = new Map(housing.houses.map((h) => [h.id, h]));

  for (const c of citizens) {
    if (!c.alive || !c.homeId || !c.electricPowerCut) continue;
    const house = byHouse.get(c.homeId);
    const ledger = house?.electricLedger;
    if (!house || !ledger || !ledger.powerCut) continue;

    const honestyFactor = Math.max(0.05, (100 - c.traits.honesty) / 100);
    const desperation = (c.traits.survivalInstinct + c.traits.riskTolerance) / 200;
    const attemptChance = 0.08 * honestyFactor * (0.6 + desperation);
    if (simRand() >= attemptChance) continue;

    const detected = simRand() < 0.35 + (c.traits.impulsiveness / 350);
    if (detected) {
      const fine = 75;
      const paid = Math.min(Math.max(0, c.savings), fine);
      c.savings = Math.round((c.savings - paid) * 100) / 100;
      c.stress = clamp(c.stress + 12, 0, 100);
      c.mood = clamp(c.mood - 8, 0, 100);
      c.socialReputation = clamp((c.socialReputation ?? 50) - 8, 0, 100);
      ledger.arrearsBalance = Math.round((ledger.arrearsBalance + (fine - paid)) * 100) / 100;
      addCitizenMemory(c, clock, dateLabel, 'broke', `Caught tapping power at ${house.name} (∆${fine} fine).`, -30);

      recordSimEvent({
        simDay: clock.totalDays, dateLabel, category: 'electricity', subType: 'tapping',
        subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
        summary: `${c.name} caught illegally tapping grid at ${house.name} (${formatDelta(fine)} fine)`,
        detail: { houseId: house.id, houseName: house.name, detected: true, fine, paid, arrears: ledger.arrearsBalance },
      });
      events.push(makeCityEvent(clock, `tap_det_${c.id}`, {
        type: 'electric-bill', companyId: 'gjelectricity', citizenId: c.id, citizenName: c.name,
        title: 'Illegal Power Tapping Caught',
        detail: `${c.name} was caught tapping the grid at ${house.name} and fined ${formatDelta(fine)}.`,
      }));
    } else {
      c.housePowerCutToday = false;
      ledger.todayUnits = Math.round((ledger.todayUnits + 4.5) * 10) / 10;
      electricity.todayCityUnits = Math.round((electricity.todayCityUnits + 4.5) * 10) / 10;
      recordSimEvent({
        simDay: clock.totalDays, dateLabel, category: 'electricity', subType: 'tapping',
        subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
        summary: `${c.name} discreetly tapped grid power at ${house.name} (+4.5u undetected)`,
        detail: { houseId: house.id, houseName: house.name, detected: false, unitsDrawn: 4.5 },
      });
    }
  }
}
