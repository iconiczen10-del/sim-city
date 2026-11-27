// GJSubsidyLogView.tsx — Responsive PC table and mobile tap-to-expand cards for GJ monthly subsidy assessments

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { formatDelta } from './formatters';
import type { GJSubsidyLogEntry, HouseSubsidyPackage } from './gjSubsidyTypes';

const STATUS_LABELS: Record<HouseSubsidyPackage['status'], { label: string; cls: string }> = {
  free_bill: { label: 'Free Bill', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  lifeline: { label: 'Lifeline', cls: 'text-teal-300 bg-teal-500/10 border-teal-500/30' },
  payment_plan: { label: 'Plan', cls: 'text-sky-300 bg-sky-500/10 border-sky-500/30' },
  active: { label: 'Subsidized', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
  refused: { label: 'Refused', cls: 'text-orange-300 bg-orange-500/10 border-orange-500/30' },
  unreached: { label: 'Unreached', cls: 'text-slate-300 bg-slate-800/60 border-slate-700' },
  ineligible: { label: 'Standard', cls: 'text-slate-400 bg-slate-900 border-slate-800' },
};

export function GJSubsidyLogView({ log }: { log: GJSubsidyLogEntry[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (log.length === 0) {
    return <div className="text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded">First subsidy assessment runs at month end (Day 30).</div>;
  }

  return (
    <div className="space-y-2">
      <div className="text-slate-400 font-medium">Recent Monthly Subsidy Decisions ({log.length})</div>
      <div className="hidden sm:block overflow-x-auto border border-slate-800/80 rounded">
        <table className="w-full text-left font-mono tabular-nums text-[11px]">
          <thead className="bg-[#0c1220] text-slate-400">
            <tr>
              <th className="py-2 px-2.5">Date</th><th className="py-2 px-2.5">House</th><th className="py-2 px-2.5">Status</th>
              <th className="py-2 px-2.5 text-right">Absorbed</th><th className="py-2 px-2.5">Assessor</th><th className="py-2 px-2.5">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {log.slice(0, 18).map((entry) => {
              const st = STATUS_LABELS[entry.status] ?? STATUS_LABELS.ineligible;
              return (
                <tr key={entry.id} className="hover:bg-slate-800/20">
                  <td className="py-1.5 px-2.5 text-slate-400 whitespace-nowrap">{entry.dateLabel}</td>
                  <td className="py-1.5 px-2.5 text-slate-100 font-sans font-medium whitespace-nowrap">{entry.houseName}</td>
                  <td className="py-1.5 px-2.5"><span className={`px-1.5 py-0.5 rounded border text-[10px] ${st.cls}`}>{st.label}</span></td>
                  <td className="py-1.5 px-2.5 text-right text-emerald-300">{formatDelta(entry.amountAbsorbed)}</td>
                  <td className="py-1.5 px-2.5 text-slate-300 font-sans whitespace-nowrap">{entry.assessor}</td>
                  <td className="py-1.5 px-2.5 text-slate-400 font-sans">{entry.reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden space-y-2">
        {log.slice(0, 14).map((entry) => {
          const st = STATUS_LABELS[entry.status] ?? STATUS_LABELS.ineligible;
          const open = expandedId === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setExpandedId(open ? null : entry.id)}
              className="w-full min-h-[44px] bg-[#0c1220] border border-slate-800 rounded-md p-3 text-left space-y-1.5 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-100 truncate">{entry.houseName}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${st.cls}`}>{st.label}</span>
                  <span className="font-mono tabular-nums text-emerald-300">{formatDelta(entry.amountAbsorbed)}</span>
                  {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>
              {open && (
                <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-0.5">
                  <div>{entry.dateLabel} · Assessor: <span className="text-slate-200">{entry.assessor}</span></div>
                  <div className="text-slate-300">Reason: {entry.reason}</div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
