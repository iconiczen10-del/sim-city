// CitizenWhyTab.tsx — Why? inspector: decisions, option factor scores, mood/stress breakdowns, change links

import { HelpCircle } from 'lucide-react';
import { DECISION_KIND_LABELS } from './citizenInspectorLabels';
import type { SignedFactor } from './citizenInspectorTypes';
import { CitizenWhyLedgers } from './CitizenWhyLedgers';
import type { Citizen } from './types';

interface CitizenWhyTabProps {
  citizen: Citizen;
  highlightedDecisionId: string | null;
  onHighlightDecision: (id: string | null) => void;
  onOpenSharityPost?: (postId: string) => void;
}

function BreakdownCard({ title, totalValue, factors }: { title: string; totalValue: number; factors: SignedFactor[] }) {
  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-semibold text-slate-200">{title}</span>
        <span className="font-mono font-semibold text-amber-300">{totalValue.toFixed(1)} / 100</span>
      </div>
      {factors.length === 0 ? (
        <div className="text-slate-500 py-3">Advances on next simulation tick.</div>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {factors.map((f, idx) => (
            <div key={`${f.label}_${idx}`} className="flex items-center justify-between">
              <span className="text-slate-300">{f.label}</span>
              <span className={`font-mono font-medium ${f.value > 0 ? 'text-emerald-300' : f.value < 0 ? 'text-rose-300' : 'text-slate-400'}`}>
                {f.value > 0 ? `+${f.value.toFixed(1)}` : f.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CitizenWhyTab({ citizen, highlightedDecisionId, onHighlightDecision, onOpenSharityPost }: CitizenWhyTabProps) {
  const memMap = new Map(citizen.memories.map((m) => [m.id, m]));

  return (
    <div className="space-y-4">
      {citizen.changeExplanations.length > 0 && (
        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2 text-xs">
          <div className="font-semibold text-slate-200">Recent Shifts &amp; Change Explanations</div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {citizen.changeExplanations.slice(0, 8).map((chg) => (
              <div key={chg.id} className="flex items-center justify-between gap-3 bg-[#090d16] border border-slate-800/70 rounded px-3 py-1.5">
                <div className="text-slate-300">
                  <span className="font-mono text-slate-500 mr-2">{chg.dateLabel}</span>
                  <span>{chg.summary}</span>
                </div>
                {(chg.decisionId || (chg.postId && onOpenSharityPost)) && (
                  <button
                    type="button"
                    onClick={() => (chg.decisionId ? onHighlightDecision(chg.decisionId) : onOpenSharityPost?.(chg.postId!))}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 hover:text-amber-200 shrink-0 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" aria-hidden="true" />
                    <span>{chg.postId && !chg.decisionId ? 'View causal post' : 'Explain this change'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <BreakdownCard title="Mood Breakdown (Signed Factors)" totalValue={citizen.mood} factors={citizen.moodBreakdown} />
        <BreakdownCard title="Stress Breakdown (Signed Factors)" totalValue={citizen.stress} factors={citizen.stressBreakdown} />
      </div>

      <CitizenWhyLedgers citizen={citizen} />

      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200">Recorded Citizen Decisions ({citizen.decisions.length})</span>
          {highlightedDecisionId && (
            <button type="button" onClick={() => onHighlightDecision(null)} className="text-amber-300 hover:underline cursor-pointer">
              Clear highlight
            </button>
          )}
        </div>
        {citizen.decisions.length === 0 ? (
          <div className="text-slate-500 py-6 text-center">No decisions recorded yet.</div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {citizen.decisions.slice(0, 20).map((d) => {
              const isHighlighted = d.id === highlightedDecisionId;
              return (
                <div key={d.id} className={`rounded-md border p-3 space-y-2 ${isHighlighted ? 'border-amber-400 bg-amber-500/10' : 'border-slate-800/80 bg-[#090d16]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-100">
                      <span className="text-[11px] font-mono text-sky-300 mr-2">[{DECISION_KIND_LABELS[d.kind]}]</span>
                      {d.title}
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">{d.dateLabel}</span>
                  </div>
                  <div className="text-slate-300">Chosen: <span className="text-emerald-300 font-semibold">{d.chosenOption}</span> — {d.chosenReason}</div>
                  {d.linkedMemoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {d.linkedMemoryIds.map((mid) => memMap.get(mid)).filter(Boolean).map((m) => (
                        <span key={m!.id} className="text-[11px] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-200">
                          Memory: {m!.summary} ({m!.currentWeight > 0 ? `+${m!.currentWeight}` : m!.currentWeight})
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {d.options.map((opt) => (
                      <div key={opt.label} className={`rounded border px-2.5 py-2 ${opt.chosen ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800/70'}`}>
                        <div className="flex justify-between font-medium mb-1">
                          <span className={opt.chosen ? 'text-emerald-300' : 'text-slate-400'}>{opt.label}</span>
                          <span className="font-mono text-slate-200">{opt.totalScore}</span>
                        </div>
                        <div className="space-y-0.5 text-[11px]">
                          {opt.factors.map((f) => (
                            <div key={f.label} className="flex justify-between text-slate-400">
                              <span>{f.label}</span>
                              <span className={`font-mono ${f.value >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{f.value >= 0 ? `+${f.value}` : f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
