// boardVoteScoring.ts — Danger-triggered options and anti-bankruptcy board scoring logic

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
  const inDanger =
    comp.cash < metrics.estMonthlyPayroll * 1.15 ||
    metrics.runwayMonths < 1.15 ||
    comp.negativeCashStreak >= 1 ||
    comp.negativeProfitStreak >= 2;
  const opts: BoardOptionId[] = ['watch'];
  if (!comp.payFreeze && (inDanger || metrics.payrollRatio > 92 || comp.negativeProfitStreak >= 1)) opts.push('freeze');
  if (inDanger) opts.push('board_contribution');
  if (inDanger || (metrics.shortfall > 0 && metrics.runwayMonths < 1.6)) opts.push('employee_ask');
  if (inDanger || metrics.payrollRatio > 95 || comp.negativeProfitStreak >= 1) {
    if (board.executivePayCutPct < 20) opts.push('executive_pay_cut');
    if (board.companyPayCutPct < 15) opts.push('company_pay_cut');
    if (metrics.headcount > 8) opts.push('layoffs');
    if (board.restructuredLevel < 2 && metrics.headcount > 10) opts.push('restructuring');
  }
  if (comp.negativeProfitStreak >= 6) opts.push('replace_ceo');
  if (comp.negativeCashStreak >= 2 && totalDays > 60) opts.push('wind_down');
  if (comp.positiveProfitStreak >= 2 && metrics.runwayMonths >= 1.4 && !inDanger) {
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
  const cashLow = comp.cash < metrics.estMonthlyPayroll * 1.15 || metrics.runwayMonths < 1.15;
  const reallyBad = comp.cash < 0 || comp.negativeCashStreak >= 1 || metrics.runwayMonths < 0.7;
  const burnHigh = Math.max(0, metrics.payrollRatio - 88);
  const urgency = clamp((2.0 - metrics.runwayMonths) * 24 + comp.negativeCashStreak * 25 + burnHigh * 0.75 + (comp.cash < 0 ? 22 : 0), 0, 95);
  const memNeg = member.memories.filter((m) => m.currentWeight < 0 && m.kind === 'board_contribution').reduce((s, m) => s + Math.abs(m.currentWeight), 0);
  const cashBonus = clamp((member.savings - 2500) / 450, -10, 20);
  let score = 20;
  let reason = 'Measured baseline fit';

  if (opt === 'watch') {
    score = 54 - urgency * 0.85 - (cashLow ? 16 : 0) - (reallyBad ? 28 : 0) + (100 - discipline) * 0.1;
    reason = urgency > 28 ? 'Danger is too acute to wait passively' : 'Cash & profits allow steady monitoring';
  } else if (opt === 'freeze') {
    score = 26 + urgency * 0.55 + discipline * 0.25 - greed * 0.06;
    reason = 'Caps wage growth to defend solvency';
  } else if (opt === 'board_contribution') {
    score = (reallyBad ? 46 : 26) + urgency * 0.55 + (loyalty + discipline) * 0.25 - greed * 0.22 - memNeg * 0.3 + cashBonus;
    reason = reallyBad ? 'Emergency compulsory cash call to prevent bankruptcy' : 'Low cash requires compulsory board injection';
  } else if (opt === 'employee_ask') {
    const repTerm = (comp.reputation - 50) * 0.25;
    score = 16 + urgency * 0.4 + greed * 0.14 - kindness * 0.14 + repTerm - (board.employeeInvestments.length > 8 ? 14 : 0);
    reason = 'Raises worker liquidity if staff still trust leadership';
  } else if (opt === 'executive_pay_cut') {
    score = 18 + urgency * 0.52 + kindness * 0.22 + discipline * 0.22 - greed * 0.34;
    reason = 'Leadership cuts own pay to fight losses';
  } else if (opt === 'company_pay_cut') {
    score = 22 + urgency * 0.6 + discipline * 0.24 - kindness * 0.14 + greed * 0.1;
    reason = 'Cuts monthly payroll burn below revenue to prevent bankruptcy';
  } else if (opt === 'layoffs') {
    score = 16 + urgency * 0.62 + burnHigh * 0.4 + greed * 0.2 - kindness * 0.28 - loyalty * 0.12;
    reason = kindness > 65 ? 'Reluctant layoff to keep the factory solvent' : 'Trims payroll burn immediately for survival';
  } else if (opt === 'restructuring') {
    score = 14 + urgency * 0.52 + ambition * 0.2 + discipline * 0.2 - loyalty * 0.1;
    reason = 'Streamlines teams to restore sustainable margins';
  } else if (opt === 'replace_ceo') {
    const isCeo = member.roleLevel === 'CEO';
    score = isCeo ? -45 : 26 + comp.negativeProfitStreak * 6 + ambition * 0.25 - loyalty * 0.22;
    reason = isCeo ? 'Defends own leadership seat' : 'Repeated losses require new leadership';
  } else if (opt === 'wind_down') {
    score = -40 + (comp.negativeCashStreak >= 2 ? 22 : -25) - loyalty * 0.35 + (member.stress > 80 ? 12 : 0);
    reason = 'Last-resort closure only if rescue paths fail';
  } else {
    score = 40 + comp.positiveProfitStreak * 12 + kindness * 0.22 + (100 - metrics.staffMood) * 0.2;
    reason = 'Sustained profits & healthy cash justify restoring benefits';
  }

  const emergencyOverride = reallyBad && (opt === 'company_pay_cut' || opt === 'layoffs' || opt === 'executive_pay_cut');
  if (cooldownActive && SEVERE_BOARD_OPTIONS.has(opt) && !emergencyOverride) score -= 45;
  score += (simRand() - 0.5) * 8;
  return { score: Math.round(score * 10) / 10, reason };
}
