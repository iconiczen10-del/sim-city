// GJStaffPanel.tsx — GJ Electricity 1-6 non-CEO staff roster, unfilled seats, pay bands, and active subsidy assessor

import { Users } from 'lucide-react';
import { formatDelta } from './formatters';
import { GJ_STAFF_SPECS } from './gjStaffCatalog';
import { getGJAssessorInfo, getGJStaffWithTitles } from './gjStaffEngine';
import type { CityState } from './types';

interface GJStaffPanelProps {
  city: CityState;
  onSelectCitizen: (citizenId: string) => void;
}

export function GJStaffPanel({ city, onSelectCitizen }: GJStaffPanelProps) {
  const gj = city.companies.find((c) => c.id === 'gjelectricity');
  const roster = getGJStaffWithTitles(city.citizens);
  const nonCeoCount = roster.filter((r) => r.title !== 'CEO').length;
  const filledTitles = new Set(roster.map((r) => r.title));
  const openTitles = new Set(city.vacancies.filter((v) => v.companyId === 'gjelectricity').map((v) => v.gjJobTitle));
  const assessor = getGJAssessorInfo(city.citizens, gj);

  return (
    <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-300" aria-hidden="true" />
          <h3 className="font-display text-sm font-semibold text-slate-100">GJ Staff Roster ({nonCeoCount}/6 Staff + CEO)</h3>
        </div>
        <span className="font-mono tabular-nums text-[11px] text-amber-300">
          Assessor: {assessor.assessorTitle} ({Math.round(assessor.accuracy * 100)}% · {assessor.monthlyReach} homes/mo)
        </span>
      </div>

      <div className="divide-y divide-slate-800/70">
        {roster.map(({ citizen, title }) => (
          <button
            key={citizen.id}
            type="button"
            onClick={() => onSelectCitizen(citizen.id)}
            className="w-full min-h-[44px] py-2 px-2 -mx-2 flex items-center justify-between gap-2 text-left hover:bg-slate-800/30 rounded cursor-pointer"
          >
            <div className="min-w-0">
              <div className="font-medium text-slate-100 truncate">
                {citizen.name} <span className="text-amber-300 font-normal">· {title}</span>
              </div>
              <div className="text-slate-400">
                {citizen.roleLevel} · Skill {Math.round(citizen.skill)} · Perf {citizen.performanceScore}/100
              </div>
            </div>
            <span className="font-mono tabular-nums text-amber-300 shrink-0">{formatDelta(citizen.lastGrossPay)}/mo</span>
          </button>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
        <div className="text-[11px] font-medium text-slate-400">Role Coverage &amp; Pay Bands</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {GJ_STAFF_SPECS.map((spec) => {
            const filled = filledTitles.has(spec.title);
            const open = openTitles.has(spec.title);
            const tone = filled ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5' : open ? 'text-amber-300 border-amber-500/30 bg-amber-500/5' : 'text-slate-400 border-slate-800 bg-[#0c1220]';
            const badge = filled ? 'Filled' : open ? 'Hiring' : 'On Hold';
            return (
              <div key={spec.title} className={`border rounded px-2.5 py-1.5 flex items-center justify-between gap-2 ${tone}`}>
                <div className="min-w-0">
                  <div className="font-medium truncate">{spec.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono tabular-nums">{spec.roleLevel} · {formatDelta(spec.minPay)}–{formatDelta(spec.maxPay)}</div>
                </div>
                <span className="font-mono text-[10px] uppercase shrink-0">{badge}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
