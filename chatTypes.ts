// chatTypes.ts — Employee group chat message and generation contracts
import type { RoleLevel } from './cityBaseTypes';

export type ChatAct =
  | 'announcement' | 'rant' | 'grievance' | 'speculation' | 'question'
  | 'joke' | 'support' | 'menace' | 'aside' | 'silence' | 'voice_note'
  | 'forwarded' | 'system' | 'reflection';
export type ChatTopic =
  | 'payroll' | 'board' | 'layoffs' | 'ceo' | 'executives' | 'export_orders'
  | 'factory_floor' | 'mart_prices' | 'vijtech_poaching' | 'vij_capital'
  | 'office_politics' | 'hiring' | 'leavings' | 'policy' | 'general';
export type ChatArchetype =
  | 'loud' | 'anxious' | 'formal' | 'warm' | 'sarcastic'
  | 'executive' | 'lurker' | 'newbie' | 'veteran' | 'ceo';

export interface ChatVariant {
  id: string;
  weight: number;
  text: string;
  minPhase?: 1 | 2 | 3 | 4;
}

export interface ChatCell {
  act: ChatAct;
  topic: ChatTopic;
  archetype: ChatArchetype;
  variants: ChatVariant[];
}

export interface ChatMessage {
  id: string;
  totalDay: number;
  hour: number;
  minute: number;
  speakerId: string | null;
  speakerName: string;
  speakerRole: RoleLevel | 'System';
  archetype: ChatArchetype | 'system';
  act: ChatAct;
  topic: ChatTopic;
  text: string;
  variantId: string;
  seenBy: number;
  reactions: { emoji: string; count: number }[];
  isDeleted?: boolean;
  isVoiceNote?: { durationSec: number };
  isForwarded?: { forwardCount: number };
}

export interface ArchetypeWeight {
  archetype: ChatArchetype;
  weight: number;
}
