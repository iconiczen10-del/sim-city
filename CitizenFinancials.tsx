// CitizenFinancials.tsx — Fixed monthly costs, estimated Mart spending, and personality traits

import { FIXED_NON_RENT_COSTS } from './constants';
import { calculateFixedMonthlyCosts } from './economy';
import { formatDelta, formatSignedDelta, HOME_LABELS } from './formatters';
import { estimateMonthlyShoppingCost } from './standards';
import type { Citizen } from './types';

interface CitizenFinancialsProps {
  citizen: Citizen;
}

const TRAIT_LIST: { key: keyof Citizen['traits']; label: string }[] = [
  { key: 'ambition', label: 'Ambition' },
  { key: 'greed', label: 'Greed' },
  { key: 'kindness', label: 'Kindness' },
  { key: 'loyalty', label: 'Loyalty' },
  { key: 'sociability', label: 'Sociability' },
  { key: 'discipline', label: 'Discipline' },
];

export function CitizenFinancials({ citizen }: CitizenFinancialsProps) {
  const netPay = citizen.lastGrossPay - citizen.lastTax;
  const fixed = calculateFixedMonthlyCosts(citizen.homeType);
  const estMartSpend = estimateMonthlyShoppingCost(citizen.standards);
  const estMonthlyBalance = netPay - fixed.total - estMartSpend;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2">
        <div className="text-xs font-semibold text-slate-200 mb-2">Monthly Budget & Fixed Costs</div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Gross Monthly Pay</span>
          <span className="font-mono text-slate-100">{formatDelta(citizen.lastGrossPay)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Income Tax (Marginal)</span>
          <span className="font-mono text-rose-300">-{formatDelta(citizen.lastTax)}</span>
        </div>
        <div className="flex justify-between text-xs pt-1 border-t border-slate-800/70">
          <span className="text-slate-300">Net Monthly Income</span>
          <span className="font-mono font-medium text-slate-100">{formatDelta(netPay)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Rent ({HOME_LABELS[citizen.homeType]})</span>
          <span className="font-mono text-slate-300">-{formatDelta(fixed.rent)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Utilities, Transport, Health, Net</span>
          <span className="font-mono text-slate-300">-{formatDelta(FIXED_NON_RENT_COSTS.total)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Est. Vij Mart Living Spend</span>
          <span className="font-mono text-slate-300">-{formatDelta(estMartSpend)}</span>
        </div>
        {citizen.rentArrears > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-rose-300">Unpaid Rent Arrears</span>
            <span className="font-mono text-rose-300">{formatDelta(citizen.rentArrears)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs pt-1.5 border-t border-slate-800">
          <span className="font-medium text-slate-200">Est. Net Monthly Surplus</span>
          <span className={`font-mono font-semibold ${estMonthlyBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {formatSignedDelta(estMonthlyBalance)}
          </span>
        </div>
      </div>

      <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4">
        <div className="text-xs font-semibold text-slate-200 mb-3">Personality Traits (0–100)</div>
        <div className="space-y-2">
          {TRAIT_LIST.map(({ key, label }) => {
            const val = citizen.traits[key];
            return (
              <div key={key} className="flex items-center gap-3 text-xs">
                <span className="w-20 text-slate-400 shrink-0">{label}</span>
                <div className="flex-1 h-1.5 bg-slate-900 rounded-sm overflow-hidden">
                  <div className="h-full bg-sky-400/85" style={{ width: `${val}%` }} />
                </div>
                <span className="w-7 text-right font-mono text-slate-200">{val}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
