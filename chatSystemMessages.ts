// chatSystemMessages.ts — System-only notices for employee group changes
import type { ChatMessage } from './chatTypes';
import type { SimClock } from './eventFactory';

export type ChatSystemKind =
  | 'join' | 'rejoin' | 'leave' | 'fired' | 'quit' | 'layoff' | 'deceased'
  | 'ceo_change' | 'ceo_added' | 'ceo_annual' | 'archived' | 'group_created'
  | 'members_added' | 'group_name_change' | 'pinned' | 'mute' | 'forwarded';

export function makeSystemMessage(
  kind: ChatSystemKind,
  meta: Record<string, unknown>,
  clock: SimClock,
): ChatMessage {
  const name = String(meta.name ?? 'A colleague');
  const groupName = String(meta.groupName ?? 'VI Employee');
  const adderName = String(meta.adderName ?? 'the CEO');
  const text: Record<ChatSystemKind, string> = {
    join: `${name} was added`,
    rejoin: `${name} joined again`,
    leave: `${name} left the group`,
    fired: `${name} was removed`,
    quit: `${name} left`,
    layoff: `${name} was removed`,
    deceased: `${name} — no longer with us`,
    ceo_change: `${name} is now CEO`,
    ceo_added: `${name} was added as CEO`,
    ceo_annual: `Leadership update: ${name} is CEO`,
    archived: 'Vij Industries has closed. This group has been archived.',
    group_created: `Group created: ${groupName}`,
    members_added: `${String(meta.count ?? 0)} members added by ${adderName}`,
    group_name_change: `Group name changed to ${groupName}`,
    pinned: 'A message was pinned',
    mute: 'Group notifications were muted',
    forwarded: `Forwarded ${String(meta.forwardCount ?? 1)} times`,
  };
  const eventId = String(meta.id ?? name).replace(/[^a-z0-9]/gi, '_');
  return {
    id: `chat_sys_${clock.totalDays}_${kind}_${eventId}`,
    totalDay: clock.totalDays,
    hour: 9,
    minute: 0,
    speakerId: null,
    speakerName: 'System',
    speakerRole: 'System',
    archetype: 'system',
    act: 'system',
    topic: 'general',
    text: text[kind],
    variantId: `system:${kind}`,
    seenBy: 0,
    reactions: [],
  };
}
