// SharityReactionList.tsx — Public Likes, Dislikes, and Shares list with tier badges and "Why did they react?" breakdown

import { HelpCircle } from 'lucide-react';
import { useState } from 'react';
import type { SharityReaction, SharityReactionKind } from './sharityReactionTypes';
import type { SharityState } from './sharityTypes';
import type { Citizen } from './types';

interface SharityReactionListProps {
  reactions: SharityReaction[];
  activeKind: SharityReactionKind;
  sharity: SharityState;
  citizensById: Map<string, Citizen>;
  onOpenProfile: (id: string) => void;
}

export function SharityReactionList({
  reactions,
  activeKind,
  sharity,
  citizensById,
  onOpenProfile,
}: SharityReactionListProps) {
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);
  const filtered = reactions.filter((r) => r.kind === activeKind);

  const label = activeKind === 'like' ? 'Likes' : activeKind === 'dislike' ? 'Dislikes' : 'Shares';

  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200">{label} ({filtered.length})</span>
        <span className="text-[11px] text-slate-500">Public reaction ledger</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-xs text-slate-500 py-1">No {label.toLowerCase()} yet.</div>
      ) : (
        <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto pr-1">
          {filtered.map((r) => {
            const prof = sharity.profiles[r.citizenId];
            const cit = citizensById.get(r.citizenId);
            const isOpen = expandedWhy === r.id;
            return (
              <div key={r.id} className="py-2 space-y-1.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(r.citizenId)}
                    className="flex flex-wrap items-center gap-2 text-left cursor-pointer hover:text-amber-300"
                  >
                    <span className="font-medium text-slate-100">{prof?.name ?? r.citizenId}</span>
                    <span className="font-mono text-[11px] text-slate-400">{prof?.handle ?? ''}</span>
                    {cit && <span className="font-mono text-[11px] text-amber-300">{cit.tier}</span>}
                    <span className="text-[11px] text-slate-500">{r.dateLabel}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedWhy(isOpen ? null : r.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" aria-hidden="true" />
                    <span>{isOpen ? 'Hide why' : 'Why did they react?'}</span>
                  </button>
                </div>
                {r.shareNote && <p className="text-slate-300 italic text-xs">“{r.shareNote}”</p>}
                {isOpen && (
                  <div className="bg-[#0f1623] border border-slate-800/80 rounded p-2 text-[11px] space-y-1 text-slate-300">
                    <div>{r.reason}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono tabular-nums text-slate-400">
                      {r.factors.map((f) => (
                        <span key={f.label}>
                          {f.label}: {f.value >= 0 ? `+${f.value}` : f.value} ({f.detail})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
