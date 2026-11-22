// boardVoteScoring.ts — Board option labels, candidate generation, and trait/memory option scoring

import type { BoardMetrics } from './boardSeats';
import type { BoardOptionId, CompanyBoardState } from './boardTypes';
import type { Company } from './companyTypes';
import { clamp } from './economy';
import { simRand } from './rng';
import type { Citizen } from './types';

export const BOARD_OPTION_LABELS: Record<BoardOptionId, string> = {
  watch: 'Watch & Hold',
  freeze: 'Hiring & Raise Freeze',
  board_contribution: 'Board Contribution Call',
  employee_ask: 'Employee Investment Ask',
  executive_pay_cut: 'Executive Pay Cut',
  company_pay_cut: 'Company-Wide Pay Cut',
  layoffs: 'Targeted Layoffs',
  restructuring: 'Restructure & Merge Roles',
  replace_ceo: 'Replace CEO',
  wind_down: 'Wind-Down Vote',
  unfreeze: 'Lift Hiring & Raise Freeze',
  restore_pay: 'Restore Cut Salaries',
  rehire: 'Authorize Rehiring',
};

export const SEVERE_BOARD_OPTIONS = new Set<BoardOptionId>([
  'executive_pay_cut', 'company_pay_cut', 'layoffs', 'restructuring', 'replace_ceo', 'wind_down',
]);

export function getCandidateOptions(
  comp: Company,
  metrics: BoardMetrics,
  board: CompanyBoardState,
  totalDays: number
): BoardOptionId[] {
  const opts: BoardOptionId[] = ['watch'];
  if (!comp.payFreeze) opts.push('freeze');
  if (metrics.shortfall > 0) opts.push('board_contribution', 'employee_ask');
  if (metrics.runwayMonths < 2.4 || comp.negativeProfitStreak >= 1) {
    if (board.executivePayCutPct < 15) opts.push('executive_pay_cut');
    if (board.companyPayCutPct < 15) opts.push('company_pay_cut');
    if (metrics.headcount > 8) opts.push('layoffs');
    if (board.restructuredLevel < 2 && metrics.headcount > 10) opts.push('restructuring');
  }
  if (comp.negativeProfitStreak >= 6) opts.push('replace_ceo');
  if (comp.negativeCashStreak >= 2 || (comp.cash < -5000 && totalDays > 60)) opts.push('wind_down');
  if (comp.positiveProfitStreak >= 2 && metrics.runwayMonths >= 1.6) {
    if (comp.payFreeze) opts.push('unfreeze');
    if (board.executivePayCutPct > 0 || board.companyPayCutPct > 0) opts.push('restore_pay');
    if (metrics.headcount < board.lastStaffTargetHeadcount) opts.push('rehire');
  }
  return opts;
}

export function scoreMemberOption(
  member: Citizen,
  opt: BoardOptionId,
  metrics: BoardMetrics,
  comp: Company,
  board: CompanyBoardState,
  cooldownActive: boolean
): { score: number; reason: string } {
  const { ambition, greed, kindness, loyalty, discipline } = member.traits;
  const urgency = clamp((2.5 - metrics.runwayMonths) * 20 + comp.negativeCashStreak * 18 + Math.max(0, metrics.payrollRatio - 85) * 0.6, 0, 75);
  const memNeg = member.memories.filter((m) => m.currentWeight < 0 && m.kind === 'board_contribution').reduce((s, m) => s + Math.abs(m.currentWeight), 0);
  const spareBonus = clamp((member.savings - 3000) / 400, -15, 22);
  let score = 20;
  let reason = 'Measured baseline fit';

  if (opt === 'watch') {
    score = 52 - urgency * 0.72 + (100 - discipline) * 0.12;
    reason = urgency > 30 ? 'Urgency makes waiting risky' : 'Runway healthy enough to monitor';
  } else if (opt === 'freeze') {
    score = 26 + urgency * 0.55 + discipline * 0.25 - greed * 0.08;
    reason = 'Caps wage growth without cutting headcount';
  } else if (opt === 'board_contribution') {
    score = 18 + urgency * 0.52 + (loyalty + kindness) * 0.28 - greed * 0.34 - memNeg * 0.4 + spareBonus;
    reason = greed > 65 ? 'Protects staff yet stings director cash' : 'Loyal injection stabilizes reserves directly';
  } else if (opt === 'employee_ask') {
    const repTerm = (comp.reputation - 50) * 0.25;
    score = 16 + urgency * 0.42 + greed * 0.16 - kindness * 0.15 + repTerm - (board.employeeInvestments.length > 8 ? 14 : 0);
    reason = 'Preserves director savings if staff still trust leadership';
  } else if (opt === 'executive_pay_cut') {
    score = 12 + urgency * 0.48 + kindness * 0.25 + discipline * 0.18 - greed * 0.38;
    reason = 'Leadership sacrifices pay first before touching floor wages';
  } else if (opt === 'company_pay_cut') {
    score = 10 + urgency * 0.56 + discipline * 0.2 - kindness * 0.16 + greed * 0.12;
    reason = 'Lowers payroll burn proportionally while sparing jobs';
  } else if (opt === 'layoffs') {
    score = 6 + urgency * 0.65 + greed * 0.24 - kindness * 0.32 - loyalty * 0.14;
    reason = kindness > 65 ? 'Reluctant cut despite payroll pressure' : 'Fastest immediate payroll reduction';
  } else if (opt === 'restructuring') {
    score = 8 + urgency * 0.5 + ambition * 0.2 + discipline * 0.18 - loyalty * 0.12;
    reason = 'Merges overlapping roles to lower structural cost';
  } else if (opt === 'replace_ceo') {
    const isCeo = member.roleLevel === 'CEO';
    score = isCeo ? -40 : 28 + comp.negativeProfitStreak * 6 + ambition * 0.25 - loyalty * 0.22;
    reason = isCeo ? 'Defends own leadership seat' : 'Two failing quarters triggered leadership review';
  } else if (opt === 'wind_down') {
    score = -10 + comp.negativeCashStreak * 28 - loyalty * 0.25 + (member.stress > 75 ? 16 : 0);
    reason = 'Stops compounding insolvency losses';
  } else {
    score = 38 + comp.positiveProfitStreak * 12 + kindness * 0.22 + (100 - metrics.staffMood) * 0.2;
    reason = 'Profits & runway support reversing crisis measures';
  }

  if (cooldownActive && SEVERE_BOARD_OPTIONS.has(opt)) score -= 45;
  score += (simRand() - 0.5) * 9;
  return { score: Math.round(score * 10) / 10, reason };
}
