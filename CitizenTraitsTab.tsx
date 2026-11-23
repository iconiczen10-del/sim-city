// CitizenTraitsTab.tsx — Display all 18 citizen traits grouped cleanly with color-coded bars

import { TRAIT_METADATA, type TraitMeta } from './citizenTraits';
import type { Citizen } from './types';

interface CitizenTraitsTabProps {
  citizen: Citizen;
}

const GROUPS: TraitMeta['group'][] = ['Core Drives', 'Character & Integrity', 'Temperament & Survival'];

function traitBarColor(val: number): string {
  if (val >= 72) return 'bg-emerald-400';
  if (val >= 52) return 'bg-sky-400';
  if (val >= 32) return 'bg-amber-400';
  return 'bg-rose-400';
}

export function CitizenTraitsTab({ citizen }: CitizenTraitsTabProps) {
  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {GROUPS.map((group) => {
          const items = TRAIT_METADATA.filter((m) => m.group === group);
          return (
            <div key={group} className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-3">
              <div className="font-semibold text-slate-200 border-b border-slate-800 pb-2">{group}</div>
              <div className="space-y-3">
                {items.map((meta) => {
                  const val = Math.round(citizen.traits[meta.key] ?? 50);
                  return (
                    <div key={meta.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-medium">{meta.label}</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-100">{val} / 100</span>
                      </div>
                      <div className="h-2 bg-slate-900 rounded overflow-hidden border border-slate-800/70">
                        <div className={`h-full transition-all ${traitBarColor(val)}`} style={{ width: `${val}%` }} />
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">{meta.hint}</div>
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
