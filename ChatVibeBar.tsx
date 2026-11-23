import type { ChatGroupState } from './chatGroups';

interface VibeState {
  label: 'Calm' | 'Tense' | 'Volatile' | 'Toxic';
  color: string;
}

function getVibeState(score: number): VibeState {
  if (score > 30) return { label: 'Calm', color: 'bg-emerald-400' };
  if (score < -30) return { label: 'Toxic', color: 'bg-rose-400' };
  if (score < 0) return { label: 'Volatile', color: 'bg-rose-300' };
  return { label: 'Tense', color: 'bg-slate-400' };
}

export function ChatVibeBar({ vibeScore }: { vibeScore: ChatGroupState['vibeScore'] }) {
  const vibe = getVibeState(vibeScore);
  const fillWidth = Math.max(4, (vibeScore + 100) / 2);

  return (
    <div className="border-b border-slate-800 px-4 py-2.5 sm:px-5" aria-label={`Group vibe: ${vibe.label}`}>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Group vibe</span>
        <span className="font-medium text-slate-200">{vibe.label}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-800"
        role="meter"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={vibeScore}
        aria-label="Group vibe score"
      >
        <div className={`h-full rounded-full transition-all ${vibe.color}`} style={{ width: `${fillWidth}%` }} />
      </div>
    </div>
  );
}
