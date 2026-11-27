// VijBankLoanTable.tsx — Responsive loan portfolio table (PC) and stacked expandable loan cards (mobile)

import { useState } from 'react';
import { formatDelta } from './formatters';
import { LOAN_LABELS } from './vijBankCatalog';
import type { BankLoan } from './vijBankTypes';

interface VijBankLoanTableProps {
  loans: BankLoan[];
  onSelectCitizen: (id: string) => void;
}

export function VijBankLoanTable({ loans, onSelectCitizen }: VijBankLoanTableProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'defaulted' | 'paid'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = loans.filter((l) => {
    if (filter === 'active') return l.status === 'active' || l.status === 'restructured';
    if (filter === 'defaulted') return l.status === 'defaulted' || l.status === 'written_off';
    if (filter === 'paid') return l.status === 'paid';
    return true;
  }).slice(0, 36);

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-slate-200">Vij Bank Loan Book ({loans.length})</div>
        <div className="flex flex-wrap gap-1">
          {(['all', 'active', 'defaulted', 'paid'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`min-h-[36px] sm:min-h-0 px-2.5 py-1 rounded border text-[11px] capitalize cursor-pointer ${filter === f ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold' : 'bg-[#090d16] text-slate-300 border-slate-800 hover:text-slate-100'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-slate-500 py-4 text-center">No loans matching filter.</div>
      ) : (
        <>
          <div className="sm:hidden space-y-2">
            {visible.map((l) => {
              const open = openId === l.id;
              return (
                <div key={l.id} className="bg-[#090d16] border border-slate-800 rounded-md">
                  <button type="button" onClick={() => setOpenId(open ? null : l.id)} className="w-full min-h-[44px] px-3 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 truncate">{l.borrowerName} · {LOAN_LABELS[l.type]}</div>
                      <div className="font-mono text-[11px] text-slate-400">Bal {formatDelta(l.balance)} · {Math.round(l.annualRate * 100)}% APR</div>
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-200 uppercase shrink-0">{l.status.replace('_', ' ')}</span>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 pt-1.5 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-300">
                      <div>Principal {formatDelta(l.principal)} · {formatDelta(l.monthlyInstallment)}/mo · {l.monthsRemaining}m left</div>
                      <div>Why: {l.reasonWhy}</div>
                      {l.inheritedFromName && <div className="text-amber-300">Inherited from {l.inheritedFromName}</div>}
                      <button type="button" onClick={() => onSelectCitizen(l.borrowerId)} className="min-h-[36px] text-amber-300 hover:underline font-medium cursor-pointer">Open Borrower Profile →</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden sm:block overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="py-1.5 pr-3">Borrower</th><th className="py-1.5 pr-3">Product</th><th className="py-1.5 pr-3">Status</th>
                  <th className="py-1.5 pr-3">Balance</th><th className="py-1.5 pr-3">APR</th><th className="py-1.5">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {visible.map((l) => (
                  <tr key={l.id} className="text-slate-200">
                    <td className="py-1.5 pr-3"><button type="button" onClick={() => onSelectCitizen(l.borrowerId)} className="text-amber-300 hover:underline cursor-pointer">{l.borrowerName}</button></td>
                    <td className="py-1.5 pr-3">{LOAN_LABELS[l.type]}</td>
                    <td className="py-1.5 pr-3 font-mono text-[10px] uppercase">{l.status.replace('_', ' ')}</td>
                    <td className="py-1.5 pr-3 font-mono tabular-nums text-amber-300">{formatDelta(l.balance)}</td>
                    <td className="py-1.5 pr-3 font-mono tabular-nums">{Math.round(l.annualRate * 100)}%</td>
                    <td className="py-1.5 text-slate-400 truncate max-w-[180px]">{l.reasonWhy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
