// boardSeats.ts — Vij Industries 4-seat board resolution, internal seat promotions, and metrics

import type { BoardSeatInfo, CompanyBoardState } from './boardTypes';
import { computeCitizenPerformance, ROLE_RANK } from './companyRules';
import { rebuildCompanyBossTree } from './companySetup';
import type { Company, CompanyVacancy, JobMarketEvent } from './companyTypes';
import { DAYS_PER_MONTH } from './constants';
import { calculateMarginalTax, calculateMonthlyPay, clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import type { Citizen, CityEvent, RoleLevel } from './types';

export interface BoardMetrics {
  estMonthlyPayroll: number;
  reserveTarget: number;
  requiredWithReserve: number;
  shortfall: number;
  runwayMonths: number;
  payrollRatio: number;
  staffMood: number;
  headcount: number;
}

export function createInitialBoardState(citizens: Citizen[]): CompanyBoardState {
  const count = citizens.filter((c) => c.alive && c.employerId === 'vijindustries').length;
  return {
    nextMeetingDay: DAYS_PER_MONTH,
    lastMeetingDay: 0,
    lastEmergencyDay: -30,
    lastSevereActionDay: -90,
    executivePayCutPct: 0,
    companyPayCutPct: 0,
    restructuredLevel: 0,
    totalBoardContributions: 0,
    pendingEmployeeAskIds: [],
    employeeInvestments: [],
    speakerRecentFragments: {},
    globalRecentFragments: [],
    unreadMeetingCount: 0,
    lastStaffTargetHeadcount: count || 26,
  };
}

export function resolveBoardMembers(citizens: Citizen[]): { seats: BoardSeatInfo[]; members: Citizen[] } {
  const staff = citizens.filter((c) => c.alive && c.employerId === 'vijindustries');
  const ceo = staff.find((c) => c.roleLevel === 'CEO') ?? null;
  const execs = staff
    .filter((c) => c.roleLevel === 'Executive')
    .sort((a, b) => b.performanceScore - a.performanceScore || b.tenureMonths - a.tenureMonths)
    .slice(0, 2);
  const mgr = staff
    .filter((c) => c.roleLevel === 'Manager')
    .sort((a, b) => b.performanceScore - a.performanceScore || b.tenureMonths - a.tenureMonths)[0] ?? null;

  const picked: { role: 'CEO' | 'Executive' | 'Manager'; c: Citizen | null }[] = [
    { role: 'CEO', c: ceo },
    { role: 'Executive', c: execs[0] ?? null },
    { role: 'Executive', c: execs[1] ?? null },
    { role: 'Manager', c: mgr },
  ];

  const members: Citizen[] = [];
  const seats: BoardSeatInfo[] = picked.map((slot, idx) => {
    if (slot.c) members.push(slot.c);
    return {
      seatIndex: idx,
      seatRole: slot.role,
      citizenId: slot.c?.id ?? null,
      name: slot.c?.name ?? `Vacant ${slot.role}`,
      mood: slot.c ? Math.round(slot.c.mood) : 0,
      stress: slot.c ? Math.round(slot.c.stress) : 0,
      stance: slot.c ? describeMemberStance(slot.c) : 'Vacant',
    };
  });
  return { seats, members };
}

export function describeMemberStance(c: Citizen): string {
  if (c.traits.greed >= 70 && c.traits.kindness < 50) return 'Cost Hawk';
  if (c.traits.kindness >= 68) return 'People Shield';
  if (c.traits.loyalty >= 72) return 'Steadfast Loyalist';
  if (c.traits.ambition >= 72) return 'Ambitious Climber';
  if (c.traits.discipline >= 70) return 'Fiscal Steward';
  return 'Pragmatist';
}

export function fillVacantBoardSeatsInternally(params: {
  comp: Company;
  citizens: Citizen[];
  vacancies: CompanyVacancy[];
  jobEvents: JobMarketEvent[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): void {
  const { comp, citizens, jobEvents, clock, dateLabel, events } = params;
  const targets: { role: 'CEO' | 'Executive' | 'Manager'; need: number; from: RoleLevel[] }[] = [
    { role: 'CEO', need: 1, from: ['Executive', 'Manager', 'Team Lead'] },
    { role: 'Executive', need: 2, from: ['Manager', 'Team Lead', 'Staff'] },
    { role: 'Manager', need: 1, from: ['Team Lead', 'Staff', 'Entry'] },
  ];

  for (const t of targets) {
    let current = citizens.filter((c) => c.alive && c.employerId === comp.id && c.roleLevel === t.role).length;
    while (current < t.need) {
      const pool = citizens
        .filter((c) => c.alive && c.employerId === comp.id && t.from.includes(c.roleLevel))
        .sort((a, b) => ROLE_RANK[b.roleLevel] - ROLE_RANK[a.roleLevel] || b.performanceScore - a.performanceScore || b.skill - a.skill);
      const promo = pool[0];
      if (!promo) break;
      const oldRole = promo.roleLevel;
      promo.roleLevel = t.role;
      promo.monthsSincePromotion = 0;
      promo.lastGrossPay = calculateMonthlyPay(promo, 1.0, comp.industryMultiplier);
      promo.lastTax = calculateMarginalTax(promo.lastGrossPay);
      promo.performanceScore = computeCitizenPerformance(promo);
      promo.mood = Math.round(clamp(promo.mood + 10, 0, 100) * 10) / 10;
      if (t.role === 'CEO') comp.ceoId = promo.id;

      const note = `Board internal promotion: ${promo.name} moved ${oldRole} → ${t.role} at ${comp.name}.`;
      promo.workHistory = [{ id: `wh_bp_${clock.totalDays}_${promo.id}`, dateLabel, companyId: comp.id, companyName: comp.name, role: t.role, kind: 'promoted' as const, note }, ...promo.workHistory].slice(0, 24);
      jobEvents.unshift({ id: `je_bp_${clock.totalDays}_${promo.id}`, dateLabel, kind: 'promoted', citizenId: promo.id, citizenName: promo.name, companyId: comp.id, companyName: comp.name, role: t.role, detail: note });
      events.push(makeCityEvent(clock, `bp_${promo.id}`, { type: 'board', citizenId: promo.id, citizenName: promo.name, companyId: comp.id, title: 'Board Seat Filled Internally', detail: note }));
      current += 1;
    }
  }
  rebuildCompanyBossTree(comp.id, citizens);
}

export function computeBoardMetrics(comp: Company, citizens: Citizen[]): BoardMetrics {
  const staff = citizens.filter((c) => c.alive && c.employerId === comp.id);
  const estMonthlyPayroll = Math.max(1, staff.reduce((s, e) => s + Math.max(300, e.lastGrossPay), 0));
  const reserveTarget = estMonthlyPayroll * 2;
  const requiredWithReserve = estMonthlyPayroll + reserveTarget;
  const shortfall = Math.max(0, Math.round(requiredWithReserve - comp.cash));
  const runwayMonths = Math.round((comp.cash / estMonthlyPayroll) * 100) / 100;
  const baseRev = comp.lastMonthRevenue > 0 ? comp.lastMonthRevenue : comp.monthlyRevenue;
  const payrollRatio = baseRev > 0 ? Math.round((estMonthlyPayroll / baseRev) * 100) : 120;
  const staffMood = staff.length > 0 ? Math.round(staff.reduce((s, e) => s + e.mood, 0) / staff.length) : 50;
  return { estMonthlyPayroll, reserveTarget, requiredWithReserve, shortfall, runwayMonths, payrollRatio, staffMood, headcount: staff.length };
}
