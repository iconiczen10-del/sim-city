// boardTypes.ts — Data structures for Vij Industries board meetings, votes, investments, and state

import type { TranscriptLineRecord } from './boardTemplateTypes';

export type {
  LineActId,
  MeetingTopicId,
  SpeechActId,
  ThoughtActId,
  TranscriptLineRecord,
  TranscriptLineType,
  VoiceStyle,
} from './boardTemplateTypes';

export type BoardOptionId =
  | 'watch'
  | 'freeze'
  | 'board_contribution'
  | 'employee_ask'
  | 'executive_pay_cut'
  | 'company_pay_cut'
  | 'layoffs'
  | 'restructuring'
  | 'replace_ceo'
  | 'wind_down'
  | 'unfreeze'
  | 'restore_pay'
  | 'rehire';

export interface BoardSeatInfo {
  seatIndex: number;
  seatRole: 'CEO' | 'Executive' | 'Manager';
  citizenId: string | null;
  name: string;
  mood: number;
  stress: number;
  stance: string;
  topOptionId?: BoardOptionId;
}

export interface BoardOptionProbability {
  optionId: BoardOptionId;
  label: string;
  probability: number;
  avgScore: number;
  cooldownBlocked: boolean;
  voters: { citizenId: string; name: string; score: number; reason: string }[];
}

export interface BoardContributionSummary {
  requiredCash: number;
  shortfall: number;
  totalContributed: number;
  totalDefaulted: number;
  memberPayments: { citizenId: string; name: string; paid: number; defaulted: number; reaction: string }[];
}

export interface EmployeeInvestmentRecord {
  id: string;
  citizenId: string;
  citizenName: string;
  principal: number;
  repaid: number;
  status: 'active' | 'repaid' | 'lost';
  investedDay: number;
}

export interface BoardMeeting {
  id: string;
  totalDay: number;
  dateLabel: string;
  kind: 'regular' | 'emergency';
  read: boolean;
  cashAtStart: number;
  cashAtEnd: number;
  runwayMonths: number;
  payrollRatio: number;
  profitStreak: number;
  negativeCashStreak: number;
  reputation: number;
  staffMood: number;
  seats: BoardSeatInfo[];
  options: BoardOptionProbability[];
  chosenOptionId: BoardOptionId;
  chosenLabel: string;
  tieBrokenByCeo: boolean;
  outcomeSummary: string;
  contributionSummary?: BoardContributionSummary;
  transcript: TranscriptLineRecord[];
}

export interface CompanyBoardState {
  nextMeetingDay: number;
  lastMeetingDay: number;
  lastEmergencyDay: number;
  lastSevereActionDay: number;
  executivePayCutPct: number;
  companyPayCutPct: number;
  restructuredLevel: number;
  totalBoardContributions: number;
  pendingEmployeeAskIds: string[];
  employeeInvestments: EmployeeInvestmentRecord[];
  speakerRecentFragments: Record<string, string[]>;
  globalRecentFragments: string[];
  unreadMeetingCount: number;
  lastStaffTargetHeadcount: number;
}
