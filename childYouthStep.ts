// childYouthStep.ts — Computed child support, orphan guardian/Treasury upkeep, trust fund release, and age-25 transition

import { resolveAge25Transition } from './childAge25Decisions';
import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { clamp } from './economy';
import type { SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { getHouseholdSummary } from './householdPool';
import { releaseMinorTrustFundAt25 } from './orphanCare';
import { recordSimEvent } from './recordsStore';
import type { Citizen, CityEvent, CityState } from './types';

function computeMonthlyChildSupport(payer: Citizen, child: Citizen, parentCount: number, depCount: number, citizens: Citizen[]): number {
  const pool = getHouseholdSummary(payer, citizens);
  const incFactor = clamp(pool.combinedGrossPay * 0.09, 65, 220);
  const traitFactor = (payer.traits.kindness * 0.45 + payer.traits.loyalty * 0.3 - payer.traits.thriftiness * 0.25);
  const ageAdj = (child.age - 18) * 6;
  const singleParentAdj = parentCount === 1 ? -18 : 12;
  const siblingScale = depCount > 1 ? 1 / (1 + (depCount - 1) * 0.16) : 1;
  const debtDrag = clamp((payer.debtProfile?.dtiRatio ?? 0) * 85, 0, 75);
  return Math.round(clamp((85 + incFactor + traitFactor + ageAdj + singleParentAdj - debtDrag) * siblingScale, 90, 360));
}

export function stepYouthAndAge25Monthly(city: CityState, clock: SimClock, dateLabel: string, events: CityEvent[]): number {
  const byId = new Map(city.citizens.map((c) => [c.id, c]));
  let treasuryDelta = 0;

  for (const child of city.citizens) {
    if (!child.alive || child.youngAdultPhase !== 'dependent_youth') continue;
    const parents = (child.parentIds ?? []).map((id) => byId.get(id)).filter((p): p is Citizen => Boolean(p && p.alive));
    const guardian = child.guardianId && child.guardianId !== 'treasury' ? byId.get(child.guardianId) : undefined;
    const supporters = parents.length > 0 ? parents : (guardian && guardian.alive ? [guardian] : []);
    const bond = child.parentBond ?? { love: 70, financialTension: 15, independenceTension: 15, gratitude: 60 };
    child.parentBond = bond;

    if (child.age < 25) {
      if (supporters.length === 0 && child.guardianId === 'treasury') {
        const stipend = 135;
        child.savings = Math.round((child.savings + stipend) * 100) / 100;
        treasuryDelta -= stipend;
        appendLedgerEntry(child, clock.totalDays, dateLabel, 'income', 'Treasury Care', 'Youth upkeep stipend', stipend);
      } else {
        const payer = [...supporters].sort((a, b) => b.savings - a.savings)[0];
        const depCount = payer ? getHouseholdSummary(payer, city.citizens).dependents.length : 1;
        const supportCost = payer ? computeMonthlyChildSupport(payer, child, supporters.length, depCount, city.citizens) : 140;

        if (payer && payer.savings >= supportCost + 35) {
          payer.savings = Math.round((payer.savings - supportCost) * 100) / 100;
          child.savings = Math.round((child.savings + supportCost) * 100) / 100;
          appendLedgerEntry(payer, clock.totalDays, dateLabel, 'expense', 'Child Support', `Upkeep for ${child.name}`, supportCost);
          appendLedgerEntry(child, clock.totalDays, dateLabel, 'income', 'Parental Support', `Support from ${payer.name}`, supportCost);
          appendLifeLog(child, clock.totalDays, dateLabel, 'money', `Received ${formatDelta(supportCost)} parental support from ${payer.name}.`);
          bond.love = Math.round(clamp(bond.love + 1.2, 0, 100));
          bond.gratitude = Math.round(clamp(bond.gratitude + 1.5, 0, 100));
          bond.financialTension = Math.round(clamp(bond.financialTension - 1, 0, 100));

          if (payer.savings >= 3500 && (payer.debtProfile?.dtiRatio ?? 0) < 0.35 && (child.education === 'school' || child.education === 'diploma')) {
            const tuition = 120;
            payer.savings = Math.round((payer.savings - tuition) * 100) / 100;
            appendLedgerEntry(payer, clock.totalDays, dateLabel, 'expense', 'Child Tuition', `Higher education for ${child.name}`, tuition);
            child.skill = Math.round(clamp(child.skill + 2.4, 0, 100) * 10) / 10;
            if (child.age >= 20 && child.education === 'school') {
              child.education = 'diploma';
              recordConsequentialDecision({
                citizen: payer, clock, dateLabel, kind: 'child_tuition', category: 'family',
                title: `Fund ${child.name}'s Diploma`, chosenOption: `Pay Tuition (${formatDelta(tuition)}/mo)`, altOption: 'Skip Tuition',
                chosenReason: `Household savings (${formatDelta(payer.savings)}) supported ${child.name}'s diploma.`,
                chosenFactors: [{ label: 'Savings Cushion', value: 30 }], altFactors: [{ label: 'Cash Preservation', value: 12 }],
                diarySentence: `Paid for ${child.name}'s diploma studies.`,
              });
            } else if (child.age >= 22 && child.education === 'diploma') child.education = 'degree';
          }
        } else if (supporters.length > 0) {
          child.childSupportShortfalls = (child.childSupportShortfalls ?? 0) + 1;
          bond.financialTension = Math.round(clamp(bond.financialTension + 6, 0, 100));
          bond.gratitude = Math.round(clamp(bond.gratitude - 3, 0, 100));
          child.mood = Math.round(clamp(child.mood - 6, 0, 100) * 10) / 10;
          child.healthProfile.mental = Math.round(clamp(child.healthProfile.mental - 4, 0, 100) * 10) / 10;
          appendLifeLog(child, clock.totalDays, dateLabel, 'money', 'Caregivers could not afford full support this month.');
          recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'child_support_shortfall', subjectId: child.id, subjectKind: 'citizen', subjectName: child.name, summary: `${child.name}: Caregivers short on child support`, detail: { shortfalls: child.childSupportShortfalls, financialTension: bond.financialTension } });
        }
      }

      bond.independenceTension = Math.round(clamp(bond.independenceTension + (child.age >= 22 ? 3.5 : 1.5), 0, 100));
      const eduPart = child.education === 'degree' ? 28 : child.education === 'diploma' ? 18 : 10;
      child.capabilityScore = Math.round(clamp(child.skill * 0.45 + child.traits.discipline * 0.3 + eduPart - (child.childSupportShortfalls ?? 0) * 2, 10, 99));
      continue;
    }

    releaseMinorTrustFundAt25(child, clock.totalDays, dateLabel);
    resolveAge25Transition(child, supporters, city, clock, dateLabel, events);
  }
  return treasuryDelta;
}
