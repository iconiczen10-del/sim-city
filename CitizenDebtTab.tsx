// CitizenDebtTab.tsx — Citizen Debt & Credit tab with overview KPIs, loan cards/table, and mindset details

import { useState } from 'react';
import { CitizenDebtMindAndLog } from './CitizenDebtMindAndLog';
import { formatDelta } from './formatters';
import type { Citizen, CityState } from './types';
import { LOAN_LABELS } from './vijBankCatalog';
import { ensureCitizenDebtProfile } from './vijBankSetup';

interface CitizenDebtTabProps {
  citizen: Citizen;
  city: CityState;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
  restructured: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
  defaulted: 'border-rose-500/50 text-rose-300 bg-rose-500/10',
  written_off: 'border-red-500/40 text-red-300 bg-red-500/10',
  paid: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
};

export function CitizenDebtTab({ citizen, city }: CitizenDebtTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const prof = ensureCitizenDebtProfile(citizen);
  const loans = (city.bank?.loans ?? []).filter((l) => l.borrowerId === citizen.id);

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { label: 'Credit Score', val: `${prof.creditScore} (${prof.creditBand})`, cls: prof.creditScore >= 670 ? 'text-emerald-300' : prof.creditScore >= 580 ? 'text-amber-300' : 'text-rose-300' },
          { label: 'Total Debt', val: formatDelta(prof.totalDebt), cls: prof.totalDebt > 0 ? 'text-amber-300' : 'text-slate-100' },
          { label: 'Monthly Due', val: `${formatDelta(prof.monthlyObligation)}/mo`, cls: 'text-slate-100' },
          { label: 'Debt-to-Income', val: `${Math.round(prof.dtiRatio * 100)}%`, cls: prof.dtiRatio > 0.45 ? 'text-rose-300' : 'text-slate-200' },
          { label: 'Risk Level', val: prof.riskLevel, cls: prof.riskLevel === 'Critical' ? 'text-rose-400' : prof.riskLevel === 'Elevated' ? 'text-amber-300' : 'text-emerald-300' },
        ].map((k) => (
          <div key={k.label} className="bg-[#0c1220] border border-slate-800/80 rounded-md px-3 py-2.5">
            <div className="text-[11px] text-slate-400">{k.label}</div>
            <div className={`font-mono tabular-nums text-sm font-semibold mt-0.5 ${k.cls}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <section className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Vij Bank Loans ({loans.length})</h3>
          {prof.inheritedDebtTotal > 0 && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
              Inherited Debt: {formatDelta(prof.inheritedDebtTotal)}
            </span>
          )}
        </div>

        {loans.length === 0 ? (
          <div className="text-slate-500 py-3">No Vij Bank loans on record.</div>
        ) : (
          <>
            {/* Mobile stacked tap-to-expand cards */}
            <div className="sm:hidden space-y-2">
              {loans.map((l) => {
                const open = expandedId === l.id;
                return (
                  <div key={l.id} className="bg-[#111827] border border-slate-800 rounded-md">
                    <button type="button" onClick={() => setExpandedId(open ? null : l.id)} className="w-full min-h-[44px] px-3 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-100 truncate">{LOAN_LABELS[l.type]}</div>
                        <div className="font-mono text-[11px] text-slate-400">Bal {formatDelta(l.balance)} · {formatDelta(l.monthlyInstallment)}/mo</div>
                      </div>
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border uppercase shrink-0 ${STATUS_BADGE[l.status] ?? 'border-slate-700 text-slate-300'}`}>{l.status.replace('_', ' ')}</span>
                    </button>
                    {open && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-300">
                        <div>Originated: {l.originatedDate} · APR {Math.round(l.annualRate * 100)}% · {l.monthsRemaining}/{l.termMonths}m left</div>
                        {l.collateralLabel && <div className="text-sky-300">Collateral: {l.collateralLabel}</div>}
                        {l.inheritedFromName && <div className="text-amber-300">Inherited from {l.inheritedFromName} ({l.heirAction ?? 'accepted'})</div>}
                        <div className="text-slate-400">Why: {l.reasonWhy}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PC Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                    <th className="py-1.5 pr-3">Loan</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5 pr-3">Balance</th>
                    <th className="py-1.5 pr-3">Instalment</th><th className="py-1.5 pr-3">APR</th><th className="py-1.5">Collateral / Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loans.map((l) => (
                    <tr key={l.id} className="text-slate-200">
                      <td className="py-2 pr-3 font-medium">{LOAN_LABELS[l.type]}<div className="text-[10px] text-slate-500">{l.originatedDate}</div></td>
                      <td className="py-2 pr-3"><span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase ${STATUS_BADGE[l.status] ?? 'border-slate-700 text-slate-300'}`}>{l.status.replace('_', ' ')}</span></td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-amber-300">{formatDelta(l.balance)}</td>
                      <td className="py-2 pr-3 font-mono tabular-nums">{formatDelta(l.monthlyInstallment)}/mo</td>
                      <td className="py-2 pr-3 font-mono tabular-nums">{Math.round(l.annualRate * 100)}%</td>
                      <td className="py-2 text-[11px] text-slate-400">
                        {l.collateralLabel ? `Collateral: ${l.collateralLabel}` : l.inheritedFromName ? `Inherited from ${l.inheritedFromName}` : l.reasonWhy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <CitizenDebtMindAndLog profile={prof} inheritedNote={citizen.inheritedDebtNote} />
    </div>
  );
}
