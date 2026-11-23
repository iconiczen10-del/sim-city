// ChatComposer.tsx — Accessible chat input with Enter-to-send behavior
import { useState, type FormEvent, type KeyboardEvent } from 'react';

interface ChatComposerProps {
  disabled: boolean;
  onSend: (text: string) => void;
}

export function ChatComposer({ disabled, onSend }: ChatComposerProps) {
  const [draft, setDraft] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || disabled) return;
    onSend(message);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const composing = event.nativeEvent.isComposing || event.keyCode === 229;
    if (event.key === 'Enter' && !event.shiftKey && !composing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-slate-800 bg-[#0d1624] p-3 sm:p-4">
      <label htmlFor="employee-chat-composer" className="sr-only">Message VI Employee</label>
      <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-[#080e18] p-2 focus-within:border-amber-400/60">
        <textarea
          id="employee-chat-composer"
          rows={1}
          maxLength={500}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={disabled ? 'This group is archived' : 'Message VI Employee'}
          className="max-h-28 min-h-9 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!draft.trim() || disabled}
          className="rounded-xl bg-amber-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
      <p className="mt-2 px-1 text-[10px] text-slate-500">Enter to send · Shift+Enter for a new line</p>
    </form>
  );
}
