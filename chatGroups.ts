// chatGroups.ts — Persisted state and defaults for the Vij Industries employee group
import type { ArchetypeWeight, ChatMessage, ChatTopic } from './chatTypes';

export interface ChatGroupState {
  groupId: 'vijindustries_employee';
  groupName: string;
  groupNameHistory: { name: string; changedOnDay: number }[];
  memberIds: string[];
  membersEverJoined: string[];
  lastKnownCeoId: string | null;
  spamUncleId: string | null;
  messages: ChatMessage[];
  archivedMessages: ChatMessage[];
  vibeScore: number;
  pinnedMessageId: string | null;
  rings: {
    global: string[];
    perSpeaker: Record<string, string[]>;
    perCell: Record<string, string[]>;
    perTopic: Record<string, string[]>;
  };
  phase: Record<ChatTopic, 1 | 2 | 3 | 4>;
  triggerHistory: { topic: ChatTopic; day: number }[];
  archetypeProfiles: Record<string, ArchetypeWeight[]>;
  archived: boolean;
  lastSilenceDay: number;
  lastForwardedDay: number;
  seedMessagesEmitted: boolean;
}

const topics: ChatTopic[] = [
  'payroll', 'board', 'layoffs', 'ceo', 'executives', 'export_orders',
  'factory_floor', 'mart_prices', 'vijtech_poaching', 'vij_capital',
  'office_politics', 'hiring', 'leavings', 'policy', 'general',
];

export function createEmptyChatGroupState(): ChatGroupState {
  return {
    groupId: 'vijindustries_employee',
    groupName: 'VI Employee',
    groupNameHistory: [],
    memberIds: [],
    membersEverJoined: [],
    lastKnownCeoId: null,
    spamUncleId: null,
    messages: [],
    archivedMessages: [],
    vibeScore: 0,
    pinnedMessageId: null,
    rings: { global: [], perSpeaker: {}, perCell: {}, perTopic: {} },
    phase: Object.fromEntries(topics.map((topic) => [topic, 1])) as Record<ChatTopic, 1 | 2 | 3 | 4>,
    triggerHistory: [],
    archetypeProfiles: {},
    archived: false,
    lastSilenceDay: 0,
    lastForwardedDay: 0,
    seedMessagesEmitted: false,
  };
}
