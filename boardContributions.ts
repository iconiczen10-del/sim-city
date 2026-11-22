// boardContributions.ts — Compulsory shared board contributions (5k–10k danger, 10k–25k crisis, no survival floor)

import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import type { BoardContributionSummary, CompanyBoardState } from './boardTypes';
import { appendCompanyLedger } from './companyLedger';
import type { Company } from './companyTypes';
import { clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import type { Citizen, CityEvent } from './types';

export function computeBoardContributionAsk(
  comp: Company,
  requiredCash: number,
  runwayMonths: number
): { targetCall: number; isSevereCrisis: boolean; shortfall: number } {
  const shortfall = Math.max(0, Math.round(requiredCash - comp.cash));
  const isSevereCrisis =
    comp.cash < 0 ||
    comp.negativeCashStreak >= 1 ||
    runwayMonths < 0.7 ||
    (comp.negativeProfitStreak >= 3 && comp.cash < 15000);

  if (isSevereCrisis) {
    const extra = Math.min(15000, Math.round(shortfall * 0.3 + comp.negativeCashStreak * 4500 + (comp.cash < 0 ? Math.abs(comp.cash) * 0.6 : 0)));
    return { targetCall: clamp(10000 + extra, 10000, 25000), isSevereCrisis: true, shortfall };
  }
  const extra = Math.min(5000, Math.round(shortfall * 0.12));
  return { targetCall: clamp(5000 + extra, 5000, 10000), isSevereCrisis: false, shortfall };
}

export function executeCompulsoryBoardContribution(params: {
  comp: Company;
  members: Citizen[];
  board: CompanyBoardState;
  requiredCash: number;
  runwayMonths: number;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): BoardContributionSummary {
  const { comp, members, board, requiredCash, runwayMonths, clock, dateLabel, events } = params;
  const { targetCall, isSevereCrisis, shortfall } = computeBoardContributionAsk(comp, requiredCash, runwayMonths);
  const ceo = members.find((m) => m.roleLevel === 'CEO');

  const count = Math.max(1, members.length);
  const baseShare = Math.floor(targetCall / count);
  let remainder = targetCall - baseShare * count;
  const rows = members.map((m) => {
    const share = baseShare + (remainder-- > 0 ? 1 : 0);
    const available = Math.max(0, Math.round(m.savings));
    const paid = Math.min(available, share);
    return { m, share, paid, defaulted: Math.max(0, share - paid) };
  });

  // Redistribute unpaid shortfalls across board members who still have savings
  let unpaidPool = rows.reduce((s, r) => s + r.defaulted, 0);
  if (unpaidPool > 0) {
    for (let pass = 0; pass < 4 && unpaidPool > 0; pass++) {
      const totalRoom = rows.reduce((s, r) => s + Math.max(0, Math.round(r.m.savings) - r.paid), 0);
      if (totalRoom <= 0) break;
      let absorbed = 0;
      for (const r of rows) {
        const room = Math.max(0, Math.round(r.m.savings) - r.paid);
        if (room <= 0) continue;
        const extra = Math.min(room, Math.ceil((unpaidPool * room) / totalRoom), unpaidPool - absorbed);
        r.paid += extra;
        absorbed += extra;
      }
      if (absorbed <= 0) break;
      unpaidPool -= absorbed;
    }
  }

  let totalContributed = 0;
  let totalDefaulted = 0;
  const memberPayments: BoardContributionSummary['memberPayments'] = [];

  for (const row of rows) {
    const { m, paid, defaulted } = row;
    totalContributed += paid;
    totalDefaulted += defaulted;
    let reaction = 'Fulfilled compulsory board share';

    if (paid > 0) {
      m.savings = Math.max(0, Math.round(m.savings - paid));
      appendLedgerEntry(m, clock.totalDays, dateLabel, 'expense', 'Board Contribution', `Compulsory ${isSevereCrisis ? 'crisis' : 'danger'} call for ${comp.name}`, paid);
      appendLifeLog(m, clock.totalDays, dateLabel, 'money', `Paid compulsory board share of ${formatDelta(paid)} into ${comp.name}.`);

      if (m.traits.kindness + m.traits.loyalty >= 115) {
        m.respect = Math.round(clamp(m.respect + 3, 0, 100) * 10) / 10;
        addCitizenMemory(m, clock, dateLabel, 'board_contribution', `Stepped up with ${formatDelta(paid)} to keep ${comp.name} solvent.`, 16);
        reaction = 'Gained respect & stood loyal';
      } else if (m.traits.greed >= 65) {
        const moodHit = Math.round(6 + (m.traits.greed - 60) * 0.22);
        const stressHit = Math.round(6 + (m.traits.greed - 60) * 0.2);
        m.mood = Math.round(clamp(m.mood - moodHit, 0, 100) * 10) / 10;
        m.stress = Math.round(clamp(m.stress + stressHit, 0, 100) * 10) / 10;
        if (ceo && m.id !== ceo.id) m.bossRelationship = Math.round(clamp(m.bossRelationship - 14, -100, 100));
        addCitizenMemory(m, clock, dateLabel, 'board_contribution', `Forced to pay ${formatDelta(paid)} in compulsory board cash call.`, -26);
        reaction = m.traits.greed > 78 && m.mood < 42 ? 'Resentful — weighs board resignation' : 'Paid with deep resentment';
      } else {
        addCitizenMemory(m, clock, dateLabel, 'board_contribution', `Paid compulsory ${formatDelta(paid)} share into ${comp.name}.`, -10);
        reaction = 'Accepted compulsory share';
      }
    } else {
      reaction = defaulted > 0 ? `Zero cash left (short ${formatDelta(defaulted)})` : 'Zero savings available';
    }
    memberPayments.push({ citizenId: m.id, name: m.name, paid, defaulted, reaction });
  }

  comp.cash = Math.round((comp.cash + totalContributed) * 100) / 100;
  board.totalBoardContributions = Math.round((board.totalBoardContributions + totalContributed) * 100) / 100;
  if (totalContributed > 0) {
    appendCompanyLedger(comp, clock, dateLabel, { kind: 'inflow', category: 'capital_call', label: isSevereCrisis ? 'Crisis Board Capital Call' : 'Board Capital Call', detail: `Compulsory ${isSevereCrisis ? '10k–25k crisis' : '5k–10k danger'} share`, amount: totalContributed, balanceAfter: comp.cash });
  }
  if (comp.cash >= 0) comp.negativeCashStreak = 0;

  if (totalContributed > 0 || totalDefaulted > 0) {
    events.push(makeCityEvent(clock, `bcontrib_${comp.id}`, {
      type: 'contribution',
      companyId: comp.id,
      title: `${comp.name} ${isSevereCrisis ? 'Crisis ' : ''}Board Contribution`,
      detail: `Board compulsorily injected ${formatDelta(totalContributed)} (target ${formatDelta(targetCall)}, unpaid ${formatDelta(unpaidPool)}).`,
    }));
  }

  return { requiredCash, shortfall, totalContributed, totalDefaulted: unpaidPool, memberPayments };
}
