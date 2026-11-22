// boardContributions.ts — Compulsory weighted board contributions with survival floor, defaults, and reactions

import { appendLedgerEntry, appendLifeLog } from './citizenLedger';
import { addCitizenMemory } from './citizenMemory';
import type { BoardContributionSummary, CompanyBoardState } from './boardTypes';
import type { Company } from './companyTypes';
import { calculateFixedMonthlyCosts, clamp } from './economy';
import { makeCityEvent, type SimClock } from './eventFactory';
import { formatDelta } from './formatters';
import { estimateMonthlyShoppingCost } from './standards';
import type { Citizen, CityEvent } from './types';

export function getMemberSurvivalFloor(c: Citizen): number {
  const fixed = calculateFixedMonthlyCosts(c.homeType).total;
  const shop = estimateMonthlyShoppingCost(c.standards);
  return Math.round((fixed + shop) * 4);
}

export function executeCompulsoryBoardContribution(params: {
  comp: Company;
  members: Citizen[];
  board: CompanyBoardState;
  requiredCash: number;
  clock: SimClock;
  dateLabel: string;
  events: CityEvent[];
}): BoardContributionSummary {
  const { comp, members, board, requiredCash, clock, dateLabel, events } = params;
  const shortfall = Math.max(0, Math.round(requiredCash - comp.cash));
  const ceo = members.find((m) => m.roleLevel === 'CEO');

  const caps = members.map((m) => {
    const floor = getMemberSurvivalFloor(m);
    const spare = Math.max(0, m.savings - floor);
    return { m, spare, maxCap: Math.round(spare * 0.38), paid: 0, defaulted: 0 };
  });

  let remainingAsk = shortfall;
  const totalSpare = caps.reduce((s, x) => s + x.spare, 0);

  if (shortfall > 0 && totalSpare > 0) {
    // First pass: weighted by spare savings; track defaults when cap exceeded
    let poolRedistribute = 0;
    for (const row of caps) {
      const targetShare = Math.round((shortfall * row.spare) / totalSpare);
      const actual = Math.min(targetShare, row.maxCap);
      row.paid = actual;
      if (targetShare > actual) {
        const def = targetShare - actual;
        row.defaulted += def;
        poolRedistribute += def;
      }
      remainingAsk -= actual;
    }

    // Second pass: redistribute unpaid defaults to members with remaining cap
    if (poolRedistribute > 0 && remainingAsk > 0) {
      for (let pass = 0; pass < 3 && poolRedistribute > 0; pass++) {
        const headRoom = caps.reduce((s, r) => s + Math.max(0, r.maxCap - r.paid), 0);
        if (headRoom <= 0) break;
        let absorbed = 0;
        for (const r of caps) {
          const room = Math.max(0, r.maxCap - r.paid);
          if (room <= 0) continue;
          const extra = Math.min(room, Math.round((poolRedistribute * room) / headRoom));
          r.paid += extra;
          absorbed += extra;
        }
        if (absorbed <= 0) break;
        poolRedistribute -= absorbed;
      }
    }
  }

  let totalContributed = 0;
  let totalDefaulted = 0;
  const memberPayments: BoardContributionSummary['memberPayments'] = [];

  for (const row of caps) {
    const { m, paid, defaulted } = row;
    totalContributed += paid;
    totalDefaulted += defaulted;
    let reaction = 'Fulfilled compulsory board call';

    if (paid > 0) {
      m.savings = Math.max(0, Math.round(m.savings - paid));
      appendLedgerEntry(m, clock.totalDays, dateLabel, 'expense', 'Board Contribution', `Capital call for ${comp.name}`, paid);
      appendLifeLog(m, clock.totalDays, dateLabel, 'money', `Paid compulsory board contribution of ${formatDelta(paid)} into ${comp.name}.`);

      if (m.traits.kindness + m.traits.loyalty >= 115) {
        m.respect = Math.round(clamp(m.respect + 3, 0, 100) * 10) / 10;
        addCitizenMemory(m, clock, dateLabel, 'board_contribution', `Stepped up with ${formatDelta(paid)} to keep ${comp.name} afloat.`, 16);
        reaction = 'Gained respect & stood loyal';
      } else if (m.traits.greed >= 65) {
        const moodHit = Math.round(6 + (m.traits.greed - 60) * 0.22);
        const stressHit = Math.round(6 + (m.traits.greed - 60) * 0.2);
        m.mood = Math.round(clamp(m.mood - moodHit, 0, 100) * 10) / 10;
        m.stress = Math.round(clamp(m.stress + stressHit, 0, 100) * 10) / 10;
        if (ceo && m.id !== ceo.id) m.bossRelationship = Math.round(clamp(m.bossRelationship - 14, -100, 100));
        addCitizenMemory(m, clock, dateLabel, 'board_contribution', `Forced to surrender ${formatDelta(paid)} in unrecoverable board capital.`, -26);
        reaction = m.traits.greed > 78 && m.mood < 42 ? 'Resentful — weighs board resignation' : 'Paid with deep resentment';
      } else {
        addCitizenMemory(m, clock, dateLabel, 'board_contribution', `Contributed ${formatDelta(paid)} to ${comp.name} reserves.`, -10);
        reaction = 'Accepted duty reluctantly';
      }
    } else if (defaulted > 0) {
      reaction = `Defaulted ${formatDelta(defaulted)} (protected survival floor)`;
    } else {
      reaction = 'At survival floor — exempt';
    }
    memberPayments.push({ citizenId: m.id, name: m.name, paid, defaulted, reaction });
  }

  comp.cash = Math.round((comp.cash + totalContributed) * 100) / 100;
  board.totalBoardContributions = Math.round((board.totalBoardContributions + totalContributed) * 100) / 100;
  if (comp.cash >= 0) comp.negativeCashStreak = 0;

  if (totalContributed > 0 || totalDefaulted > 0) {
    events.push(makeCityEvent(clock, `bcontrib_${comp.id}`, {
      type: 'contribution',
      companyId: comp.id,
      title: `${comp.name} Board Contribution Call`,
      detail: `Directors injected ${formatDelta(totalContributed)} into cash reserves (shortfall ${formatDelta(shortfall)}, defaulted ${formatDelta(totalDefaulted)}).`,
    }));
  }

  return { requiredCash, shortfall, totalContributed, totalDefaulted, memberPayments };
}
