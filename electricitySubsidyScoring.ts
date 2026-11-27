// electricitySubsidyScoring.ts — 6-factor household subsidy assessment, outreach reach, and 100+ package combinations

import { getSeasonFromMonth } from './electricityCatalog';
import { buildPackageFromScore, moodOffset } from './electricitySubsidyPackage';
import type { ElectricityState } from './electricityTypes';
import { getGJAssessorInfo } from './gjStaffEngine';
import type { HouseSubsidyPackage } from './gjSubsidyTypes';
import type { House } from './housingTypes';
import { clamp } from './economy';
import { getHouseholdSummary } from './householdPool';
import { simRand, simRandFloat } from './rng';
import type { Citizen } from './types';
import type { Company } from './companyTypes';

export function assessHouseSubsidyPackage(params: {
  house: House;
  occ: Citizen[];
  allCitizens?: Citizen[];
  electricity: ElectricityState;
  gj?: Company;
  month: number;
  year: number;
  dateLabel: string;
  totalDays: number;
  outreachLeft: { count: number };
  assessor: ReturnType<typeof getGJAssessorInfo>;
}): HouseSubsidyPackage | null {
  const { house, occ, allCitizens, electricity, month, year, dateLabel, totalDays, outreachLeft, assessor } = params;
  const leg = house.electricLedger;
  if (!leg || occ.length === 0) return null;

  const spousePayPool = occ.length === 1 ? getHouseholdSummary(occ[0], allCitizens ?? occ).combinedGrossPay : 0;
  const totalPay = Math.max(occ.reduce((s, c) => s + (c.lastGrossPay || 0), 0), spousePayPool);
  const avgPay = totalPay / occ.length;
  const hasUnemp = occ.every((c) => c.roleLevel === 'Unemployed' || c.roleLevel === 'Retired');
  const hasEntry = occ.some((c) => c.roleLevel === 'Entry');
  const hasIll = occ.some((c) => (c.healthProfile?.illnessDaysLeft ?? 0) > 0);
  const hasElder = occ.some((c) => c.age >= 65);
  const hasYouth = occ.some((c) => c.age < 25);
  const hasColdSpike = leg.spikeHistory.some((sp) => totalDays - sp.endDay <= 30 && sp.reason.toLowerCase().includes('heater'));
  const isWinterOrSpike = getSeasonFromMonth(month) === 'Winter' || hasColdSpike;

  const tags: string[] = [];
  let score = 20;
  if (totalPay <= 0) { score += 34; tags.push('no earned pay'); }
  else if (avgPay < 600) { score += 24; tags.push(hasEntry ? 'Entry pay' : 'low pay'); }
  else if (avgPay < 1100) { score += 12; tags.push('Staff-tier pay'); }
  else { score -= Math.min(34, Math.round((avgPay - 1100) / 85)); }

  const unitLimit = 105 + Math.max(0, occ.length - 1) * 28;
  if (leg.monthUnits <= unitLimit) { score += 12; tags.push('low usage'); }
  else if (leg.monthUnits > unitLimit * 1.6) { score -= 10; }

  if (occ.length === 1) { score += 4; } else { score += 7; tags.push('roommates'); }
  if (hasYouth) { score += 12; tags.push('dependent youth'); }
  if (hasElder) { score += 13; tags.push('elderly'); }
  if (hasIll) { score += 16; tags.push('ill resident'); }
  if (hasUnemp && occ.some((c) => c.roleLevel === 'Retired')) tags.push('retired');

  if (leg.unpaidMonths === 0 && leg.arrearsBalance <= 0) score += 5;
  else if (leg.unpaidMonths === 1) { score += 10; tags.push('late 1 mo'); }
  else { score += 18; tags.push('arrears/risk'); }

  if (isWinterOrSpike) { score += 10; tags.push('cold snap'); }

  const activeMood = electricity.simgodMoodOverride ?? electricity.subsidyMood ?? 'balanced';
  score += moodOffset(activeMood, electricity.simgodLevelOverride);
  const accuracyErr = (1 - assessor.accuracy) * simRandFloat(-12, 12);
  score = Math.round(clamp(score + accuracyErr + simRandFloat(-4, 4), 0, 100));

  const pkgBase = buildPackageFromScore({ score, occ, units: leg.monthUnits, arrears: leg.arrearsBalance, unpaidMonths: leg.unpaidMonths, isWinterOrSpike, override: electricity.simgodLevelOverride });
  const anyRefused = occ.every((c) => c.electricityAwareness?.refusedSubsidy);
  const anyKnows = occ.some((c) => c.electricityAwareness?.knowsSubsidy);
  let enrolled = false;
  let outreachDiscovered = false;
  let finalStatus = pkgBase.status;

  if (pkgBase.status !== 'ineligible') {
    if (anyRefused) {
      finalStatus = 'refused';
    } else if (anyKnows) {
      enrolled = true;
    } else if (outreachLeft.count > 0 && simRand() < assessor.accuracy) {
      outreachLeft.count -= 1;
      enrolled = true;
      outreachDiscovered = true;
      for (const c of occ) {
        if (c.electricityAwareness && !c.electricityAwareness.knowsSubsidy) {
          c.electricityAwareness.knowsSubsidy = true;
          c.electricityAwareness.subsidySource = 'gj_notice';
          c.electricityAwareness.subsidyLearnedDay = totalDays;
        }
      }
      tags.push(`found by ${assessor.assessorTitle}`);
    } else {
      finalStatus = 'unreached';
    }
  }

  return {
    id: `sub_${totalDays}_${house.id}`, month, year, dateLabel, houseId: house.id, houseName: house.name,
    score, assessorTitle: assessor.assessorTitle, enrolled, outreachDiscovered, ...pkgBase, status: finalStatus,
    monthlyAbsorbed: 0, reasonTags: tags,
    reasonSummary: tags.length > 0 ? tags.join(', ') : `Score ${score} (${activeMood})`,
  };
}
