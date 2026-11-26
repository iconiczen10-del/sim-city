// CompanyDetailModal.tsx — Company financials, clickable org chart, profit chart, and filtered events

import { X } from 'lucide-react';
import { CompanyOrgChart } from './CompanyOrgChart';
import type { Company } from './companyTypes';
import { formatDelta, formatSignedDelta } from './formatters';
import { RecordsPanel } from './RecordsPanel';
import { SparkChart } from './SparkChart';
import type { Citizen, CityEvent } from './types';

interface CompanyDetailModalProps {
  company: Company;
  citizens: Citizen[];
  events: CityEvent[];
  onSelectCitizen: (citizenId: string) => void;
  onClose: () => void;
}

export function CompanyDetailModal({
  company,
  citizens,
  events,
  onSelectCitizen,
  onClose,
}: CompanyDetailModalProps) {
  const ceo = citizens.find((c) => c.id === company.ceoId && c.alive);
  const profitPoints = company.history.map((h) => ({ label: h.label, value: Math.round(h.profit) }));
  const compEvents = events.filter(
    (e) => e.companyId === company.id || e.detail.toLowerCase().includes(company.name.toLowerCase())
  ).slice(0, 12);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-6" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto overflow-x-hidden bg-[#111827] border border-slate-700/80 rounded-lg p-4 sm:p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="font-display text-lg sm:text-xl font-semibold text-slate-50">{company.name}</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-300">{company.sector}</span>
              <span className={`font-mono text-xs px-2 py-0.5 rounded border ${company.bankrupt ? 'border-rose-500/50 text-rose-300 bg-rose-500/10' : company.direction === 'aggressive' ? 'border-amber-500/40 text-amber-300 bg-amber-500/10' : 'border-sky-500/40 text-sky-300 bg-sky-500/10'}`}>
                {company.bankrupt ? 'Bankrupt' : company.direction === 'aggressive' ? 'Aggressive CEO' : 'Conservative CEO'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              CEO: <span className="text-slate-200 font-medium">{ceo ? ceo.name : 'Vacant'}</span> · Industry Pay Mult:{' '}
              <span className="font-mono text-amber-300">{company.industryMultiplier.toFixed(2)}x</span> · Reputation:{' '}
              <span className="font-mono text-slate-200">{company.reputation.toFixed(0)}/100</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close company modal" className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer shrink-0">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {[
            { label: 'Cash Reserve', val: formatDelta(company.cash) },
            { label: 'Last Month Revenue', val: formatDelta(company.lastMonthRevenue) },
            { label: 'Monthly Payroll', val: formatDelta(company.monthlyPayrollCost) },
            { label: 'Last Biz Tax (5%)', val: formatDelta(company.monthlyBusinessTax) },
            { label: 'Last Month Profit', val: formatSignedDelta(company.lastMonthProfit) },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#0c1220] border border-slate-800/80 rounded-md px-3 py-2.5">
              <div className="text-[11px] text-slate-400">{kpi.label}</div>
              <div className="font-mono text-base font-semibold text-slate-100 mt-0.5">{kpi.val}</div>
            </div>
          ))}
        </div>

        <CompanyOrgChart company={company} citizens={citizens} onSelectCitizen={(id) => { onClose(); onSelectCitizen(id); }} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SparkChart title="Monthly Profit Over Time (∆)" points={profitPoints} strokeColor="#34d399" formatValue={(v) => formatSignedDelta(v)} />

          <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2 text-xs">
            <div className="font-semibold text-slate-200 border-b border-slate-800 pb-2">{company.name} Event Feed</div>
            {compEvents.length === 0 ? (
              <div className="text-slate-500 py-8 text-center">No company events logged yet.</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {compEvents.map((evt, idx) => (
                  <div key={`${evt.id}_${idx}`} className="border-b border-slate-800/60 pb-1.5">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-200">{evt.title}</span>
                      <span className="font-mono text-[11px] text-slate-500">{evt.dateLabel}</span>
                    </div>
                    <div className="text-slate-400 mt-0.5">{evt.detail}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {(company.sharityCriticismLog?.length ?? 0) > 0 && (
          <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2 text-xs">
            <div className="font-semibold text-amber-300 border-b border-slate-800 pb-2">Sharity Criticism &amp; Reputation Incidents ({company.sharityCriticismLog!.length})</div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {company.sharityCriticismLog!.slice(0, 8).map((inc) => (
                <div key={inc.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-300 truncate">{inc.summary}</span>
                  <span className="font-mono text-rose-300 shrink-0">{inc.deltaRep.toFixed(1)} rep · {inc.dateLabel}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4">
          <RecordsPanel pageSize={3} fixedSubjectId={company.id} title={`${company.name} Records`} refreshKey={events[0]?.totalDay} />
        </div>
      </div>
    </div>
  );
}
