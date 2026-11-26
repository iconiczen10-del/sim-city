// FamilyTreeDiagram.tsx — Scrollable generation-row family tree with marriage lines, parent-child links, and step markers

import type { CityFamilyState, FamilyTreeNode } from './familyTypes';
import { formatDelta } from './formatters';
import type { Citizen } from './types';

interface FamilyTreeDiagramProps {
  family: CityFamilyState;
  familyId: string;
  currentCitizenId: string;
  citizens: Citizen[];
  onSelectCitizen?: (id: string) => void;
}

export function FamilyTreeDiagram({ family, familyId, currentCitizenId, citizens, onSelectCitizen }: FamilyTreeDiagramProps) {
  const byCit = new Map(citizens.map((c) => [c.id, c]));
  const baseNodes = Object.values(family.nodes).filter((n) => n.familyId === familyId);
  const includedIds = new Set(baseNodes.map((n) => n.citizenId));
  for (const n of baseNodes) {
    for (const sid of [...n.spouseIds, ...n.pastSpouseIds, ...n.stepParentIds]) includedIds.add(sid);
  }
  const allNodes = [...includedIds].map((id) => family.nodes[id]).filter((n): n is FamilyTreeNode => Boolean(n));
  const gens = [...new Set(allNodes.map((n) => n.generation))].sort((a, b) => a - b);

  if (allNodes.length === 0) {
    return <div className="text-xs text-slate-500 py-4 text-center">No family tree nodes recorded yet.</div>;
  }

  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-md p-3 overflow-x-auto max-w-full">
      <div className="min-w-max space-y-4">
        {gens.map((gen, gIdx) => {
          const row = allNodes.filter((n) => n.generation === gen);
          const rendered = new Set<string>();
          return (
            <div key={gen} className="space-y-2">
              {gIdx > 0 && (
                <div className="flex justify-center">
                  <div className="h-5 w-0.5 bg-sky-500/50" aria-hidden="true" />
                </div>
              )}
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Generation {gen}</div>
              <div className="flex items-start gap-4">
                {row.map((node) => {
                  if (rendered.has(node.citizenId)) return null;
                  rendered.add(node.citizenId);
                  const spouseId = node.spouseIds.find((sid) => !rendered.has(sid) && row.some((r) => r.citizenId === sid));
                  const spouseNode = spouseId ? family.nodes[spouseId] : undefined;
                  if (spouseNode) rendered.add(spouseNode.citizenId);

                  const renderCard = (n: FamilyTreeNode) => {
                    const cit = byCit.get(n.citizenId);
                    const isSelf = n.citizenId === currentCitizenId;
                    const isStep = n.stepParentIds.length > 0 || n.stepChildIds.length > 0;
                    const hasKids = n.childrenIds.length > 0;
                    return (
                      <div key={n.citizenId} className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => onSelectCitizen?.(n.citizenId)}
                          className={`w-40 text-left rounded-md border px-2.5 py-2 text-[11px] transition-colors cursor-pointer ${
                            isSelf
                              ? 'border-amber-400 bg-amber-500/15 text-slate-50'
                              : n.alive
                                ? 'border-slate-700 bg-[#111827] hover:border-slate-500 text-slate-200'
                                : 'border-slate-800 bg-slate-900/60 text-slate-400 opacity-85'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold truncate">{n.name}</span>
                            {isStep && <span className="px-1 rounded bg-purple-500/20 text-purple-300 text-[9px] shrink-0">step</span>}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                            <span>{n.alive ? `Age ${cit?.age ?? '-'}` : `Deceased (${cit?.age ?? '-'})`}</span>
                            <span className="font-mono text-amber-300">{formatDelta(n.peakSavings)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{cit?.alive ? cit.roleLevel : n.peakRole}</div>
                        </button>
                        {hasKids && <div className="h-3 w-0.5 bg-emerald-500/50" aria-hidden="true" />}
                      </div>
                    );
                  };

                  return (
                    <div key={node.citizenId} className="flex items-center">
                      {renderCard(node)}
                      {spouseNode && (
                        <>
                          <div className="flex items-center px-1" title="Married">
                            <div className="h-0.5 w-5 bg-rose-400/70" />
                            <span className="text-[10px] text-rose-300 px-1 font-mono">♥</span>
                            <div className="h-0.5 w-5 bg-rose-400/70" />
                          </div>
                          {renderCard(spouseNode)}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
