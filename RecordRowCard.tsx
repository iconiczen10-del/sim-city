// RecordRowCard.tsx — Single expandable row renderer for Simulation Records entries

import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RecordCategory, SimRecordEntry } from './recordTypes';

const CAT_BADGE: Record<RecordCategory, string> = {
  citizens: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
  shopping: 'text-teal-300 border-teal-500/30 bg-teal-500/10',
  housing: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  electricity: 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10',
  companies: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10',
  mart: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  gjelectricity: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
  electronics: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
  simgod: 'text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10',
  city: 'text-slate-200 border-slate-600 bg-slate-800/70',
};

interface RecordRowCardProps {
  entry: SimRecordEntry;
  isOpen: boolean;
  hideSimGodTag?: boolean;
  onToggle: () => void;
  onSelectCitizen?: (id: string) => void;
}

export function RecordRowCard({ entry, isOpen, hideSimGodTag, onToggle, onSelectCitizen }: RecordRowCardProps) {
  return (
    <div className="px-4 py-3 space-y-2 hover:bg-slate-800/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500">Day {entry.simDay} · {entry.dateLabel}</span>
            <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase font-semibold ${CAT_BADGE[entry.category]}`}>
              {entry.category}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">{entry.subjectName}</span>
            {!hideSimGodTag && entry.simgodMarked && (
              <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 text-[10px] font-semibold">
                SimGod
              </span>
            )}
          </div>
          <div className="text-slate-100 leading-snug">{entry.summary}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onSelectCitizen && entry.subjectKind === 'citizen' && (
            <button type="button" onClick={() => onSelectCitizen(entry.subjectId)} className="text-[11px] text-amber-300 hover:underline cursor-pointer">
              Inspect
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
            aria-label={isOpen ? 'Hide record details' : 'Show record details'}
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {isOpen && (
        <pre className="bg-[#090d16] border border-slate-800 rounded p-2.5 text-[11px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(entry.detail, null, 2)}
        </pre>
      )}
    </div>
  );
}
