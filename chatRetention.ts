// chatRetention.ts — Keep the active chat window and bounded archive in sync
import type { ChatGroupState } from './chatGroups';
import type { ChatMessage } from './chatTypes';

export function retainChatMessages(group: ChatGroupState, incoming: ChatMessage[], totalDay: number): void {
  const combined = [...incoming, ...group.messages].sort((left, right) =>
    right.totalDay - left.totalDay || right.hour - left.hour || right.minute - left.minute
  );
  const cutoff = totalDay - 90;
  const archived = combined.filter((message) => message.totalDay < cutoff);
  group.archivedMessages = [...group.archivedMessages, ...archived].slice(-1000);
  group.messages = combined.filter((message) => message.totalDay >= cutoff).slice(0, 270);
}
