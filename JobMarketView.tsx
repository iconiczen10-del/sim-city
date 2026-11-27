// JobMarketView.tsx — Open vacancies, candidate scoring queues, and recent hiring/firing activity

import { ROLE_PAY_BANDS } from './constants';
import { EDUCATION_LABELS, formatDelta } from './formatters';
import { GJ_SPEC_BY_TITLE } from './gjStaffCatalog';
import { collectApplicantsForVacancy } from './jobScoring';
import type { CityState } from './types';
import { BANK_SPEC_BY_TITLE } from './vijBankCatalog';

interface JobMarketViewProps {
  city: CityState;
  onSelectCitizen: (citizenId: string) => void;
}

const KIND_STYLE: Record<string, string> = {
  hired: 'text-emerald-300',
  promoted: 'text-sky-300',
  fired: 'text-rose-400',
  quit: 'text-amber-300',
  layoff: 'text-orange-400',
};

export function JobMarketView({ city, onSelectCitizen }: JobMarketViewProps) {
  const compMap = new Map(city.companies.map((c) => [c.id, c]));
  const unemployed = city.citizens.filter((c) => c.alive && c.roleLevel === 'Unemployed');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
        {[
          { label: 'Open Vacancies', val: String(city.vacancies.length) },
          { label: 'Unemployed Adults', val: String(unemployed.length) },
          { label: '60d+ Desperate Seekers', val: String(unemployed.filter((c) => c.unemployedDays >= 60).length) },
          { label: 'Career Moves Logged', val: String(city.jobEvents.length) },
        ].map((k) => (
          <div key={k.label} className="bg-[#111827] border border-slate-800/90 rounded-lg p-4">
            <div className="text-slate-400">{k.label}</div>
            <div className="font-mono text-2xl font-semibold text-slate-50 mt-1">{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
        <section className="sm:col-span-7 bg-[#111827] border border-slate-800/90 rounded-lg p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-100">Open Vacancies &amp; Applicant Queues</h2>
            <span className="font-mono text-xs text-slate-400">{city.vacancies.length} open</span>
          </div>
          {city.vacancies.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded">
              No open seats right now. Vacancies open on quits, firings, layoffs, deaths, or expansion.
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 text-xs">
              {city.vacancies.map((v) => {
                const gjSpec = v.gjJobTitle && v.gjJobTitle !== 'CEO' ? GJ_SPEC_BY_TITLE[v.gjJobTitle] : null;
                const bankSpec = v.bankJobTitle && v.bankJobTitle !== 'CEO' ? BANK_SPEC_BY_TITLE[v.bankJobTitle] : null;
                const customSpec = gjSpec ?? bankSpec;
                const band = customSpec ? { min: customSpec.minPay, max: customSpec.maxPay } : ROLE_PAY_BANDS[v.role];
                const titleTag = v.gjJobTitle && v.gjJobTitle !== 'CEO' ? `${v.gjJobTitle} (${v.role})` : v.bankJobTitle && v.bankJobTitle !== 'CEO' ? `${v.bankJobTitle} (${v.role})` : v.role;
                const comp = compMap.get(v.companyId);
                const apps = v.applicants.length > 0 ? v.applicants : comp ? collectApplicantsForVacancy(city.citizens, v, comp) : [];
                return (
                  <div key={v.id} className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-100">{v.companyName}</span>
                        <span className="text-amber-300 font-medium ml-2">{titleTag}</span>
                      </div>
                      <span className="font-mono text-slate-300">{formatDelta(band.min)}–{formatDelta(band.max)}/mo</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Req: {EDUCATION_LABELS[v.minEdu]}+ · Skill {v.minSkill}+ · {v.minExp}yr+ exp · Reason: {v.reason}
                    </div>
                    <div className="pt-1 border-t border-slate-800/60">
                      {apps.length === 0 ? (
                        <div className="text-[11px] text-slate-500">No qualified applicants currently available.</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {apps.slice(0, 5).map((a) => (
                            <button
                              key={a.citizenId}
                              type="button"
                              onClick={() => onSelectCitizen(a.citizenId)}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200 hover:border-amber-400 cursor-pointer"
                            >
                              {a.citizenName} ({a.currentRole === 'Unemployed' ? 'Unemp' : a.currentRole} · {a.score})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="sm:col-span-5 bg-[#111827] border border-slate-800/90 rounded-lg p-4 sm:p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-slate-100">Recent Hires, Fires, Quits &amp; Promotions</h2>
          {city.jobEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded">
              No job transitions recorded yet. Market clears at month end.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-[460px] overflow-y-auto pr-1 text-xs">
              {city.jobEvents.slice(0, 25).map((je, idx) => (
                <div key={`${je.id}_${idx}`} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => onSelectCitizen(je.citizenId)} className="font-medium text-slate-100 hover:text-amber-300 cursor-pointer">
                      {je.citizenName}
                    </button>
                    <span className={`font-mono uppercase text-[10px] font-semibold ${KIND_STYLE[je.kind] ?? 'text-slate-300'}`}>{je.kind}</span>
                  </div>
                  <div className="text-slate-400">{je.detail}</div>
                  <div className="font-mono text-[10px] text-slate-500">{je.dateLabel}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
