import type { ChatMessage } from './chatTypes';

interface ChatMessageCardProps {
  message: ChatMessage;
  pinned: boolean;
  showSpeaker: boolean;
  showSeen: boolean;
  onReact: (id: string, emoji: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatVoiceDuration(durationSec: number): string {
  const minutes = Math.floor(durationSec / 60);
  const seconds = String(durationSec % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function ChatMessageCard({
  message,
  pinned,
  showSpeaker,
  showSeen,
  onReact,
  onPin,
  onDelete,
}: ChatMessageCardProps) {
  if (message.act === 'system') {
    return (
      <div className="mx-auto max-w-[90%] rounded-full bg-slate-800/70 px-3 py-1.5 text-center text-[11px] italic text-slate-400">
        {message.text}
      </div>
    );
  }

  const own = message.speakerId === null;
  const time = `${String(message.hour).padStart(2, '0')}:${String(message.minute).padStart(2, '0')}`;
  const voiceDuration = message.isVoiceNote
    ? formatVoiceDuration(message.isVoiceNote.durationSec)
    : null;
  const initials = message.speakerName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2);

  return (
    <article className={`flex gap-2.5 ${own ? 'justify-end' : ''}`}>
      {!own && showSpeaker && (
        <div aria-hidden="true" className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-slate-800 text-[10px] font-bold text-amber-200">
          {initials}
        </div>
      )}
      {!own && !showSpeaker && <div aria-hidden="true" className="w-8 shrink-0" />}
      <div className={`max-w-[88%] sm:max-w-[78%] ${own ? 'items-end' : ''}`}>
        {showSpeaker && (
          <div className={`mb-1 flex items-baseline gap-2 text-[11px] ${own ? 'justify-end' : ''}`}>
            <span className="font-semibold text-slate-300">{message.speakerName}</span>
            {!own && <span className="text-slate-500">{message.speakerRole}</span>}
          </div>
        )}
        <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 ${own ? 'rounded-tr-sm bg-amber-300 text-slate-950' : 'rounded-tl-sm border border-slate-800 bg-[#131e2d] text-slate-100'} ${message.isDeleted ? 'italic opacity-70' : ''}`}>
          {message.isForwarded && (
            <div className="mb-1 text-[10px] opacity-70">
              Forwarded {message.isForwarded.forwardCount}x
            </div>
          )}
          {message.isDeleted ? (
            'This message was deleted.'
          ) : (
            <>
              {voiceDuration && (
                <span className="mr-1" role="img" aria-label={`Voice note, ${voiceDuration}`}>
                  🎤 Voice note · {voiceDuration}
                </span>
              )}
              {message.text}
            </>
          )}
          <span className={`ml-2 whitespace-nowrap text-[10px] ${own ? 'text-slate-700' : 'text-slate-500'}`}>
            {time}
          </span>
        </div>
        {showSeen && <p className="mt-1 text-right text-[10px] text-slate-500">Seen by {message.seenBy}</p>}
        <div className={`mt-1 flex flex-wrap gap-1 ${own ? 'justify-end' : ''}`}>
          {message.reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              type="button"
              onClick={() => onReact(message.id, reaction.emoji)}
              aria-label={`Toggle ${reaction.emoji} reaction`}
              className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs"
            >
              {reaction.emoji} {reaction.count}
            </button>
          ))}
          {!message.isDeleted && (
            <>
              <button
                type="button"
                onClick={() => onReact(message.id, '👍')}
                aria-label="React with thumbs up"
                className="rounded-full border border-slate-800 px-2 py-0.5 text-xs text-slate-400 hover:text-amber-200"
              >
                ＋
              </button>
              <button type="button" onClick={() => onPin(message.id)} className="rounded-full px-2 py-0.5 text-[10px] text-slate-500 hover:text-amber-200">
                {pinned ? 'Unpin' : 'Pin'}
              </button>
              <button type="button" onClick={() => onDelete(message.id)} className="rounded-full px-2 py-0.5 text-[10px] text-slate-500 hover:text-rose-300">
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
