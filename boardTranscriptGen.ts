// boardTranscriptGen.ts — Compact fragment-record transcript generator with score alignment and hidden agendas

import { pickCitizenVoice, selectFragmentCombo } from './boardTemplateRender';
import type { BoardMetrics } from './boardSeats';
import type {
  BoardMeeting,
  BoardOptionId,
  BoardOptionProbability,
  CompanyBoardState,
  MeetingTopicId,
  SpeechActId,
  ThoughtActId,
  TranscriptLineRecord,
} from './boardTypes';
import { BOARD_OPTION_LABELS } from './boardVoting';
import type { Company } from './companyTypes';
import { formatDelta } from './formatters';
import { simPick, simRand, simRandInt } from './rng';
import type { Citizen } from './types';

function topicForOption(opt: BoardOptionId): MeetingTopicId {
  if (opt === 'layoffs' || opt === 'restructuring') return 'layoffs';
  if (opt === 'executive_pay_cut' || opt === 'company_pay_cut' || opt === 'restore_pay') return 'pay_cuts';
  if (opt === 'board_contribution') return 'contributions';
  if (opt === 'employee_ask') return 'employee_ask';
  if (opt === 'replace_ceo') return 'ceo_performance';
  if (opt === 'watch' || opt === 'wind_down') return 'cash';
  return 'payroll';
}

function pickThoughtAct(member: Citizen, chosen: BoardOptionId, metrics: BoardMetrics): ThoughtActId {
  if (member.traits.greed >= 68 && (chosen === 'board_contribution' || chosen === 'executive_pay_cut')) return 'resentment';
  if (member.traits.kindness >= 65 && (chosen === 'layoffs' || chosen === 'company_pay_cut')) return 'guilt';
  if (member.traits.ambition >= 70 && metrics.payrollRatio > 95) return 'ambition';
  if (member.stress >= 72) return 'exhaustion';
  if (metrics.runwayMonths < 1.2 || member.mood < 35) return 'fear';
  if (member.traits.loyalty >= 72) return 'loyalty';
  if (metrics.runwayMonths >= 2.2 && metrics.payrollRatio <= 85) return 'relief';
  return member.traits.discipline >= 65 ? 'calculation' : 'suspicion';
}

function pushRing(ring: string[], ids: string[], cap: number): string[] {
  const clean = ids.filter(Boolean);
  return [...ring, ...clean].slice(-cap);
}

export function generateMeetingTranscript(params: {
  comp: Company;
  members: Citizen[];
  citizens: Citizen[];
  board: CompanyBoardState;
  metrics: BoardMetrics;
  options: BoardOptionProbability[];
  chosenOptionId: BoardOptionId;
  memberTopMap: Map<string, BoardOptionId>;
  tieBrokenByCeo: boolean;
  kind: 'regular' | 'emergency';
  totalDay: number;
  pastMeeting?: BoardMeeting;
}): TranscriptLineRecord[] {
  const { comp, members, citizens, board, metrics, options, chosenOptionId, memberTopMap, tieBrokenByCeo, kind, totalDay, pastMeeting } = params;
  if (members.length === 0) return [];
  const ceo = members.find((m) => m.roleLevel === 'CEO') ?? members[0];
  const sampleEmp = citizens.find((c) => c.alive && c.employerId === comp.id && c.roleLevel !== 'CEO') ?? ceo;
  const deaths = citizens.filter((c) => !c.alive).length;
  const owed = board.employeeInvestments.filter((i) => i.status === 'active').reduce((s, i) => s + (i.principal - i.repaid), 0);

  const baseSlots: Record<string, string | number> = {
    company: comp.name, ceoName: ceo.name, totalDay, headcount: metrics.headcount,
    cash: formatDelta(comp.cash), profit: formatDelta(comp.lastMonthProfit),
    payroll: formatDelta(metrics.estMonthlyPayroll), reserveTarget: formatDelta(metrics.reserveTarget),
    shortfall: formatDelta(metrics.shortfall), runway: metrics.runwayMonths.toFixed(1),
    payrollRatio: metrics.payrollRatio, reputation: comp.reputation.toFixed(0),
    staffMood: metrics.staffMood, owedAmount: formatDelta(owed), deaths,
    employeeName: sampleEmp.name, pct: Math.max(8, board.companyPayCutPct || 10),
    direction: comp.direction, martWholesale: formatDelta(comp.monthlyRevenue),
    martStockouts: 0, streakText: comp.positiveProfitStreak > 0 ? `+${comp.positiveProfitStreak} green` : `-${comp.negativeProfitStreak} loss`,
    pastDay: pastMeeting?.totalDay ?? 1, pastAction: pastMeeting?.chosenLabel ?? 'initial charter budget',
    optionLabel: BOARD_OPTION_LABELS[chosenOptionId],
    altLabel: BOARD_OPTION_LABELS[options[1]?.optionId ?? 'watch'],
  };

  const lines: TranscriptLineRecord[] = [];
  const emit = (speaker: Citizen | null, lineType: TranscriptLineRecord['lineType'], act: TranscriptLineRecord['act'], topic: MeetingTopicId, optFor: BoardOptionId, altOpt: BoardOptionId) => {
    const sKey = speaker?.id ?? 'narrator';
    const voice = speaker ? pickCitizenVoice(speaker) : 'formal';
    const sRing = board.speakerRecentFragments[sKey] ?? [];
    const combo = selectFragmentCombo({ voice, lineType, act, topic, speakerRing: sRing, globalRing: board.globalRecentFragments, randFn: simRand });
    const ids = [combo.openerId, combo.claimId, combo.evidenceId, combo.pushId, combo.closerId];
    board.speakerRecentFragments[sKey] = pushRing(sRing, ids, 30);
    board.globalRecentFragments = pushRing(board.globalRecentFragments, ids, 100);

    const other = members.find((m) => m.id !== speaker?.id) ?? ceo;
    const spare = speaker ? Math.max(0, speaker.savings - 1200) : 0;
    lines.push({
      id: `ln_${totalDay}_${lines.length}`,
      speakerId: speaker?.id ?? null, speakerName: speaker?.name ?? 'Boardroom', speakerRole: speaker?.roleLevel ?? 'Narrator',
      voice, lineType, act, topic, ...combo, seed: simRandInt(1000, 9999999),
      slots: {
        ...baseSlots,
        speakerName: speaker?.name ?? 'Board', targetName: other.name,
        speakerMood: Math.round(speaker?.mood ?? 50), speakerStress: Math.round(speaker?.stress ?? 20),
        speakerSavings: formatDelta(speaker?.savings ?? 0), spareCash: formatDelta(spare),
        optionLabel: BOARD_OPTION_LABELS[optFor], altLabel: BOARD_OPTION_LABELS[altOpt],
      },
    });
  };

  emit(null, 'narration', 'narration', kind === 'emergency' ? 'cash' : 'payroll', chosenOptionId, 'watch');
  emit(ceo, 'spoken', 'briefing', metrics.shortfall > 0 ? 'cash' : 'payroll', chosenOptionId, 'watch');

  for (const m of members.slice(1)) {
    const mOpt = memberTopMap.get(m.id) ?? chosenOptionId;
    const altOpt = mOpt === chosenOptionId ? (options[1]?.optionId ?? 'watch') : chosenOptionId;
    const act: SpeechActId = mOpt === chosenOptionId
      ? simPick(m.traits.discipline > 65 ? ['support', 'numbers_appeal', 'proposal'] : ['support', 'emotional_appeal', 'compromise'])
      : simPick(m.traits.kindness > 65 ? ['objection', 'emotional_appeal', 'question'] : ['objection', 'rebuttal', 'blame']);
    const topic: MeetingTopicId = pastMeeting && simRand() < 0.28 ? 'past_decisions' : topicForOption(mOpt);
    emit(m, 'spoken', act, topic, mOpt, altOpt);

    // Hidden agenda or private reaction
    const conflict = (m.traits.greed >= 65 && (mOpt === 'board_contribution' || chosenOptionId === 'board_contribution'))
      || (m.traits.ambition >= 68 && comp.negativeProfitStreak >= 2)
      || (m.traits.kindness >= 65 && chosenOptionId === 'layoffs')
      || simRand() < 0.45;
    if (conflict) {
      const thAct = pickThoughtAct(m, chosenOptionId, metrics);
      emit(m, 'thought', thAct, topicForOption(chosenOptionId), mOpt, altOpt);
    }
  }

  if (members.length >= 2 && simRand() < 0.7) {
    const spar = simPick(members);
    const special: SpeechActId = spar.stress > 70 ? 'interruption' : spar.traits.greed > 65 ? 'whisper' : simRand() < 0.35 ? 'joke' : 'procedure';
    emit(spar, 'spoken', special, simPick(['morale', 'mart_supply', 'rumors', 'city_shortages']), chosenOptionId, 'watch');
  }

  emit(ceo, 'spoken', metrics.runwayMonths < 1.2 ? 'ultimatum' : 'compromise', topicForOption(chosenOptionId), chosenOptionId, options[1]?.optionId ?? 'watch');
  emit(ceo, 'thought', pickThoughtAct(ceo, chosenOptionId, metrics), 'ceo_performance', chosenOptionId, 'watch');
  emit(null, 'narration', 'narration', tieBrokenByCeo ? 'ceo_performance' : 'past_decisions', chosenOptionId, 'watch');
  return lines;
}
