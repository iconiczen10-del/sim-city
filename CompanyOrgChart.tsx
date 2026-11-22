// CompanyOrgChart.tsx — Clickable hierarchy tree from CEO to Entry showing pay, performance, and mood

import { ROLE_RANK, WORKING_ROLES_DESC } from './companyRules';
import type { Company } from './companyTypes';
import { formatDelta } from './formatters';
import type { Citizen, RoleLevel } from './types';

interface CompanyOrgChartProps {
  company: Company;
  citizens: Citizen[];
  onSelectCitizen: (citizenId: string) => void;
}

const ROLE_RING: Record<Exclude<RoleLevel, 'Unemployed'>, string> = {
  CEO: 'border-amber-500/50 bg-amber-500/10',
  Executive: 'border-purple-500/40 bg-purple-500/10',
  Manager: 'border-sky-500/40 bg-sky-500/10',
  'Team Lead': 'border-teal-500/40 bg-teal-500/10',
  Staff: 'border-slate-700 bg-[#090d16]',
  Entry: 'border-slate-800 bg-[#090d16]',
};

export function CompanyOrgChart({ company, citizens, onSelectCitizen }: CompanyOrgChartProps) {
  const staff = citizens
    .filter((c) => c.alive && c.employerId === company.id)
    .sort((a, b) => ROLE_RANK[b.roleLevel] - ROLE_RANK[a.roleLevel] || b.lastGrossPay - a.lastGrossPay);

  const byId = new Map(staff.map((c) => [c.id, c]));

  if (staff.length === 0) {
    return (
      <div className="bg-[#0c1220] border border-slate-800 rounded-md py-8 text-center text-xs text-slate-500">
        {company.bankrupt ? 'All staff laid off due to bankruptcy.' : 'No active employees in this company.'}
      </div>
    );
  }

  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200">Org Hierarchy Tree ({staff.length} staff)</span>
        <span className="text-slate-400">Click any employee to inspect</span>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {WORKING_ROLES_DESC.map((role, depth) => {
          const group = staff.filter((c) => c.roleLevel === role);
          if (group.length === 0) return null;
          return (
            <div key={role} style={{ paddingLeft: `${Math.min(depth * 14, 56)}px` }} className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                L{depth + 1} · {role} ({group.length})
              </div>
              <div className="grid grid-cols-3 gap-2">
                {group.map((emp) => {
                  const boss = emp.bossId ? byId.get(emp.bossId) : null;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => onSelectCitizen(emp.id)}
                      className={`text-left rounded border px-2.5 py-2 transition-colors hover:border-amber-400/70 cursor-pointer ${ROLE_RING[role]}`}
                    >
                      <div className="text-xs font-semibold text-slate-100 truncate">{emp.name}</div>
                      <div className="font-mono text-[11px] text-amber-300 mt-0.5">{formatDelta(emp.lastGrossPay)}/mo</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                        <span>Perf {emp.performanceScore}</span>
                        <span>Mood {Math.round(emp.mood)}</span>
                      </div>
                      {boss && <div className="text-[10px] text-slate-500 truncate mt-0.5">Reports to {boss.name}</div>}
                    </button>
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
