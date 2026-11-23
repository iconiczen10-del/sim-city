import type { ChatGroupState } from './chatGroups';
import type { ChatArchetype } from './chatTypes';
import type { Citizen } from './types';

interface ChatMemberSidebarProps {
  members: Citizen[];
  group: ChatGroupState;
  totalDays: number;
  onSelectCitizen: (id: string) => void;
}

const archetypeIcon: Record<ChatArchetype, string> = {
  loud: '📣', anxious: '🌧', formal: '📋', warm: '🌼', sarcastic: '🙃',
  executive: '💼', lurker: '👀', newbie: '🌱', veteran: '🧭', ceo: '⭐',
};

export function ChatMemberSidebar({ members, group, totalDays, onSelectCitizen }: ChatMemberSidebarProps) {
  return (
    <aside className="max-h-52 overflow-y-auto border-b border-slate-800 bg-slate-950/40 px-4 py-3 sm:px-5" aria-label="Group members">
      <h3 className="mb-2 text-xs font-semibold text-slate-100">Group members</h3>
      <ul className="flex flex-col gap-1.5">
        {members.map((member) => {
          const archetype = group.archetypeProfiles[member.id]?.[0]?.archetype ?? 'lurker';
          const lastMessage = group.messages.find((message) => message.speakerId === member.id);
          const lastSeen = lastMessage ? Math.max(0, totalDays - lastMessage.totalDay) : null;
          const lastSeenLabel = lastSeen === null ? 'new' : lastSeen === 0 ? 'today' : `${lastSeen}d ago`;
          return (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => onSelectCitizen(member.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span aria-hidden="true">{archetypeIcon[archetype]}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{member.name}</span>
                <span className="text-[10px] text-slate-500">{lastSeenLabel}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
