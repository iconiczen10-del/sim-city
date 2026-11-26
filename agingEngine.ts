// agingEngine.ts — Birthdays, 1-year=360d aging, age brackets, age-65 retirement, lucky trait, and natural death rolls

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { killCitizenWithFamily } from './familyDeathInheritance';
import { openVacancy } from './jobScoring';
import { recordSimEvent } from './recordsStore';
import { simRand, simRandInt } from './rng';
import type { Citizen, CityEvent, CityState } from './types';

export function seedCitizenAgingFields(c: Citizen, roleRange: [number, number], currentYear = 1): void {
  const minAge = Math.max(25, roleRange[0]);
  const maxAge = Math.min(65, Math.max(minAge, roleRange[1]));
  let age = simRandInt(minAge, maxAge);
  // Weight starting population heavily toward 28-45 when range overlaps
  if (minAge <= 45 && maxAge >= 28 && simRand() < 0.78) {
    const lo = Math.max(minAge, 28);
    const hi = Math.min(maxAge, 45);
    if (lo <= hi) age = simRandInt(lo, hi);
  }
  c.age = age;
  c.birthDay = simRandInt(1, 30);
  c.birthMonth = simRandInt(1, 12);
  c.birthYear = currentYear - age;
  c.lucky = simRand() < 0.1;
  c.luckyExtraYears = c.lucky ? simRandInt(1, 15) : 0;
  c.luckyYearsUsed = 0;
  c.retired = false;
  c.highMoodMonths = 0;
}

function decideRetirementAt65(c: Citizen, city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  if (c.retired || c.roleLevel === 'Retired' || c.age < 65) return;
  const retireScore = (c.savings >= 6000 ? 32 : c.savings >= 2500 ? 18 : -10)
    + (c.health < 55 ? 24 : 8)
    + (c.roleLevel === 'Unemployed' ? 28 : c.roleLevel === 'CEO' ? -14 : 6)
    - (c.traits.ambition - 50) * 0.45;
  const stayScore = (c.traits.ambition - 45) * 0.5 + (c.savings < 2500 ? 28 : 5) + (c.roleLevel === 'CEO' ? 18 : 0);
  const willRetire = retireScore >= stayScore || c.roleLevel === 'Unemployed' || c.age >= 68;

  if (!willRetire) {
    recordConsequentialDecision({
      citizen: c, clock, dateLabel, kind: 'retirement_choice', category: 'work',
      title: `Age ${c.age} Retirement Check`, chosenOption: `Keep Working (${c.roleLevel})`, altOption: 'Retire Now',
      chosenReason: `Ambition (${c.traits.ambition}) and role ties outweighed retiring at ${c.age}.`,
      chosenFactors: [{ label: 'Work Drive', value: Math.round(stayScore) }],
      altFactors: [{ label: 'Rest & Savings', value: Math.round(retireScore) }],
      diarySentence: `Turned ${c.age} and chose to keep working as ${c.roleLevel}.`,
    });
    return;
  }

  const prevEmp = c.employerId;
  const prevRole = c.roleLevel;
  if (prevEmp && prevRole !== 'Unemployed') {
    const comp = city.companies.find((co) => co.id === prevEmp);
    if (comp) openVacancy(city.vacancies, comp, prevRole, `${c.name} retired at ${c.age}`, clock, dateLabel);
  }
  c.retired = true;
  c.retiredDay = clock.totalDays;
  c.previousRole = prevRole;
  c.roleLevel = 'Retired';
  c.employerId = null;
  c.bossId = null;
  c.jobHunting = false;
  c.lastGrossPay = 0;
  c.lastTax = 0;
  c.performanceScore = 0;

  addCitizenMemory(c, clock, dateLabel, 'retired', `Retired after turning ${c.age} (former ${prevRole}).`, 18);
  appendLifeLog(c, clock.totalDays, dateLabel, 'money', `Retired at age ${c.age} from ${prevRole}.`);
  recordConsequentialDecision({
    citizen: c, clock, dateLabel, kind: 'retirement_choice', category: 'work',
    title: `Age ${c.age} Retirement Check`, chosenOption: 'Retire', altOption: 'Keep Working',
    chosenReason: `Savings, health, and age ${c.age} supported stepping back from work.`,
    chosenFactors: [{ label: 'Retirement Readiness', value: Math.round(retireScore) }],
    altFactors: [{ label: 'Keep Working', value: Math.round(stayScore) }],
    diarySentence: `Retired at age ${c.age}.`,
  });
  events.push(makeCityEvent(clock, `ret_${c.id}`, {
    type: 'retired', citizenId: c.id, citizenName: c.name, companyId: prevEmp ?? undefined,
    title: 'Citizen Retired', detail: `${c.name} retired at age ${c.age}${prevRole !== 'Unemployed' ? ` (vacated ${prevRole})` : ''}.`,
  }));
  recordSimEvent({
    simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'retired',
    subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
    summary: `${c.name} retired at age ${c.age} (former ${prevRole})`,
    detail: { age: c.age, previousRole: prevRole, previousCompany: prevEmp, savings: c.savings },
  });
}

export function stepCitizenBirthdayDaily(c: Citizen, city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  if (!c.alive || c.birthDay !== clock.day || c.birthMonth !== clock.month) return;
  c.age += 1;
  if (c.age >= 41 && c.age <= 55) {
    c.healthProfile.fitness = Math.round(clamp(c.healthProfile.fitness - 1, 10, 100) * 10) / 10;
  } else if (c.age >= 56) {
    c.healthProfile.fitness = Math.round(clamp(c.healthProfile.fitness - 2, 10, 100) * 10) / 10;
    c.healthProfile.immunity = Math.round(clamp(c.healthProfile.immunity - 1.5, 5, 100) * 10) / 10;
  }
  appendLifeLog(c, clock.totalDays, dateLabel, 'health', `Celebrated birthday — turned age ${c.age}.`);
  recordSimEvent({
    simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'birthday',
    subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
    summary: `${c.name} turned ${c.age} years old`,
    detail: { age: c.age, fitness: c.healthProfile.fitness, immunity: c.healthProfile.immunity, lucky: Boolean(c.lucky) },
  });
  if (c.age >= 65 && !c.retired) {
    decideRetirementAt65(c, city, clock, dateLabel, events);
  }
}

export function runMonthlyAgingAndDeathRolls(city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): number {
  let treasuryDelta = 0;
  for (const c of city.citizens) {
    if (!c.alive) continue;
    c.highMoodMonths = c.mood > 70 ? (c.highMoodMonths ?? 0) + 1 : 0;
    if (c.age < 65) continue;

    let pct = 1 + Math.max(0, c.age - 65) * 2;
    if (c.health < 40) pct += 10;
    if (c.healthProfile.immunity < 30) pct += 8;
    if (c.healthProfile.fitness > 70) pct -= 5;
    if (c.traits.resilience > 70) pct -= 4;
    if (c.stress > 80) pct += 6;
    if ((c.highMoodMonths ?? 0) >= 6) pct -= 3;
    pct = clamp(pct, 0.25, 85);

    const prob = pct / 100;
    if (simRand() < prob) {
      if (c.lucky && (c.luckyYearsUsed ?? 0) < (c.luckyExtraYears ?? 0)) {
        c.luckyYearsUsed = (c.luckyYearsUsed ?? 0) + 1;
        recordSimEvent({
          simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'lucky_survival',
          subjectId: c.id, subjectKind: 'citizen', subjectName: c.name,
          summary: `${c.name} (age ${c.age}) beat a natural death roll via lucky trait`,
          detail: { age: c.age, rollPct: pct, luckyYearsUsed: c.luckyYearsUsed, luckyExtraYears: c.luckyExtraYears },
        });
        continue;
      }
      treasuryDelta += killCitizenWithFamily({ citizen: c, cause: 'old_age', city, clock, dateLabel, events });
    }
  }
  return treasuryDelta;
}
