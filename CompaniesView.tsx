// CompaniesView.tsx — 4 live company cards with click-to-inspect hierarchy and financials

import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { CompanyDetailModal } from './CompanyDetailModal';
import type { CompanyId } from './companyTypes';
import { formatDelta, formatSignedDelta } from './formatters';
import type { CityState } from './types';

interface CompaniesViewProps {
  city: CityState;
  onSelectCitizen: (citizenId: string) => void;
}

export function CompaniesView({ city, onSelectCitizen }: CompaniesViewProps) {
  const [selectedId, setSelectedId] = useState<CompanyId | null>(null);
  const selectedCompany = city.companies.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {city.companies.map((comp) => {
          const employees = city.citizens.filter((c) => c.alive && c.employerId === comp.id);
          const ceo = employees.find((c) => c.id === comp.ceoId) ?? employees.find((c) => c.roleLevel === 'CEO');
          const monthlyEstPayroll = employees.reduce((s, e) => s + e.lastGrossPay, 0);

          return (
            <button
              key={comp.id}
              type="button"
              onClick={() => setSelectedId(comp.id)}
              className="text-left bg-[#111827] border border-slate-800/90 hover:border-amber-500/50 rounded-lg p-5 space-y-4 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-slate-900 border border-slate-800 text-amber-300">
                    <Building2 className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-display text-base font-semibold text-slate-50">{comp.name}</div>
                    <div className="text-xs text-slate-400">{comp.sector} · Pay {comp.industryMultiplier.toFixed(2)}x</div>
                  </div>
                </div>
                <span className={`font-mono text-xs px-2 py-0.5 rounded border ${comp.bankrupt ? 'border-rose-500/40 text-rose-300 bg-rose-500/10' : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'}`}>
                  {comp.bankrupt ? 'Bankrupt' : `Rep ${comp.reputation.toFixed(0)}/100`}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-800/70">
                <div>
                  <div className="text-slate-400">Cash</div>
                  <div className={`font-mono font-semibold mt-0.5 ${comp.cash < 0 ? 'text-rose-300' : 'text-amber-300'}`}>{formatDelta(comp.cash)}</div>
                </div>
                <div>
                  <div className="text-slate-400">Last Revenue</div>
                  <div className="font-mono text-slate-100 mt-0.5">{formatDelta(comp.lastMonthRevenue)}</div>
                </div>
                <div>
                  <div className="text-slate-400">Last Costs</div>
                  <div className="font-mono text-slate-200 mt-0.5">{formatDelta(comp.lastMonthCosts || monthlyEstPayroll)}</div>
                </div>
                <div>
                  <div className="text-slate-400">Last Profit</div>
                  <div className={`font-mono font-semibold mt-0.5 ${comp.lastMonthProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {formatSignedDelta(comp.lastMonthProfit)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/70 text-slate-400">
                <span>CEO: <span className="text-slate-200 font-medium">{ceo ? ceo.name : 'Vacant'}</span></span>
                <span className="font-mono">Headcount: <span className="text-slate-100 font-semibold">{employees.length}</span> · Payroll {formatDelta(monthlyEstPayroll)}/mo</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          citizens={city.citizens}
          events={city.events}
          onSelectCitizen={onSelectCitizen}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
