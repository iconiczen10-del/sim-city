// CitizenDecisionsTab.tsx — Searchable, filterable last 60 decisions with factor breakdown and 7d/30d outcomes

import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DECISION_KIND_LABELS } from './citizenInspectorLabels';
import type { DecisionKind } from './citizenInspectorTypes';
import type { Citizen } from './types';

interface CitizenDecisionsTabProps {
  citizen: Citizen;
  highlightedDecisionId: string | null;
  onHighlightDecision: (id: string | null) => void;
}

export function CitizenDecisionsTab({ citizen, highlightedDecisionId, onHighlightDecision }: CitizenDecisionsTabProps) {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<DecisionKind | 'all'>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const memMap = new Map(citizen.memories.map((m) => [m.id, m]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return citizen.decisions.filter((d) => {
      if (kindFilter !== 'all' && d.kind !== kindFilter) return false;
      if (q && !d.title.toLowerCase().includes(q) && !d.chosenOption.toLowerCase().includes(q) && !d.chosenReason.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [citizen.decisions, query, kindFilter]);

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? id === highlightedDecisionId) }));
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0c1220] border border-slate-800/80 rounded-md p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search last 60 decisions..."
            className="w-full bg-[#090d16] border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as DecisionKind | 'all')}
          className="bg-[#090d16] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
        >
          <option value="all">All Decision Types ({citizen.decisions.length})</option>
          {(Object.keys(DECISION_KIND_LABELS) as DecisionKind[]).map((k) => (
            <option key={k} value={k}>{DECISION_KIND_LABELS[k]}</option>
          ))}
        </select>
        {highlightedDecisionId && (
          <button type="button" onClick={() => onHighlightDecision(null)} className="text-amber-300 hover:underline cursor-pointer px-1">
            Clear highlight
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md py-12 text-center text-slate-500">
          No decisions match your search or filter.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
          {filtered.map((d) => {
            const isOpen = expanded[d.id] ?? d.id === highlightedDecisionId;
            return (
              <div key={d.id} className={`rounded-md border p-3 space-y-2 ${d.id === highlightedDecisionId ? 'border-amber-400 bg-amber-500/10' : 'border-slate-800/80 bg-[#0c1220]'}`}>
                <button type="button" onClick={() => toggleExpand(d.id)} className="w-full flex items-center justify-between gap-2 text-left cursor-pointer">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <span className="font-mono text-[11px] text-sky-300 shrink-0">[{DECISION_KIND_LABELS[d.kind]}]</span>
                    <span className="font-medium text-slate-100 truncate">{d.title}</span>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">{d.dateLabel}</span>
                </button>

                <div className="text-slate-300 pl-5">
                  Chosen: <span className="text-emerald-300 font-semibold">{d.chosenOption}</span> — {d.chosenReason}
                </div>

                {(d.outcome7d || d.outcome30d) && (
                  <div className="pl-5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] border-t border-slate-800/70 pt-1.5">
                    {d.outcome7d && (
                      <span className={d.outcome7d.worked ? 'text-emerald-300' : 'text-amber-300'}>
                        7d Outcome: {d.outcome7d.summary}
                      </span>
                    )}
                    {d.outcome30d && (
                      <span className={d.outcome30d.worked ? 'text-emerald-300' : 'text-rose-300'}>
                        30d Outcome: {d.outcome30d.summary}
                      </span>
                    )}
                  </div>
                )}

                {isOpen && (
                  <div className="pl-5 pt-1 space-y-2">
                    {d.linkedMemoryIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-[11px] text-purple-200">
                        {d.linkedMemoryIds.map((mid) => memMap.get(mid)).filter(Boolean).map((m) => (
                          <span key={m!.id}>Memory: {m!.summary} ({m!.currentWeight > 0 ? `+${m!.currentWeight}` : m!.currentWeight})</span>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {d.options.map((opt) => (
                        <div key={opt.label} className={`rounded border px-2.5 py-2 ${opt.chosen ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800/80 bg-[#090d16]'}`}>
                          <div className="flex justify-between font-medium mb-1">
                            <span className={opt.chosen ? 'text-emerald-300' : 'text-slate-400'}>{opt.label}</span>
                            <span className="font-mono tabular-nums text-slate-200">{opt.totalScore}</span>
                          </div>
                          <div className="space-y-0.5 text-[11px]">
                            {opt.factors.map((f) => (
                              <div key={f.label} className="flex justify-between text-slate-400">
                                <span>{f.label}</span>
                                <span className={`font-mono tabular-nums ${f.value >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                  {f.value >= 0 ? `+${f.value}` : f.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
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
