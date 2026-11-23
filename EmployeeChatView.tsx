// EmployeeChatView.tsx — Compose the employee chat header, messages, and controls
import { MessageCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ChatComposer } from './ChatComposer';
import { ChatMemberSidebar } from './ChatMemberSidebar';
import { ChatMessageList } from './ChatMessageList';
import { ChatVibeBar } from './ChatVibeBar';
import type { ChatGroupState } from './chatGroups';
import type { ChatMessage } from './chatTypes';
import type { CityState } from './types';

interface EmployeeChatViewProps {
  city: CityState;
  group: ChatGroupState;
  onUpdateCity: (updater: (prev: CityState) => CityState) => void;
  onSelectCitizen: (id: string) => void;
}

export function EmployeeChatView({ city, group, onUpdateCity, onSelectCitizen }: EmployeeChatViewProps) {
  const [showMembers, setShowMembers] = useState(false);
  const members = useMemo(
    () => city.citizens.filter((citizen) => group.memberIds.includes(citizen.id)),
    [city.citizens, group.memberIds],
  );
  const onlineCount = members.filter((member) => member.mood > 40).length;

  const updateGroup = (change: (current: ChatGroupState) => ChatGroupState) => {
    onUpdateCity((previous) => ({
      ...previous,
      chatGroups: {
        ...previous.chatGroups,
        vijindustries: change(previous.chatGroups.vijindustries),
      },
    }));
  };

  const sendMessage = (text: string) => {
    const message: ChatMessage = {
      id: `player_${city.totalDays}_${Date.now()}`,
      totalDay: city.totalDays,
      hour: 18,
      minute: 0,
      speakerId: null,
      speakerName: 'You',
      speakerRole: 'System',
      archetype: 'system',
      act: 'aside',
      topic: 'general',
      text,
      variantId: 'player_message',
      seenBy: 0,
      reactions: [],
    };
    updateGroup((current) => ({ ...current, messages: [message, ...current.messages].slice(0, 270) }));
  };

  const toggleReaction = (messageId: string, emoji: string) => updateGroup((current) => ({
    ...current,
    messages: current.messages.map((message) => {
      if (message.id !== messageId) return message;
      const exists = message.reactions.some((reaction) => reaction.emoji === emoji);
      const reactions = exists
        ? message.reactions.filter((reaction) => reaction.emoji !== emoji)
        : [...message.reactions, { emoji, count: 1 }];
      return { ...message, reactions };
    }),
  }));

  const togglePin = (messageId: string) => updateGroup((current) => ({
    ...current,
    pinnedMessageId: current.pinnedMessageId === messageId ? null : messageId,
  }));
  const removeMessage = (messageId: string) => updateGroup((current) => ({
    ...current,
    messages: current.messages.map((message) => message.id === messageId
      ? { ...message, isDeleted: true, text: 'This message was deleted.' }
      : message),
  }));
  const pinnedText = group.messages.find((message) => message.id === group.pinnedMessageId)?.text;

  return (
    <section aria-label="VI Employee group chat" className="flex h-[calc(100dvh-285px)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0b1220] shadow-xl sm:h-[min(76vh,760px)] sm:min-h-[480px]">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-400 text-slate-950">
            <MessageCircle className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-100">{group.groupName}</h2>
            <p className="text-xs text-slate-400">{members.length} members · {onlineCount} online</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowMembers((visible) => !visible)}
          aria-expanded={showMembers}
          className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-amber-400/60 hover:text-amber-200"
        >
          {showMembers ? 'Hide info' : 'Group info'}
        </button>
      </header>
      <ChatVibeBar vibeScore={group.vibeScore} />
      {showMembers && (
        <ChatMemberSidebar members={members} group={group} totalDays={city.totalDays} onSelectCitizen={onSelectCitizen} />
      )}
      {group.pinnedMessageId && (
        <div className="border-b border-amber-400/20 bg-amber-400/5 px-4 py-2 text-xs text-amber-100">
          <span className="font-semibold">Pinned</span> · {pinnedText ?? 'Pinned message'}
        </div>
      )}
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite" aria-label="Messages">
        <ChatMessageList
          messages={group.messages}
          totalDays={city.totalDays}
          pinnedMessageId={group.pinnedMessageId}
          onReact={toggleReaction}
          onPin={togglePin}
          onDelete={removeMessage}
        />
      </div>
      <ChatComposer disabled={group.archived} onSend={sendMessage} />
    </section>
  );
}
