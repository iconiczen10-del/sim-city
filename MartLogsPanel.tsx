// MartLogsPanel.tsx — Tabbed view for Vij Mart customer sales, wholesale deliveries, and waste log

import { useState } from 'react';
import { CATEGORY_LABELS, formatPrice, STANDARD_LABELS } from './formatters';
import type { MartState } from './martTypes';

interface MartLogsPanelProps {
  mart: MartState;
}

const WASTE_LABELS = {
  spoiled: 'Spoiled',
  worn_out: 'Worn out',
  destroyed: 'Destroyed (Fire)',
  stolen: 'Stolen',
  contaminated: 'Contaminated',
} as const;

export function MartLogsPanel({ mart }: MartLogsPanelProps) {
  const [tab, setTab] = useState<'sales' | 'deliveries' | 'waste'>('sales');

  return (
    <section className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1 p-0.5 bg-[#090d16] border border-slate-800 rounded-md">
          {[
            { id: 'sales', label: `Customer Log (${mart.salesLog.length})` },
            { id: 'deliveries', label: `Deliveries (${mart.deliveries.length})` },
            { id: 'waste', label: `Waste & Loss (${mart.wasteLog.length})` },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                tab === item.id ? 'bg-slate-800 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/70">
        {tab === 'sales' &&
          (mart.salesLog.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No customer purchases recorded yet.</div>
          ) : (
            mart.salesLog.slice(0, 60).map((s) => (
              <div key={s.id} className="px-5 py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="font-medium text-slate-100">{s.citizenName}</span>
                  <span className="text-slate-400 ml-2">
                    bought {s.quantity}x {CATEGORY_LABELS[s.category]} (L{s.standard} {STANDARD_LABELS[s.standard]})
                  </span>
                  {s.contaminatedQty ? (
                    <span className="ml-2 font-mono text-[10px] text-lime-300">[TAINTED x{s.contaminatedQty}]</span>
                  ) : null}
                </div>
                <div className="font-mono text-slate-300 shrink-0 ml-4">
                  {formatPrice(s.totalPrice)} <span className="text-slate-500">· {s.dateLabel}</span>
                </div>
              </div>
            ))
          ))}

        {tab === 'deliveries' &&
          (mart.deliveries.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No wholesale deliveries currently in transit.</div>
          ) : (
            mart.deliveries.map((d) => (
              <div key={d.id} className="px-5 py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-slate-100">
                    {d.quantity}x {CATEGORY_LABELS[d.category]} (L{d.standard})
                  </span>
                  <span className="text-slate-400 ml-2">from {d.supplier}</span>
                  {d.isLate && <span className="ml-2 font-mono text-rose-300">LATE</span>}
                </div>
                <div className="font-mono text-sky-300 shrink-0 ml-4">
                  ETA {d.etaDays}d · {formatPrice(d.totalCost)}
                </div>
              </div>
            ))
          ))}

        {tab === 'waste' &&
          (mart.wasteLog.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No spoiled, worn, or sabotaged items logged yet.</div>
          ) : (
            mart.wasteLog.slice(0, 60).map((w) => (
              <div key={w.id} className="px-5 py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-slate-200">{w.ownerName}</span>
                  <span className="text-slate-400 ml-2">
                    lost {w.quantity}x {CATEGORY_LABELS[w.category]} (L{w.standard}) — {WASTE_LABELS[w.reason]}
                  </span>
                </div>
                <span className="font-mono text-slate-500 shrink-0 ml-4">{w.dateLabel}</span>
              </div>
            ))
          ))}
      </div>
    </section>
  );
}
