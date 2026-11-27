// VijCapitalBankPanel.tsx — Vij Bank dashboard inside Vij Capital: personality, reserves, loans, staff & power bill

import type { Company } from './companyTypes';
import type { ElectricityState } from './electricityTypes';
import { formatDelta } from './formatters';
import type { Citizen } from './types';
import { BANK_PERSONALITIES, BANK_SPEC_BY_TITLE } from './vijBankCatalog';
import { getBankLendableCash } from './vijBankCredit';
import { getBankStaffWithTitles } from './vijBankStaff';
import type { VijBankState } from './vijBankTypes';
import { VijBankLoanTable } from './VijBankLoanTable';

interface VijCapitalBankPanelProps {
  company: Company;
  bank: VijBankState;
  citizens: Citizen[];
  electricity?: ElectricityState;
  onSelectCitizen: (id: string) => void;
}

export function VijCapitalBankPanel({ company, bank, citizens, electricity, onSelectCitizen }: VijCapitalBankPanelProps) {
  const spec = BANK_PERSONALITIES[bank.personality];
  const lendable = getBankLendableCash(company, bank);
  const staff = getBankStaffWithTitles(citizens);
  const elecLedger = electricity?.companyLedgers?.vijcapital;

  return (
    <div className="bg-[#0c1220] border border-cyan-500/30 rounded-md p-4 space-y-4 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-cyan-300">Vij Bank Operations (Vij Capital)</h3>
          <p className="text-slate-400 mt-0.5">{spec.summary}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">{spec.label}</span>
          <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-200">Branch L{bank.branchLevel}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { label: 'Lendable Cash', val: formatDelta(lendable), cls: lendable < 500 ? 'text-rose-300' : 'text-emerald-300' },
          { label: 'Reserve Ratio', val: `${Math.round(bank.reserveRatio * 100)}%`, cls: 'text-slate-100' },
          { label: 'Total Loaned', val: formatDelta(bank.totalLoaned), cls: 'text-amber-300' },
          { label: 'Interest Earned', val: formatDelta(bank.totalInterestEarned), cls: 'text-cyan-300' },
          { label: 'Default Losses', val: formatDelta(bank.totalDefaultsLoss), cls: 'text-rose-300' },
        ].map((k) => (
          <div key={k.label} className="bg-[#111827] border border-slate-800 rounded p-2.5">
            <div className="text-[11px] text-slate-400">{k.label}</div>
            <div className={`font-mono tabular-nums text-sm font-semibold mt-0.5 ${k.cls}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#111827] border border-slate-800 rounded p-3 space-y-1.5">
          <div className="font-semibold text-slate-200">Banking Staff &amp; Duties ({staff.length})</div>
          <div className="divide-y divide-slate-800/60">
            {staff.map(({ citizen, title }) => (
              <div key={citizen.id} className="py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <button type="button" onClick={() => onSelectCitizen(citizen.id)} className="text-amber-300 hover:underline font-medium cursor-pointer truncate">{citizen.name}</button>
                  <div className="text-[10px] text-slate-400 truncate">{title}{title !== 'CEO' ? ` · ${BANK_SPEC_BY_TITLE[title].duty}` : ' · Bank strategy & reserves'}</div>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-slate-200 shrink-0">{formatDelta(citizen.lastGrossPay)}/mo</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded p-3 space-y-2">
          <div className="font-semibold text-slate-200">Branch Power &amp; Recovery Metrics</div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>Active Loans: <span className="font-mono text-slate-100">{bank.activeLoanCount}</span></div>
            <div>Defaults: <span className="font-mono text-rose-300">{bank.defaultedLoanCount}</span></div>
            <div>Repossessions: <span className="font-mono text-amber-300">{bank.repossessionsCount}</span></div>
            <div>Garnishments: <span className="font-mono text-rose-300">{bank.garnishmentsCount}</span></div>
          </div>
          {elecLedger && (
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 space-y-0.5">
              <div>GJ Power Use: <span className="font-mono text-cyan-300">{elecLedger.todayUnits.toFixed(1)}u/d</span> (MTD {elecLedger.monthUnits.toFixed(1)}u)</div>
              <div>
                Power Status:{' '}
                <span className={elecLedger.powerCut ? 'text-rose-400 font-semibold' : 'text-emerald-300'}>
                  {elecLedger.powerCut ? `CUT OFF (Arrears ${formatDelta(elecLedger.arrearsBalance)})` : `Connected · Arrears ${formatDelta(elecLedger.arrearsBalance)}`}
                </span>
              </div>
            </div>
          )}
          {bank.personalityHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
              Latest shift: {bank.personalityHistory[0].reason} ({bank.personalityHistory[0].dateLabel})
            </div>
          )}
        </div>
      </div>

      <VijBankLoanTable loans={bank.loans} onSelectCitizen={onSelectCitizen} />
    </div>
  );
}
