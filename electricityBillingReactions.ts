// electricityBillingReactions.ts — Monthly citizen reactions to electricity bills, subsidies, disconnects, and roommate splits

import { recordConsequentialDecision } from './citizenDecisionOutcomes';
import { appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { clamp } from './economy';
import { ensureCitizenElectricityAwareness } from './electricityAwarenessSeed';
import type { ElectricBillRecord } from './electricityTypes';
import type { SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { HouseSubsidyPackage } from './gjSubsidyTypes';
import type { House } from './housingTypes';
import { recordSimEvent } from './recordsStore';
import { adjustAffinity } from './sharityAffinity';
import type { SharityState } from './sharityTypes';
import type { Citizen } from './types';

export function processCitizenBillingReactions(params: {
  house: House;
  occ: Citizen[];
  bill: ElectricBillRecord;
  rawBill: ElectricBillRecord;
  pkg: HouseSubsidyPackage | null;
  shares: Map<string, number>;
  paidByCitizen: Map<string, number>;
  wasPowerCutBefore: boolean;
  isPowerCutNow: boolean;
  clock: SimClock;
  dateLabel: string;
  sharity?: SharityState;
}): void {
  const { house, occ, bill, rawBill, pkg, shares, paidByCitizen, wasPowerCutBefore, isPowerCutNow, clock, dateLabel, sharity } = params;
  const absorbed = bill.subsidyAbsorbed ?? 0;

  for (const c of occ) {
    const aw = ensureCitizenElectricityAwareness(c);
    const myDue = shares.get(c.id) ?? 0;
    const myPaid = paidByCitizen.get(c.id) ?? 0;
    const prevBill = aw.lastKnownBill;
    const shocked = prevBill > 10 && myDue > prevBill * 1.28 && myDue > 25;
    aw.lastKnownBill = Math.round(myDue * 100) / 100;

    if (shocked) {
      aw.monthlyConservationPct = Math.round(clamp(aw.monthlyConservationPct + 6, 0, 28));
      aw.trustInGJ = Math.round(clamp(aw.trustInGJ - 6, 0, 100));
      aw.lastReactionNote = `Shocked by ${formatDelta(myDue)} bill (was ${formatDelta(prevBill)}); cutting appliance use.`;
      addCitizenMemory(c, clock, dateLabel, 'bill_shock', `Shocked by high electric bill (${formatDelta(myDue)}) at ${house.name}.`, -18);
    }
    if (bill.lateFee > 0) aw.knowsLateFee = true;
    if (!wasPowerCutBefore && isPowerCutNow) {
      aw.knowsDisconnectRule = true; aw.knowsReconnectFine = true; aw.knowsLateFee = true;
      aw.trustInGJ = Math.round(clamp(aw.trustInGJ - 18, 0, 100));
      c.mood = clamp(c.mood - 8, 0, 100);
      aw.lastReactionNote = 'Surprise disconnect damaged trust in GJ Electricity.';
    } else if (pkg?.enrolled && absorbed > 0) {
      aw.trustInGJ = Math.round(clamp(aw.trustInGJ + (pkg.waiverPct >= 100 ? 9 : 5), 0, 100));
      aw.lastReactionNote = `Relieved by GJ subsidy (${bill.subsidySummary ?? 'assistance'}).`;
      if (absorbed >= 12) addCitizenMemory(c, clock, dateLabel, 'subsidy_help', `GJ subsidy covered ${formatDelta(absorbed)} of electric bill.`, 16);
    }

    if (pkg && !pkg.enrolled && c.traits.pride >= 80 && c.savings >= 250 && !isPowerCutNow && pkg.status === 'refused') {
      aw.refusedSubsidy = true;
      recordConsequentialDecision({ citizen: c, clock, dateLabel, kind: 'subsidy_response', category: 'survival', title: 'GJ Subsidy Offer', chosenOption: 'Refused subsidy (pride)', altOption: 'Accept subsidy', chosenReason: `Pride (${c.traits.pride}) and ∆${Math.round(c.savings)} savings led to declining public aid.`, chosenFactors: [{ label: 'Pride', value: c.traits.pride }], altFactors: [{ label: 'Relief Value', value: Math.round(rawBill.totalDue) }], diarySentence: 'Declined GJ electricity subsidy out of pride.' });
    }

    let choice: 'paid_in_full' | 'asked_for_plan' | 'skipped_bill' | 'waived_free' = 'paid_in_full';
    if (myDue <= 0.1) choice = 'waived_free';
    else if (pkg?.paymentPlanMonths && pkg.paymentPlanMonths >= 2 && (c.traits.survivalInstinct >= 65 || myPaid < myDue - 0.5)) {
      choice = 'asked_for_plan'; aw.askedForPlan = true;
    } else if (myPaid < myDue - 0.5) choice = 'skipped_bill';
    else if (c.traits.survivalInstinct >= 72 && myDue > c.savings * 0.5 && !aw.askedForPlan) {
      aw.askedForPlan = true; choice = 'asked_for_plan';
    }

    const choiceText = choice === 'waived_free' ? 'bill waived (free)' : choice === 'asked_for_plan' ? 'asked for a plan' : choice === 'skipped_bill' ? 'skipped the bill' : 'paid in full';
    c.subsidyHistory = [{ id: `sh_${clock.totalDays}_${c.id}`, day: clock.totalDays, dateLabel, houseName: house.name, status: pkg?.status ?? 'ineligible', amountSaved: Math.round((absorbed / occ.length) * 100) / 100, sharePaid: myPaid, billChoice: choice, reason: pkg?.reasonSummary ?? 'Standard billing' }, ...(c.subsidyHistory ?? [])].slice(0, 24);
    recordConsequentialDecision({ citizen: c, clock, dateLabel, kind: 'electric_bill_choice', category: 'survival', title: `Electric Bill (${house.name})`, chosenOption: choiceText, altOption: choice === 'paid_in_full' ? 'Skip bill' : 'Pay in full', chosenReason: `Due ${formatDelta(myDue)}, paid ${formatDelta(myPaid)}, GJ trust ${aw.trustInGJ}/100.`, chosenFactors: [{ label: 'Savings', value: Math.round(c.savings) }, { label: 'GJ Trust', value: aw.trustInGJ }], altFactors: [{ label: 'Bill Due', value: Math.round(myDue) }], diarySentence: `Electricity billing choice: ${choiceText} (${formatDelta(myDue)} due).` });
    recordSimEvent({ simDay: clock.totalDays, dateLabel, category: 'citizens', subType: 'electric_bill_choice', subjectId: c.id, subjectKind: 'citizen', subjectName: c.name, summary: `${c.name}: ${choiceText} (${formatDelta(myDue)} due, trust ${aw.trustInGJ})`, detail: { choice: choiceText, myDue, myPaid, trustInGJ: aw.trustInGJ, subsidyStatus: pkg?.status ?? 'none' } });
  }

  if (occ.length >= 2 && sharity) {
    const unpaid = occ.filter((c) => (paidByCitizen.get(c.id) ?? 0) + 1 < (shares.get(c.id) ?? 0));
    if (unpaid.length > 0 && unpaid.length < occ.length) {
      const a = occ[0]; const b = occ[1];
      adjustAffinity(sharity, a.id, b.id, -8);
      appendLifeLog(a, clock.totalDays, dateLabel, 'mood', `Argued with roommates at ${house.name} over splitting the electric bill.`);
    }
  }
}
