// ChatMessageList.tsx — Render reverse-chronological chat messages with day dividers
import { ChatMessageCard } from './ChatMessageCard';
import type { ChatMessage } from './chatTypes';

interface ChatMessageListProps {
  messages: ChatMessage[];
  totalDays: number;
  pinnedMessageId: string | null;
  onReact: (id: string, emoji: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ChatMessageList({ messages, totalDays, pinnedMessageId, onReact, onPin, onDelete }: ChatMessageListProps) {
  if (!messages.length) {
    return (
      <div className="mx-auto mt-12 max-w-xs text-center">
        <div className="text-sm font-semibold text-slate-200">Welcome to the group</div>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          City updates and employee conversations will show up here as Vij changes.
        </p>
      </div>
    );
  }

  return messages.map((message, index) => {
    const newerMessage = messages[index - 1];
    const dayDivider = !newerMessage || newerMessage.totalDay !== message.totalDay;
    const showSpeaker = !newerMessage
      || newerMessage.speakerId !== message.speakerId
      || newerMessage.totalDay !== message.totalDay;
    const dayLabel = message.totalDay === totalDays
      ? 'Today'
      : message.totalDay === totalDays - 1
        ? 'Yesterday'
        : `Day ${message.totalDay}`;

    return (
      <div key={message.id} className={`flex flex-col ${showSpeaker ? 'gap-3' : 'gap-1'}`}>
        {dayDivider && (
          <div className="mx-auto rounded-full bg-slate-800/80 px-3 py-1 text-[10px] text-slate-400">
            {dayLabel}
          </div>
        )}
        <ChatMessageCard
          message={message}
          pinned={pinnedMessageId === message.id}
          showSpeaker={showSpeaker}
          showSeen={index === 0 && message.speakerId !== null}
          onReact={onReact}
          onPin={onPin}
          onDelete={onDelete}
        />
      </div>
    );
  });
}
