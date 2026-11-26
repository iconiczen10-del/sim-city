// boardEngine.ts — Orchestrates Vij Industries monthly & emergency board meetings, pay restores, and seat filling

import { executeBoardResolution } from './boardActions';
import { runEmployeeInvestmentAsk } from './boardInvestments';
import { repayEmployeeInvestmentsMonthly } from './boardRepayments';
import { computeBoardMetrics, fillVacantBoardSeatsInternally, resolveBoardMembers } from './boardSeats';
import { generateMeetingTranscript } from './boardTranscriptGen';
import type { BoardMeeting, CompanyBoardState } from './boardTypes';
import { BOARD_OPTION_LABELS, runBoardVote } from './boardVoting';
import { addCitizenMemory } from './citizenMemory';
import type { Company, CompanyVacancy, JobMarketEvent } from './companyTypes';
import { DAYS_PER_MONTH } from './constants';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatSimDate } from './formatters';
import { openVacancy } from './jobScoring';
import { simRand } from './rng';
import type { Citizen, CityEvent } from './types';

function checkGreedyResignations(
  comp: Company,
  members: Citizen[],
  vacancies: CompanyVacancy[],
  jobEvents: JobMarketEvent[],
  clock: SimClock,
  dateLabel: string,
  events: CityEvent[]
): void {
  for (const m of members) {
    if (m.roleLevel === 'CEO' || m.roleLevel === 'Unemployed' || m.roleLevel === 'Retired') continue;
    const recentResent = m.memories.some((mem) => mem.kind === 'board_contribution' && mem.currentWeight <= -18 && clock.totalDays - mem.totalDay <= 2);
    if (recentResent && m.traits.greed >= 76 && m.mood < 42 && simRand() < 0.45) {
      const oldRole = m.roleLevel;
      m.employerId = null; m.bossId = null; m.roleLevel = 'Unemployed'; m.lastGrossPay = 0; m.lastTax = 0;
      addCitizenMemory(m, clock, dateLabel, 'loss', `Resigned from ${comp.name} board in protest of compulsory cash calls.`, -22);
      openVacancy(vacancies, comp, oldRole, `${m.name} resigned from board`, clock, dateLabel);
      jobEvents.unshift({ id: `je_bres_${clock.totalDays}_${m.id}`, dateLabel, kind: 'quit', citizenId: m.id, citizenName: m.name, companyId: comp.id, companyName: comp.name, role: oldRole, detail: `${m.name} resigned from ${comp.name} board.` });
      events.push(makeCityEvent(clock, `bres_${m.id}`, { type: 'board', citizenId: m.id, citizenName: m.name, companyId: comp.id, title: 'Board Director Resigned', detail: `${m.name} resigned from ${comp.name} after bitter board cash call.` }));
    }
  }
}

export function runVijIndustriesBoardStep(params: {
  companies: Company[];
  citizens: Citizen[];
  board: CompanyBoardState;
  vacancies: CompanyVacancy[];
  jobEvents: JobMarketEvent[];
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
  isMonthEnd: boolean;
  lastMeeting?: BoardMeeting;
}): BoardMeeting | null {
  const { companies, citizens, board, vacancies, jobEvents, clock, dateLabel, events, isMonthEnd, lastMeeting } = params;
  const comp = companies.find((c) => c.id === 'vijindustries');
  if (!comp || comp.bankrupt) return null;

  if (isMonthEnd) {
    fillVacantBoardSeatsInternally({ comp, citizens, vacancies, jobEvents, clock, dateLabel, events });
    if (board.pendingEmployeeAskIds.length > 0) {
      runEmployeeInvestmentAsk({ comp, citizens, board, targetIds: board.pendingEmployeeAskIds, hadRecentBoardContrib: board.totalBoardContributions > 0, clock, dateLabel, events });
    }
    const m0 = computeBoardMetrics(comp, citizens);
    if (comp.positiveProfitStreak >= 2 && (board.executivePayCutPct > 0 || board.companyPayCutPct > 0)) {
      board.executivePayCutPct = 0;
      board.companyPayCutPct = 0;
      events.push(makeCityEvent(clock, `prestore_${comp.id}`, { type: 'board', companyId: comp.id, title: 'Vij Industries Salaries Restored', detail: '2+ profitable months triggered automatic pay-cut restoration.' }));
    }
    repayEmployeeInvestmentsMonthly({ comp, citizens, board, reserveTarget: m0.reserveTarget, clock, dateLabel, events });
  }

  const metrics = computeBoardMetrics(comp, citizens);
  const dueRegular = isMonthEnd && clock.totalDays >= board.nextMeetingDay;
  const dueEmergency = !dueRegular && (comp.cash < 0 || metrics.runwayMonths < 0.85) && clock.totalDays - board.lastEmergencyDay >= 8 && clock.totalDays > 5;
  if (!dueRegular && !dueEmergency) return null;

  const kind: 'regular' | 'emergency' = dueEmergency ? 'emergency' : 'regular';
  const { seats, members } = resolveBoardMembers(citizens);
  if (members.length === 0) return null;

  const cashAtStart = Math.round(comp.cash * 100) / 100;
  const voteRes = runBoardVote({ members, comp, metrics, board, totalDays: clock.totalDays });
  const chosenLabel = BOARD_OPTION_LABELS[voteRes.chosenOptionId];

  const transcript = generateMeetingTranscript({
    comp, members, citizens, board, metrics, options: voteRes.options,
    chosenOptionId: voteRes.chosenOptionId, memberTopMap: voteRes.memberTopMap,
    tieBrokenByCeo: voteRes.tieBrokenByCeo, kind, totalDay: clock.totalDays, pastMeeting: lastMeeting,
  });

  const actionRes = executeBoardResolution({
    optionId: voteRes.chosenOptionId, comp, citizens, members, board, metrics,
    vacancies, jobEvents, clock, dateLabel, events,
  });

  if (voteRes.chosenOptionId === 'board_contribution') {
    checkGreedyResignations(comp, members, vacancies, jobEvents, clock, dateLabel, events);
  }

  seats.forEach((s) => { s.topOptionId = s.citizenId ? voteRes.memberTopMap.get(s.citizenId) : undefined; });
  board.lastMeetingDay = clock.totalDays;
  if (kind === 'regular') board.nextMeetingDay = clock.totalDays + DAYS_PER_MONTH;
  else board.lastEmergencyDay = clock.totalDays;
  board.unreadMeetingCount += 1;

  const meeting: BoardMeeting = {
    id: `mtg_${clock.totalDays}_${kind}`,
    totalDay: clock.totalDays,
    dateLabel: formatSimDate(clock.day, clock.month, clock.year),
    kind,
    read: false,
    cashAtStart,
    cashAtEnd: Math.round(comp.cash * 100) / 100,
    runwayMonths: metrics.runwayMonths,
    payrollRatio: metrics.payrollRatio,
    profitStreak: comp.positiveProfitStreak > 0 ? comp.positiveProfitStreak : -comp.negativeProfitStreak,
    negativeCashStreak: comp.negativeCashStreak,
    reputation: comp.reputation,
    staffMood: metrics.staffMood,
    seats,
    options: voteRes.options,
    chosenOptionId: voteRes.chosenOptionId,
    chosenLabel,
    tieBrokenByCeo: voteRes.tieBrokenByCeo,
    outcomeSummary: actionRes.outcomeSummary,
    contributionSummary: actionRes.contributionSummary,
    transcript,
  };

  events.push(makeCityEvent(clock, `bmtg_${meeting.id}`, {
    type: 'board',
    companyId: comp.id,
    title: `Vij Industries ${kind === 'emergency' ? 'Emergency ' : ''}Board Meeting`,
    detail: `Resolved "${chosenLabel}"${voteRes.tieBrokenByCeo ? ' (2-2 CEO tie-break)' : ''}. ${actionRes.outcomeSummary}`,
  }));
  return meeting;
}
