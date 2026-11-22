// boardActions.ts — Executes winning Vij Industries board resolutions (cuts, CEO swap, recovery)

import { executeCompulsoryBoardContribution } from './boardContributions';
import { runEmployeeInvestmentAsk } from './boardInvestments';
import { layoffOneEmployee } from './boardLayoffs';
import { wipeEmployeeInvestmentsOnBankruptcy } from './boardRepayments';
import type { BoardMetrics } from './boardSeats';
import type { BoardContributionSummary, BoardOptionId, CompanyBoardState } from './boardTypes';
import { SEVERE_BOARD_OPTIONS } from './boardVoting';
import { addCitizenMemory } from './citizenMemory';
import { computeCitizenPerformance } from './companyRules';
import { rebuildCompanyBossTree } from './companySetup';
import type { Company, CompanyVacancy, JobMarketEvent } from './companyTypes';
import { calculateMarginalTax, calculateMonthlyPay, clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { openVacancy } from './jobScoring';
import type { Citizen, CityEvent } from './types';

export function executeBoardResolution(params: {
  optionId: BoardOptionId;
  comp: Company;
  citizens: Citizen[];
  members: Citizen[];
  board: CompanyBoardState;
  metrics: BoardMetrics;
  vacancies: CompanyVacancy[];
  jobEvents: JobMarketEvent[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): { outcomeSummary: string; contributionSummary?: BoardContributionSummary } {
  const { optionId, comp, citizens, members, board, metrics, vacancies, jobEvents, clock, dateLabel, events } = params;
  if (SEVERE_BOARD_OPTIONS.has(optionId)) board.lastSevereActionDay = clock.totalDays;

  if (optionId === 'watch') return { outcomeSummary: 'Board maintained steady watch; no structural changes ordered.' };
  if (optionId === 'freeze') {
    comp.payFreeze = true;
    return { outcomeSummary: 'Ordered immediate hiring & raise freeze across Vij Industries.' };
  }
  if (optionId === 'board_contribution') {
    const summary = executeCompulsoryBoardContribution({ comp, members, board, requiredCash: metrics.requiredWithReserve, clock, dateLabel, events });
    return { outcomeSummary: `Compulsory board capital call raised ${formatDelta(summary.totalContributed)} (defaulted ${formatDelta(summary.totalDefaulted)}).`, contributionSummary: summary };
  }
  if (optionId === 'employee_ask') {
    const res = runEmployeeInvestmentAsk({ comp, citizens, board, hadRecentBoardContrib: board.totalBoardContributions > 0, clock, dateLabel, events });
    return { outcomeSummary: `Employee investment drive raised ${formatDelta(res.raised)} from ${res.participants} staff (${res.waiting} wait-and-see).` };
  }
  if (optionId === 'executive_pay_cut') {
    board.executivePayCutPct = clamp(board.executivePayCutPct + 10, 5, 25);
    events.push(makeCityEvent(clock, `exec_cut_${comp.id}`, { type: 'pay-cut', companyId: comp.id, title: 'Executive Pay Cut Passed', detail: `Board cut CEO & Executive pay by ${board.executivePayCutPct}%.` }));
    return { outcomeSummary: `Reduced CEO & Executive salaries by ${board.executivePayCutPct}%.` };
  }
  if (optionId === 'company_pay_cut') {
    const step = metrics.runwayMonths < 1.2 ? 12 : 8;
    board.companyPayCutPct = clamp(Math.max(5, board.companyPayCutPct + step), 5, 15);
    citizens.filter((c) => c.alive && c.employerId === comp.id).forEach((e) => {
      e.mood = Math.round(clamp(e.mood - 6, 0, 100) * 10) / 10;
    });
    events.push(makeCityEvent(clock, `comp_cut_${comp.id}`, { type: 'pay-cut', companyId: comp.id, title: 'Company-Wide Pay Cut', detail: `${comp.name} enacted a ${board.companyPayCutPct}% pay cut (restores on 2 profitable months).` }));
    return { outcomeSummary: `Enacted ${board.companyPayCutPct}% company-wide pay cut (restores after 2 green months).` };
  }
  if (optionId === 'layoffs') {
    const cutCount = metrics.runwayMonths < 1 ? 2 : 1;
    const names: string[] = [];
    for (let i = 0; i < cutCount; i++) {
      const cut = layoffOneEmployee(comp, citizens, jobEvents, clock, dateLabel, events);
      if (cut) names.push(cut.name);
    }
    rebuildCompanyBossTree(comp.id, citizens);
    return { outcomeSummary: names.length ? `Laid off ${names.join(', ')} (weakest performance, no severance).` : 'Layoffs authorized, no non-critical seats cut.' };
  }
  if (optionId === 'restructuring') {
    board.restructuredLevel += 1;
    const cut = layoffOneEmployee(comp, citizens, jobEvents, clock, dateLabel, events);
    comp.reputation = Math.round(clamp(comp.reputation - 2, 0, 100) * 10) / 10;
    rebuildCompanyBossTree(comp.id, citizens);
    return { outcomeSummary: `Restructured teams & merged overlapping roles${cut ? ` (released ${cut.name})` : ''}.` };
  }
  if (optionId === 'replace_ceo') {
    const oldCeo = members.find((m) => m.roleLevel === 'CEO');
    const nextCeo = citizens.filter((c) => c.alive && c.employerId === comp.id && c.roleLevel === 'Executive').sort((a, b) => b.performanceScore - a.performanceScore)[0];
    if (oldCeo && nextCeo) {
      oldCeo.employerId = null; oldCeo.bossId = null; oldCeo.roleLevel = 'Unemployed'; oldCeo.lastGrossPay = 0; oldCeo.lastTax = 0;
      addCitizenMemory(oldCeo, clock, dateLabel, 'loss', `Ousted as CEO of ${comp.name} after two failing quarters.`, -45);
      nextCeo.roleLevel = 'CEO'; nextCeo.lastGrossPay = calculateMonthlyPay(nextCeo, 1, comp.industryMultiplier); nextCeo.lastTax = calculateMarginalTax(nextCeo.lastGrossPay); nextCeo.performanceScore = computeCitizenPerformance(nextCeo);
      comp.ceoId = nextCeo.id;
      rebuildCompanyBossTree(comp.id, citizens);
      events.push(makeCityEvent(clock, `repceo_${comp.id}`, { type: 'board', citizenId: nextCeo.id, citizenName: nextCeo.name, companyId: comp.id, title: 'CEO Replaced by Board', detail: `${nextCeo.name} succeeded ${oldCeo.name} as Vij Industries CEO.` }));
      return { outcomeSummary: `Replaced CEO ${oldCeo.name} with Executive ${nextCeo.name}.` };
    }
    return { outcomeSummary: 'Board reviewed CEO leadership; no qualified replacement seated.' };
  }
  if (optionId === 'wind_down') {
    comp.bankrupt = true;
    wipeEmployeeInvestmentsOnBankruptcy(comp, citizens, board, clock, dateLabel, events);
    citizens.filter((c) => c.alive && c.employerId === comp.id).forEach((e) => {
      e.employerId = null; e.bossId = null; e.roleLevel = 'Unemployed'; e.lastGrossPay = 0; e.lastTax = 0; e.performanceScore = 0;
      addCitizenMemory(e, clock, dateLabel, 'loss', `Lost employment when ${comp.name} board voted to wind down.`, -45);
    });
    events.push(makeCityEvent(clock, `winddown_${comp.id}`, { type: 'bankruptcy', companyId: comp.id, title: `${comp.name} Wound Down`, detail: 'Board voted to wind down insolvent operations.' }));
    return { outcomeSummary: 'Board voted to wind down Vij Industries; operations closed.' };
  }
  if (optionId === 'unfreeze') {
    comp.payFreeze = false;
    return { outcomeSummary: 'Lifted hiring & raise freeze after sustained profitable recovery.' };
  }
  if (optionId === 'restore_pay') {
    board.executivePayCutPct = 0;
    board.companyPayCutPct = 0;
    citizens.filter((c) => c.alive && c.employerId === comp.id).forEach((e) => {
      e.mood = Math.round(clamp(e.mood + 8, 0, 100) * 10) / 10;
    });
    return { outcomeSummary: 'Restored executive & staff salaries to 100% baseline.' };
  }
  openVacancy(vacancies, comp, 'Entry', 'Board authorized recovery rehiring', clock, dateLabel);
  return { outcomeSummary: 'Authorized recovery hiring for open floor vacancies.' };
}
