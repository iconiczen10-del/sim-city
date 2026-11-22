// martManager.ts — Real Vij Mart Team Lead NPC trait profile, performance review, and firing

import { addCitizenMemory } from './citizenMemory';
import { rebuildCompanyBossTree } from './companySetup';
import type { Company, CompanyVacancy, JobMarketEvent } from './companyTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatSimDate } from './formatters';
import { openVacancy } from './jobScoring';
import { round2 } from './martSetup';
import type { MartState } from './martTypes';
import type { Citizen, CityEvent, CityState } from './types';

export interface MartManagerTraits {
  managerName: string;
  hasManager: boolean;
  gtWeight: number;
  emaWeight: number;
  emaAlpha: number;
  safetyMult: number;
  safetyReason: string;
  orderNoiseAmp: number;
  stressForecastErr: number;
  panicFreezeRisk: boolean;
  greedyBonus: number;
  gougingBonus: number;
  generousBonus: number;
  kindnessOverride: boolean;
  resentfulMood: boolean;
}

export function getMartFloorManager(citizens: Citizen[]): Citizen | null {
  return citizens.find((c) => c.alive && c.employerId === 'vijmart' && c.roleLevel === 'Team Lead') ?? null;
}

export function getManagerTraitProfile(manager: Citizen | null): MartManagerTraits {
  if (!manager) {
    return {
      managerName: 'Fallback AI', hasManager: false,
      gtWeight: 0.8, emaWeight: 0.2, emaAlpha: 0.2,
      safetyMult: 1.2, safetyReason: 'Fallback AI baseline safety stock 1.2x',
      orderNoiseAmp: 0, stressForecastErr: 0, panicFreezeRisk: false,
      greedyBonus: 0, gougingBonus: 0, generousBonus: 0,
      kindnessOverride: false, resentfulMood: false,
    };
  }
  const { discipline, ambition, greed, kindness } = manager.traits;
  const gtWeight = discipline < 40 ? 0.6 : discipline > 70 ? 0.9 : 0.8;
  const emaAlpha = manager.skill < 35 ? 0.4 : manager.skill > 70 ? 0.15 : 0.2;
  const safetyMult = ambition > 70 ? 1.4 : ambition < 30 ? 1.05 : 1.2;
  const safetyReason = ambition > 70
    ? 'Ambition trait pushed safety stock to 1.4x'
    : ambition < 30
      ? 'Low ambition trimmed safety stock to 1.05x'
      : 'Discipline & ambition kept safety stock at 1.2x';
  const orderNoiseAmp = manager.experience < 2 ? 0.15 : manager.experience > 5 ? 0 : 0.05;
  const stressForecastErr = manager.stress > 60 ? ((manager.stress - 60) / 10) * 0.05 : 0;

  return {
    managerName: manager.name,
    hasManager: true,
    gtWeight,
    emaWeight: round2(1 - gtWeight),
    emaAlpha,
    safetyMult,
    safetyReason,
    orderNoiseAmp,
    stressForecastErr,
    panicFreezeRisk: manager.stress > 85,
    greedyBonus: greed > 70 ? 15 : 0,
    gougingBonus: greed > 70 ? 8 : 0,
    generousBonus: greed < 30 ? 10 : 0,
    kindnessOverride: kindness > 65,
    resentfulMood: manager.mood < 40,
  };
}

export function evaluateMartManagerMonthly(
  mart: MartState,
  comp: Company,
  manager: Citizen | null
): { shouldFire: boolean; delta: number } {
  const profitDelta = comp.lastMonthProfit >= 0 ? 8 : -10;
  const spoilDelta = mart.monthSpoilageCount <= 5 ? 4 : -Math.min(14, Math.round(mart.monthSpoilageCount / 3));
  const stockoutDelta = mart.monthStockoutDays <= 2 ? 5 : -Math.min(15, Math.round(mart.monthStockoutDays * 1.5));
  const repDelta = mart.reputation >= 65 ? 4 : mart.reputation < 45 ? -6 : 0;
  const rushPenalty = -Math.min(10, Math.round(mart.monthRushFeeCount * 1.5));
  const closurePenalty = -Math.min(15, mart.monthClosureDays * 5);

  const delta = profitDelta + spoilDelta + stockoutDelta + repDelta + rushPenalty + closurePenalty;
  mart.managerPerformance = round2(clamp(mart.managerPerformance + delta, 0, 100));
  mart.monthSpoilageCount = 0;
  mart.monthStockoutDays = 0;
  mart.monthRushFeeCount = 0;
  mart.monthClosureDays = 0;

  if (!manager) {
    mart.managerLowPerfMonths = 0;
    return { shouldFire: false, delta };
  }

  manager.performanceScore = Math.round(mart.managerPerformance);
  mart.managerLowPerfMonths = mart.managerPerformance < 30 ? mart.managerLowPerfMonths + 1 : 0;
  return { shouldFire: mart.managerLowPerfMonths >= 2, delta };
}

export function fireMartManagerSimGod(prev: CityState): CityState {
  const next = structuredClone(prev);
  const mgr = getMartFloorManager(next.citizens);
  const comp = next.companies.find((c) => c.id === 'vijmart');
  if (!mgr || !comp) return prev;

  const clock: SimClock = { totalDays: prev.totalDays, day: prev.day, month: prev.month, year: prev.year };
  const dateLabel = formatSimDate(prev.day, prev.month, prev.year);
  const note = `SimGod dismissed ${mgr.name} as Vij Mart floor manager.`;

  mgr.employerId = null;
  mgr.bossId = null;
  mgr.roleLevel = 'Unemployed';
  mgr.lastGrossPay = 0;
  mgr.lastTax = 0;
  mgr.performanceScore = 0;
  mgr.tenureMonths = 0;
  mgr.monthsSincePromotion = 0;
  addCitizenMemory(mgr, clock, dateLabel, 'loss', 'Fired from Vij Mart floor manager role.', -38);
  mgr.workHistory = [{ id: `wh_sgfire_${clock.totalDays}_${mgr.id}_${mgr.workHistory.length}`, dateLabel, companyId: comp.id, companyName: comp.name, role: 'Team Lead' as const, kind: 'fired' as const, note }, ...mgr.workHistory].slice(0, 24);
  next.jobEvents.unshift({ id: `je_sgfire_${clock.totalDays}_${mgr.id}_${next.jobEvents.length}`, dateLabel, kind: 'fired', citizenId: mgr.id, citizenName: mgr.name, companyId: comp.id, companyName: comp.name, role: 'Team Lead', detail: note });
  next.events.unshift(makeCityEvent(clock, `sg_fire_${mgr.id}_${next.jobEvents.length}`, { type: 'fired', citizenId: mgr.id, citizenName: mgr.name, companyId: comp.id, title: 'Mart Manager Fired', detail: note }));
  openVacancy(next.vacancies as CompanyVacancy[], comp, 'Team Lead', 'Floor manager fired by SimGod', clock, dateLabel);
  rebuildCompanyBossTree('vijmart', next.citizens);

  next.mart.managerLowPerfMonths = 0;
  next.mart.panicFreezeDaysLeft = 0;
  next.mart.decisionLog.unshift({
    id: `dec_sgfire_${clock.totalDays}`,
    dateLabel,
    category: 'store',
    managerName: 'Fallback AI',
    summary: `${mgr.name} dismissed; Fallback AI active`,
    reason: 'Vacancy opened for Team Lead floor manager in Job Market.',
  });
  return next;
}
