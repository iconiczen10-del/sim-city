// CitizenFamilyTab.tsx — Citizen Family tab: legacy, aging/relationship/pregnancy status, 4-part bond, achievements, and tree

import { MONTH_NAMES } from './constants';
import { FamilyTreeDiagram } from './FamilyTreeDiagram';
import type { FamilyAchievementCategory } from './familyTypes';
import { ensureFamilyState } from './familyTreeEngine';
import { formatDelta } from './formatters';
import type { Citizen, CityState } from './types';

interface CitizenFamilyTabProps { citizen: Citizen; city: CityState; onSelectCitizen?: (id: string) => void; }

const CAT_BADGE: Record<FamilyAchievementCategory, string> = {
  Economic: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Social: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Education: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Survival: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  Dark: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const STAGE_LABEL: Record<string, string> = {
  single: 'Single', awareness: 'Awareness', interest: 'Interest', pursuit: 'Pursuit',
  dating: 'Dating', cohabiting: 'Cohabiting', married: 'Married', widowed: 'Widowed',
};

export function CitizenFamilyTab({ citizen, city, onSelectCitizen }: CitizenFamilyTabProps) {
  const fam = ensureFamilyState(city);
  const line = citizen.familyId ? fam.families[citizen.familyId] : undefined;
  const byCit = new Map(city.citizens.map((c) => [c.id, c]));
  const partner = citizen.relationship?.partnerId ? byCit.get(citizen.relationship.partnerId) : undefined;
  const parents = (citizen.parentIds ?? []).map((id) => byCit.get(id)).filter((c): c is Citizen => Boolean(c));
  const children = (citizen.childrenIds ?? []).map((id) => byCit.get(id)).filter((c): c is Citizen => Boolean(c));
  const bMonth = MONTH_NAMES[((citizen.birthMonth ?? 1) - 1) % 12];
  const preg = fam.pregnancies.find((p) => p.carrierId === citizen.id || p.partnerId === citizen.id);
  const genPeaks = line ? Object.values(line.genPeaks).sort((a, b) => a.generation - b.generation) : [];
  const maxPeak = Math.max(...genPeaks.map((g) => g.peakSavings), 1);

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold text-slate-100">{line ? `${line.surname} Family` : 'Family Line'} · Gen {citizen.generation ?? 1}</div>
            <div className="text-[11px] text-slate-400">{line?.legacyLine ?? 'Founding resident'}</div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">Bday {citizen.birthDay ?? 1} {bMonth}</span>
            {citizen.lucky && <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Lucky</span>}
            {citizen.retired && <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">Retired</span>}
            {citizen.guardianId && <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">{citizen.guardianId === 'treasury' ? 'Treasury Foster' : `Guardian: ${byCit.get(citizen.guardianId)?.name ?? 'Relative'}`}</span>}
            {(citizen.trustFund ?? 0) > 0 && <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">Trust {formatDelta(citizen.trustFund ?? 0)}</span>}
            {citizen.inheritedDebtNote && <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">{citizen.inheritedDebtNote}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/70">
          <div className="bg-[#090d16] rounded p-2.5">
            <div className="text-[11px] text-slate-400">Relationship</div>
            <div className="font-semibold text-slate-100 mt-0.5">{STAGE_LABEL[citizen.relationship?.stage ?? 'single']}</div>
            {partner && (
              <button type="button" onClick={() => onSelectCitizen?.(partner.id)} className="text-[11px] text-amber-300 hover:underline cursor-pointer mt-0.5">
                {partner.name}
              </button>
            )}
            {preg && (
              <div className="mt-1 text-[11px] text-pink-300 font-medium">Expecting child · {Math.max(1, preg.dueDay - city.totalDays)}d left</div>
            )}
          </div>
          <div className="bg-[#090d16] rounded p-2.5">
            <div className="text-[11px] text-slate-400">Parents ({parents.length})</div>
            {parents.length === 0 ? <div className="text-slate-500 mt-0.5">First Generation</div> : (
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {parents.map((p) => <button key={p.id} type="button" onClick={() => onSelectCitizen?.(p.id)} className="text-sky-300 hover:underline cursor-pointer">{p.name}{p.alive ? '' : ' †'}</button>)}
              </div>
            )}
          </div>
          <div className="bg-[#090d16] rounded p-2.5">
            <div className="text-[11px] text-slate-400">Children ({children.length})</div>
            {children.length === 0 ? <div className="text-slate-500 mt-0.5">None</div> : (
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {children.map((ch) => <button key={ch.id} type="button" onClick={() => onSelectCitizen?.(ch.id)} className="text-emerald-300 hover:underline cursor-pointer">{ch.name} ({ch.age})</button>)}
              </div>
            )}
          </div>
        </div>
      </div>

      {citizen.parentBond && (
        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Youth Readiness &amp; Parent Bond</span>
            <span className="font-mono text-amber-300">Capability {citizen.capabilityScore ?? 0}/100 · {citizen.age < 25 ? 'Job-Locked (<25)' : citizen.youngAdultPhase}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([['Love', citizen.parentBond.love, 'text-emerald-300'], ['Gratitude', citizen.parentBond.gratitude, 'text-sky-300'], ['Financial Tension', citizen.parentBond.financialTension, 'text-amber-300'], ['Indep. Tension', citizen.parentBond.independenceTension, 'text-rose-300']] as const).map(([lbl, val, cls]) => (
              <div key={lbl} className="bg-[#090d16] rounded px-2.5 py-1.5">
                <div className="text-[10px] text-slate-400">{lbl}</div>
                <div className={`font-mono font-semibold ${cls}`}>{Math.round(val)} / 100</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {genPeaks.length > 0 && (
        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 space-y-2">
          <div className="font-semibold text-slate-200">Peak Savings by Generation</div>
          <div className="space-y-1.5">
            {genPeaks.map((g) => (
              <div key={g.generation} className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-400 w-12 shrink-0">Gen {g.generation}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${Math.max(4, Math.round((g.peakSavings / maxPeak) * 100))}%` }} />
                </div>
                <span className="font-mono text-[11px] text-amber-300 shrink-0">{formatDelta(g.peakSavings)} ({g.bestRole})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="font-semibold text-slate-200">Family Tree</div>
        <FamilyTreeDiagram family={fam} familyId={citizen.familyId ?? ''} currentCitizenId={citizen.id} citizens={city.citizens} onSelectCitizen={onSelectCitizen} />
      </div>

      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 space-y-2">
        <div className="font-semibold text-slate-200">Family Achievements ({line?.achievements.length ?? 0})</div>
        {!line || line.achievements.length === 0 ? (
          <div className="text-slate-500 text-[11px]">No family achievements unlocked yet.</div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {line.achievements.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 bg-[#090d16] rounded px-2.5 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${CAT_BADGE[a.category]}`}>{a.category}</span>
                  <span className="text-slate-100 font-medium">{a.title}</span>
                  <span className="text-slate-400 truncate">— {a.memberName}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">Day {a.day} · {a.dateLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
