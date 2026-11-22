// CitizenWorkSection.tsx — Employment, salary, performance, boss relationship, and work history

import { formatDelta } from './formatters';
import type { Citizen, CityState } from './types';

interface CitizenWorkSectionProps {
  citizen: Citizen;
  city: CityState;
}

export function CitizenWorkSection({ citizen, city }: CitizenWorkSectionProps) {
  const employer = citizen.employerId ? city.companies.find((c) => c.id === citizen.employerId) : null;
  const boss = citizen.bossId ? city.citizens.find((c) => c.id === citizen.bossId) : null;

  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-semibold text-slate-200">Career &amp; Boss Relationship</span>
        <span className="font-mono text-amber-300">
          {employer ? `${employer.name} · ${citizen.roleLevel}` : `Unemployed (${citizen.unemployedDays}d)`}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2.5">
        <div>
          <div className="text-slate-400">Monthly Salary</div>
          <div className="font-mono font-semibold text-slate-100 mt-0.5">{formatDelta(citizen.lastGrossPay)}</div>
        </div>
        <div>
          <div className="text-slate-400">Tenure</div>
          <div className="font-mono text-slate-100 mt-0.5">{citizen.tenureMonths} mo</div>
        </div>
        <div>
          <div className="text-slate-400">Performance</div>
          <div className="font-mono text-slate-100 mt-0.5">{citizen.performanceScore} / 100</div>
        </div>
        <div>
          <div className="text-slate-400">Direct Boss</div>
          <div className="text-slate-200 truncate mt-0.5">{boss ? boss.name : citizen.roleLevel === 'CEO' ? 'Board' : 'None'}</div>
        </div>
        <div>
          <div className="text-slate-400">Boss Relation</div>
          <div className={`font-mono font-semibold mt-0.5 ${citizen.bossRelationship >= 15 ? 'text-emerald-300' : citizen.bossRelationship <= -15 ? 'text-rose-300' : 'text-slate-200'}`}>
            {citizen.bossRelationship > 0 ? `+${citizen.bossRelationship}` : citizen.bossRelationship}
          </div>
        </div>
      </div>

      {citizen.workHistory.length > 0 && (
        <div className="pt-2 border-t border-slate-800/70 space-y-1 max-h-28 overflow-y-auto">
          {citizen.workHistory.slice(0, 6).map((w, idx) => (
            <div key={`${w.id}_${idx}`} className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 truncate">{w.note}</span>
              <span className="font-mono text-slate-500 shrink-0 ml-2">{w.dateLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
