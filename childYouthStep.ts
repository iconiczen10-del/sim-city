// childYouthStep.ts — Monthly ages 18-24 parent support costs, optional tuition, capability score, 4-part bond, and age-25 trigger

import { resolveAge25Transition } from './childAge25Decisions';
import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent, CityState } from './types';

export function stepYouthAndAge25Monthly(city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): void {
  const byId = new Map(city.citizens.map((c) => [c.id, c]));

  for (const child of city.citizens) {
    if (!child.alive || child.youngAdultPhase !== 'dependent_youth') continue;
    const parents = (child.parentIds ?? []).map((id) => byId.get(id)).filter((p): p is Citizen => Boolean(p && p.alive));
    const bond = child.parentBond ?? { love: 70, financialTension: 15, independenceTension: 15, gratitude: 60 };
    child.parentBond = bond;

    if (child.age < 25) {
      const baseCost = 180;
      const payer = [...parents].sort((a, b) => b.savings - a.savings)[0];
      if (payer && payer.savings >= baseCost + 40) {
        payer.savings = Math.round((payer.savings - baseCost) * 100) / 100;
        appendLedgerEntry(payer, clock.totalDays, dateLabel, 'expense', 'Child Support', `Monthly upkeep for ${child.name}`, baseCost);
        bond.love = Math.round(clamp(bond.love + 1.2, 0, 100));
        bond.gratitude = Math.round(clamp(bond.gratitude + 1.5, 0, 100));
        bond.financialTension = Math.round(clamp(bond.financialTension - 1, 0, 100));

        // Optional college tuition
        if (payer.savings >= 3500 && (child.education === 'school' || child.education === 'diploma')) {
          const tuition = 120;
          payer.savings = Math.round((payer.savings - tuition) * 100) / 100;
          appendLedgerEntry(payer, clock.totalDays, dateLabel, 'expense', 'Child Tuition', `Higher education for ${child.name}`, tuition);
          child.skill = Math.round(clamp(child.skill + 2.4, 0, 100) * 10) / 10;
          if (child.age >= 20 && child.education === 'school') {
            child.education = 'diploma';
            recordConsequentialDecision({
              citizen: payer, clock, dateLabel, kind: 'child_tuition', category: 'family',
              title: `Fund ${child.name}'s Diploma`, chosenOption: `Pay Tuition (${formatDelta(tuition)}/mo)`, altOption: 'Skip Tuition',
              chosenReason: `Strong household savings (${formatDelta(payer.savings)}) supported ${child.name}'s education.`,
              chosenFactors: [{ label: 'Savings Cushion', value: 30 }], altFactors: [{ label: 'Cash Preservation', value: 12 }],
              diarySentence: `Paid for ${child.name}'s diploma studies.`,
            });
          } else if (child.age >= 22 && child.education === 'diploma') {
            child.education = 'degree';
          }
        }
      } else if (parents.length > 0) {
        child.childSupportShortfalls = (child.childSupportShortfalls ?? 0) + 1;
        bond.financialTension = Math.round(clamp(bond.financialTension + 6, 0, 100));
        bond.gratitude = Math.round(clamp(bond.gratitude - 3, 0, 100));
        child.mood = Math.round(clamp(child.mood - 6, 0, 100) * 10) / 10;
        child.healthProfile.mental = Math.round(clamp(child.healthProfile.mental - 4, 0, 100) * 10) / 10;
        appendLifeLog(child, clock.totalDays, dateLabel, 'money', 'Parents could not afford support this month.');
        recordSimEvent({
          simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'child_support_shortfall',
          subjectId: child.id, subjectKind: 'citizen', subjectName: child.name,
          summary: `${child.name}: Parents could not afford support this month`,
          detail: { shortfalls: child.childSupportShortfalls, financialTension: bond.financialTension },
        });
      }

      bond.independenceTension = Math.round(clamp(bond.independenceTension + (child.age >= 22 ? 3.5 : 1.5), 0, 100));
      const eduPart = child.education === 'degree' ? 28 : child.education === 'diploma' ? 18 : 10;
      child.capabilityScore = Math.round(clamp(child.skill * 0.45 + child.traits.discipline * 0.3 + eduPart - (child.childSupportShortfalls ?? 0) * 2, 10, 99));
      continue;
    }

    // Reached age 25 -> resolve Adult Path Options
    resolveAge25Transition(child, parents, city, clock, dateLabel, events);
  }
}
