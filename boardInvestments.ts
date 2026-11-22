// boardInvestments.ts — Employee voluntary investment asks, principal repayments, and bankruptcy losses

import type { CompanyBoardState } from './boardTypes';
import { pushDecision, sumDecisionFactors } from './citizenDecisions';
import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import { appendCompanyLedger } from './companyLedger';
import type { Company } from './companyTypes';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { simIdSuffix, simRand, simRandFloat } from './rng';
import { estimateMonthlyShoppingCost } from './standards';
import type { Citizen, CityEvent } from './types';

function getEmployeeReserveFloor(c: Citizen): number {
  return Math.round((calculateFixedMonthlyCosts(c.homeType).total + estimateMonthlyShoppingCost(c.standards)) * 4);
}
type InvestChoice = 'refuse' | 'refuse_job_hunt' | 'wait_and_see' | 'small' | 'medium' | 'large' | 'all_in' | 'conditional' | 'reluctant';

function decideEmployeeInvest(
  emp: Citizen,
  comp: Company,
  spare: number,
  hadRecentBoardContrib: boolean
): { choice: InvestChoice; pct: number; reason: string; score: number } {
  const pastRepaid = emp.memories.filter((m) => m.kind === 'investment_repaid').length;
  const pastLost = emp.memories.filter((m) => m.kind === 'investment_lost').length;
  const { loyalty, kindness, greed, discipline, ambition } = emp.traits;
  const trustScore =
    loyalty * 0.45 + kindness * 0.2 + emp.bossRelationship * 0.35 + (comp.reputation - 50) * 0.4 +
    Math.min(18, emp.tenureMonths * 0.6) + pastRepaid * 16 - pastLost * 28 - greed * 0.35 -
    emp.stress * 0.22 + (emp.mood - 50) * 0.25 + (simRand() - 0.5) * 26;

  if (spare < 40 || trustScore < 12) {
    const hunt = emp.bossRelationship < -15 || emp.mood < 42 || (ambition > 62 && loyalty < 45);
    return {
      choice: hunt ? 'refuse_job_hunt' : 'refuse',
      pct: 0,
      reason: spare < 40 ? 'Savings near 4-month survival floor.' : hunt ? 'Low trust; refused and began job-hunting.' : 'Insufficient trust or excess greed to risk savings.',
      score: Math.round(trustScore),
    };
  }
  if (trustScore < 26 && discipline > 45 && simRand() < 0.55) {
    return { choice: 'wait_and_see', pct: 0, reason: 'Uncertain outlook; deferred decision until next month.', score: Math.round(trustScore) };
  }
  if (trustScore < 38 && simRand() < 0.45) {
    return { choice: 'reluctant', pct: simRandFloat(0.05, 0.1), reason: 'Invested small share under social pressure despite resentment.', score: Math.round(trustScore) };
  }
  if (trustScore < 54 && !hadRecentBoardContrib && simRand() < 0.48) {
    return { choice: 'conditional', pct: simRandFloat(0.12, 0.22), reason: 'Willing to invest only if directors or enough peers commit.', score: Math.round(trustScore) };
  }
  if (loyalty >= 86 && emp.bossRelationship >= 42 && pastLost === 0 && trustScore >= 76 && simRand() < 0.18) {
    return { choice: 'all_in', pct: 0.8, reason: 'Extreme loyalty and deep trust led to an all-in pledge.', score: Math.round(trustScore) };
  }
  if (trustScore >= 62 && spare >= 350) {
    return { choice: 'large', pct: simRandFloat(0.4, 0.6), reason: 'High loyalty & solid cushion backed a large stake.', score: Math.round(trustScore) };
  }
  if (trustScore >= 42) {
    return { choice: 'medium', pct: simRandFloat(0.15, 0.3), reason: 'Balanced loyalty & trust supported a medium stake.', score: Math.round(trustScore) };
  }
  return { choice: 'small', pct: simRandFloat(0.05, 0.1), reason: 'Modest goodwill stake while protecting personal savings.', score: Math.round(trustScore) };
}

export function runEmployeeInvestmentAsk(params: {
  comp: Company;
  citizens: Citizen[];
  board: CompanyBoardState;
  targetIds?: string[];
  hadRecentBoardContrib: boolean;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): { raised: number; participants: number; refused: number; waiting: number } {
  const { comp, citizens, board, targetIds, hadRecentBoardContrib, clock, dateLabel, events } = params;
  const nonBoard = citizens.filter((c) => {
    if (!c.alive || c.employerId !== comp.id) return false;
    if (c.roleLevel === 'CEO' || c.roleLevel === 'Executive') return false;
    return targetIds ? targetIds.includes(c.id) : true;
  });

  const evals = nonBoard.map((emp) => {
    const spare = Math.max(0, emp.savings - getEmployeeReserveFloor(emp));
    return { emp, spare, res: decideEmployeeInvest(emp, comp, spare, hadRecentBoardContrib) };
  });

  const committedCount = evals.filter((e) => ['small', 'medium', 'large', 'all_in', 'reluctant'].includes(e.res.choice)).length;
  const peerReady = nonBoard.length > 0 && committedCount / nonBoard.length >= 0.32;
  let raised = 0, participants = 0, refused = 0, waiting = 0;
  const nextPending: string[] = [];

  for (const { emp, spare, res } of evals) {
    let amount = 0;
    let chosenLabel = res.choice.replace(/_/g, ' ');
    if (res.choice === 'wait_and_see') {
      waiting += 1;
      nextPending.push(emp.id);
    } else if (res.choice === 'refuse_job_hunt') {
      refused += 1;
      emp.jobHunting = true;
      emp.mood = Math.round(clamp(emp.mood - 4, 0, 100) * 10) / 10;
    } else if (res.choice === 'refuse') {
      refused += 1;
    } else if (res.choice === 'conditional' && !hadRecentBoardContrib && !peerReady) {
      refused += 1;
      chosenLabel = 'conditional declined (low peer/boss backing)';
    } else {
      amount = Math.min(spare, Math.round(spare * res.pct));
      if (amount >= 10) {
        participants += 1;
        raised += amount;
        emp.savings = Math.max(0, Math.round(emp.savings - amount));
        board.employeeInvestments.push({ id: `inv_${clock.totalDays}_${emp.id}_${simIdSuffix()}`, citizenId: emp.id, citizenName: emp.name, principal: amount, repaid: 0, status: 'active', investedDay: clock.totalDays });
        appendLedgerEntry(emp, clock.totalDays, dateLabel, 'expense', 'Investment', `Employee investment in ${comp.name}`, amount);
        appendLifeLog(emp, clock.totalDays, dateLabel, 'money', `Invested ${formatDelta(amount)} (${res.choice}) in ${comp.name}.`);
        if (res.choice === 'reluctant') {
          emp.mood = Math.round(clamp(emp.mood - 6, 0, 100) * 10) / 10;
          emp.bossRelationship = Math.round(clamp(emp.bossRelationship - 10, -100, 100));
          addCitizenMemory(emp, clock, dateLabel, 'employee_investment', `Reluctantly invested ${formatDelta(amount)} into ${comp.name}.`, -14);
        } else {
          addCitizenMemory(emp, clock, dateLabel, 'employee_investment', `Invested ${formatDelta(amount)} to back ${comp.name}.`, 8);
        }
      } else refused += 1;
    }

    const factors = [
      { label: 'Trust & Loyalty Score', value: res.score },
      { label: 'Spare Savings Above Floor', value: Math.round(Math.min(30, spare / 100)) },
      { label: 'Boss Relationship', value: Math.round(emp.bossRelationship * 0.3) },
    ];
    pushDecision(emp, {
      totalDay: clock.totalDays, dateLabel, kind: 'employee_investment', category: 'status',
      title: `${comp.name} Employee Investment Ask`, chosenOption: chosenLabel, chosenReason: res.reason, linkedMemoryIds: [],
      options: [{ label: chosenLabel, totalScore: sumDecisionFactors(factors), chosen: true, factors }],
    });
  }

  board.pendingEmployeeAskIds = nextPending;
  if (raised > 0) {
    comp.cash = Math.round((comp.cash + raised) * 100) / 100;
    appendCompanyLedger(comp, clock, dateLabel, { kind: 'inflow', category: 'employee_investment', label: 'Employee Investment Drive', detail: `${participants} worker(s) backed reserves`, amount: raised, balanceAfter: comp.cash });
  }
  if (comp.cash >= 0) comp.negativeCashStreak = 0;
  events.push(makeCityEvent(clock, `empinv_${comp.id}`, {
    type: 'investment', companyId: comp.id, title: `${comp.name} Employee Investment Drive`,
    detail: `Raised ${formatDelta(raised)} from ${participants} worker(s) · ${waiting} wait-and-see · ${refused} refused.`,
  }));
  return { raised, participants, refused, waiting };
}
