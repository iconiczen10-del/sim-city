// householdPool.ts — Married household pooled income/expenses, shared spending fallback, and combined totals

import { appendLedgerEntry } from './citizenLedger';
import { FIXED_NON_RENT_COSTS, RENT_COSTS } from './constants';
import type { HousingState } from './housingTypes';
import type { Citizen } from './types';

export interface HouseholdPoolSummary {
  spouse: Citizen | null;
  dependents: Citizen[];
  memberCount: number;
  combinedGrossPay: number;
  combinedNetPay: number;
  combinedSavings: number;
  combinedDebt: number;
  combinedMonthlyDebt: number;
  estimatedMonthlyExpenses: number;
}

export function getMarriedSpouse(citizen: Citizen, byId: Map<string, Citizen>): Citizen | null {
  if (citizen.relationship?.stage !== 'married' || !citizen.relationship.partnerId) return null;
  const sp = byId.get(citizen.relationship.partnerId);
  return sp && sp.alive ? sp : null;
}

export function getHouseholdSummary(
  citizen: Citizen,
  citizens: Citizen[],
  housing?: HousingState
): HouseholdPoolSummary {
  const byId = new Map(citizens.map((c) => [c.id, c]));
  const spouse = getMarriedSpouse(citizen, byId);
  const adults = spouse ? [citizen, spouse] : [citizen];
  const depSet = new Set<string>();
  const dependents: Citizen[] = [];
  for (const a of adults) {
    for (const cid of a.childrenIds ?? []) {
      if (depSet.has(cid)) continue;
      const ch = byId.get(cid);
      if (ch && ch.alive && ch.age < 25 && ch.youngAdultPhase === 'dependent_youth') {
        depSet.add(cid);
        dependents.push(ch);
      }
    }
  }

  const combinedGrossPay = adults.reduce((s, a) => s + (a.lastGrossPay || 0), 0);
  const combinedNetPay = adults.reduce((s, a) => s + Math.max(0, (a.lastGrossPay || 0) - (a.lastTax || 0)), 0);
  const combinedSavings = adults.reduce((s, a) => s + Math.max(0, a.savings), 0);
  const combinedDebt = adults.reduce((s, a) => s + (a.debtProfile?.totalDebt ?? 0), 0);
  const combinedMonthlyDebt = adults.reduce((s, a) => s + (a.debtProfile?.monthlyObligation ?? 0), 0);
  const house = citizen.homeId && housing ? housing.houses.find((h) => h.id === citizen.homeId) : undefined;
  const rentEst = house ? house.rentPrice : RENT_COSTS[citizen.homeType];
  const powerEst = citizen.lastElectricBill ?? 45;
  const foodWaterEst = (adults.length + dependents.length) * 105;
  const estimatedMonthlyExpenses = Math.round(rentEst + powerEst + FIXED_NON_RENT_COSTS.total + foodWaterEst + combinedMonthlyDebt);

  return {
    spouse, dependents, memberCount: adults.length + dependents.length,
    combinedGrossPay: Math.round(combinedGrossPay), combinedNetPay: Math.round(combinedNetPay),
    combinedSavings: Math.round(combinedSavings * 100) / 100,
    combinedDebt: Math.round(combinedDebt * 100) / 100,
    combinedMonthlyDebt: Math.round(combinedMonthlyDebt * 100) / 100,
    estimatedMonthlyExpenses,
  };
}

export function spendFromHouseholdPool(params: {
  primary: Citizen;
  spouse: Citizen | null;
  amount: number;
  totalDay: number;
  dateLabel: string;
  category: string;
  label: string;
}): boolean {
  const { primary, spouse, amount, totalDay, dateLabel, category, label } = params;
  if (amount <= 0) return true;
  const availPrimary = Math.max(0, primary.savings);
  const availSpouse = spouse && spouse.alive ? Math.max(0, spouse.savings) : 0;
  if (availPrimary + availSpouse + 0.01 < amount) return false;

  const fromPrimary = Math.min(availPrimary, amount);
  const fromSpouse = Math.round((amount - fromPrimary) * 100) / 100;
  if (fromPrimary > 0) {
    primary.savings = Math.round((primary.savings - fromPrimary) * 100) / 100;
    appendLedgerEntry(primary, totalDay, dateLabel, 'expense', category, label, Math.round(fromPrimary * 100) / 100);
  }
  if (fromSpouse > 0 && spouse) {
    spouse.savings = Math.round((spouse.savings - fromSpouse) * 100) / 100;
    appendLedgerEntry(spouse, totalDay, dateLabel, 'expense', category, `${label} (Household Pool)`, fromSpouse);
  }
  return true;
}
