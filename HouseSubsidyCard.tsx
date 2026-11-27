// HouseSubsidyCard.tsx — Per-house GJ electricity subsidy package breakdown and expandable monthly subsidy history

import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { formatDelta } from './formatters';
import type { HouseSubsidyPackage } from './gjSubsidyTypes';
import type { House } from './housingTypes';

interface HouseSubsidyCardProps {
  house: House;
}

const BADGE_TONE: Record<HouseSubsidyPackage['status'], string> = {
  free_bill: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  lifeline: 'text-teal-300 border-teal-500/40 bg-teal-500/10',
  payment_plan: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
  active: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  refused: 'text-orange-300 border-orange-500/40 bg-orange-500/10',
  unreached: 'text-slate-300 border-slate-700 bg-slate-800/70',
  ineligible: 'text-slate-400 border-slate-800 bg-slate-900',
};

export function HouseSubsidyCard({ house }: HouseSubsidyCardProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sub = house.electricLedger?.currentSubsidy;
  const hist = house.electricLedger?.subsidyHistory ?? [];

  return (
    <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-300" aria-hidden="true" />
          <h3 className="font-display text-sm font-semibold text-slate-100">GJ Electricity Subsidy Status</h3>
        </div>
        {sub ? (
          <span className={`px-2 py-0.5 rounded border font-mono text-[11px] uppercase ${BADGE_TONE[sub.status]}`}>
            {sub.status.replace('_', ' ')} · Absorbed {formatDelta(sub.monthlyAbsorbed)}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-slate-500">Pending month-end assessment</span>
        )}
      </div>

      {sub && (
        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono tabular-nums text-[11px] text-slate-300">
            <span>Score {sub.score}/100 · Assessor: <span className="text-amber-300">{sub.assessorTitle}</span></span>
            <span>{sub.enrolled ? (sub.outreachDiscovered ? 'Enrolled via GJ outreach' : 'Auto-enrolled') : sub.status === 'refused' ? 'Declined by resident' : 'Not enrolled'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono tabular-nums text-[11px]">
            <div className="bg-[#090d16] border border-slate-800 rounded p-2">
              <div className="text-slate-500">Lifeline Band</div>
              <div className="text-slate-100 mt-0.5">{sub.lifelineMode === 'none' ? 'Standard' : `${sub.lifelineMode.replace('_', ' ')} (≤${sub.lifelineUnitLimit}u)`}</div>
            </div>
            <div className="bg-[#090d16] border border-slate-800 rounded p-2">
              <div className="text-slate-500">Waiver / Cap</div>
              <div className="text-slate-100 mt-0.5">{sub.waiverPct}% off {sub.incomeCapPct !== null ? `· ${sub.incomeCapPct}% pay cap` : ''}</div>
            </div>
            <div className="bg-[#090d16] border border-slate-800 rounded p-2 col-span-2 sm:col-span-1">
              <div className="text-slate-500">Plan &amp; Relief</div>
              <div className="text-slate-100 mt-0.5">
                {sub.paymentPlanMonths > 0 ? `${sub.paymentPlanMonths}mo plan` : 'No plan'}
                {sub.lateFeeWaived ? ' · Fee waived' : ''}
                {sub.coldSnapRelief > 0 ? ` · Cold -${formatDelta(sub.coldSnapRelief)}` : ''}
              </div>
            </div>
          </div>
          <div className="text-slate-300"><span className="text-slate-500">Reason: </span>{sub.reasonSummary}</div>
        </div>
      )}

      {hist.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-slate-400">Monthly Subsidy History</div>
          <div className="space-y-1.5">
            {hist.slice(0, 6).map((item) => {
              const open = openId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="w-full min-h-[44px] sm:min-h-[34px] bg-[#0c1220] border border-slate-800/80 rounded px-3 py-2 text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 font-mono tabular-nums text-[11px]">
                    <span className="text-slate-200">{item.dateLabel} · {item.status.replace('_', ' ')}</span>
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      -{formatDelta(item.monthlyAbsorbed)}
                      {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </span>
                  </div>
                  {open && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                      Assessor: {item.assessorTitle} · Score {item.score}/100 · {item.reasonSummary}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
