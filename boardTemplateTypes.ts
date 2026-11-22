// boardTemplateTypes.ts — Transcript line types, voice/act unions, and data-only fragment schemas

import type { RoleLevel } from './cityBaseTypes';

export type VoiceStyle = 'formal' | 'blunt' | 'anxious' | 'warm' | 'cold' | 'sarcastic' | 'evasive' | 'idealistic';

export type SpeechActId =
  | 'briefing'
  | 'proposal'
  | 'support'
  | 'objection'
  | 'question'
  | 'rebuttal'
  | 'concession'
  | 'blame'
  | 'emotional_appeal'
  | 'numbers_appeal'
  | 'ultimatum'
  | 'compromise'
  | 'procedure'
  | 'joke'
  | 'interruption'
  | 'whisper'
  | 'silence';

export type ThoughtActId =
  | 'fear'
  | 'calculation'
  | 'resentment'
  | 'guilt'
  | 'loyalty'
  | 'ambition'
  | 'suspicion'
  | 'relief'
  | 'exhaustion';

export type LineActId = SpeechActId | ThoughtActId | 'narration';

export type MeetingTopicId =
  | 'cash'
  | 'payroll'
  | 'layoffs'
  | 'pay_cuts'
  | 'contributions'
  | 'employee_ask'
  | 'ceo_performance'
  | 'mart_supply'
  | 'reputation'
  | 'morale'
  | 'city_shortages'
  | 'past_decisions'
  | 'rumors';

export type TranscriptLineType = 'spoken' | 'thought' | 'narration';

export interface TranscriptLineRecord {
  id: string;
  speakerId: string | null;
  speakerName: string;
  speakerRole: RoleLevel | 'Narrator';
  voice: VoiceStyle;
  lineType: TranscriptLineType;
  act: LineActId;
  topic: MeetingTopicId;
  openerId: string;
  claimId: string;
  evidenceId: string;
  pushId: string;
  closerId: string;
  slots: Record<string, string | number>;
  seed: number;
}

export interface OpenerFragment {
  id: string;
  voice: VoiceStyle | 'any';
  lineType: TranscriptLineType;
  text: string;
}

export interface ActFragment {
  id: string;
  act: LineActId;
  text: string;
}

export interface TopicFragment {
  id: string;
  topic: MeetingTopicId;
  text: string;
}

export interface CloserFragment {
  id: string;
  voice: VoiceStyle | 'any';
  lineType: TranscriptLineType;
  thoughtAct?: ThoughtActId;
  text: string;
}
