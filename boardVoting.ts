// boardVoting.ts — Softmax probability roll, vote tallying, and CEO 2-2 tie-break

import type { BoardMetrics } from './boardSeats';
import type { BoardOptionId, BoardOptionProbability, CompanyBoardState } from './boardTypes';
import {
  BOARD_OPTION_LABELS,
  getCandidateOptions,
  scoreMemberOption,
  SEVERE_BOARD_OPTIONS,
} from './boardVoteScoring';
import type { Company } from './companyTypes';
import { simRand } from './rng';
import type { Citizen } from './types';

export { BOARD_OPTION_LABELS, SEVERE_BOARD_OPTIONS } from './boardVoteScoring';

export function runBoardVote(params: {
  members: Citizen[];
  comp: Company;
  metrics: BoardMetrics;
  board: CompanyBoardState;
  totalDays: number;
}): {
  options: BoardOptionProbability[];
  chosenOptionId: BoardOptionId;
  tieBrokenByCeo: boolean;
  memberTopMap: Map<string, BoardOptionId>;
} {
  const { members, comp, metrics, board, totalDays } = params;
  const cooldownActive = totalDays - board.lastSevereActionDay < 60;
  const candidates = getCandidateOptions(comp, metrics, board, totalDays);
  const memberVotes = new Map<string, { opt: BoardOptionId; reason: string; scores: Map<BoardOptionId, number> }>();

  const optionRows: BoardOptionProbability[] = candidates.map((opt) => ({
    optionId: opt,
    label: BOARD_OPTION_LABELS[opt],
    probability: 0,
    avgScore: 0,
    cooldownBlocked: cooldownActive && SEVERE_BOARD_OPTIONS.has(opt),
    voters: [],
  }));

  for (const m of members) {
    const rawScores = new Map<BoardOptionId, number>();
    const reasonMap = new Map<BoardOptionId, string>();
    for (const opt of candidates) {
      const res = scoreMemberOption(m, opt, metrics, comp, board, cooldownActive);
      rawScores.set(opt, res.score);
      reasonMap.set(opt, res.reason);
    }
    const eligible = candidates.filter((o) => !(cooldownActive && SEVERE_BOARD_OPTIONS.has(o)));
    const pool = eligible.length > 0 ? eligible : candidates;
    const maxS = Math.max(...pool.map((o) => rawScores.get(o) ?? 0));
    const exps = pool.map((o) => Math.exp(((rawScores.get(o) ?? 0) - maxS) / 12));
    const sumE = exps.reduce((a, b) => a + b, 0);
    let r = simRand() * sumE;
    let picked = pool[0];
    for (let i = 0; i < pool.length; i++) {
      r -= exps[i];
      if (r <= 0) { picked = pool[i]; break; }
    }
    memberVotes.set(m.id, { opt: picked, reason: reasonMap.get(picked) ?? '', scores: rawScores });
    const row = optionRows.find((o) => o.optionId === picked);
    if (row) row.voters.push({ citizenId: m.id, name: m.name, score: rawScores.get(picked) ?? 0, reason: reasonMap.get(picked) ?? '' });
  }

  for (const row of optionRows) {
    const scores = members.map((m) => memberVotes.get(m.id)?.scores.get(row.optionId) ?? 0);
    row.avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
  }

  const activeRows = optionRows.filter((r) => !r.cooldownBlocked);
  const normPool = activeRows.length > 0 ? activeRows : optionRows;
  const maxAvg = Math.max(...normPool.map((r) => r.avgScore));
  const rawW = normPool.map((r) => Math.exp((r.avgScore - maxAvg) / 12));
  const sumW = rawW.reduce((a, b) => a + b, 0) || 1;
  normPool.forEach((r, i) => { r.probability = Math.round((rawW[i] / sumW) * 100); });
  optionRows.sort((a, b) => b.voters.length - a.voters.length || b.probability - a.probability);

  const topCount = optionRows[0]?.voters.length ?? 0;
  const tied = optionRows.filter((r) => r.voters.length === topCount && topCount > 0);
  const ceo = members.find((m) => m.roleLevel === 'CEO');
  const ceoPick = ceo ? memberVotes.get(ceo.id)?.opt : undefined;
  let chosenOptionId = optionRows[0]?.optionId ?? 'watch';
  let tieBrokenByCeo = false;

  if (tied.length > 1 && ceoPick && tied.some((t) => t.optionId === ceoPick)) {
    chosenOptionId = ceoPick;
    tieBrokenByCeo = true;
  }
  const memberTopMap = new Map<string, BoardOptionId>();
  members.forEach((m) => { memberTopMap.set(m.id, memberVotes.get(m.id)?.opt ?? chosenOptionId); });
  return { options: optionRows, chosenOptionId, tieBrokenByCeo, memberTopMap };
}
