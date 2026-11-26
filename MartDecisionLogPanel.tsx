// MartDecisionLogPanel.tsx — Price factor breakdown and manager-attributed Mart decision log

import { CATEGORY_LABELS, formatPrice } from './formatters';
import type { MartState, ShoppingCategory } from './martTypes';

interface MartDecisionLogPanelProps {
  mart: MartState;
  selectedCat: ShoppingCategory;
}

export function MartDecisionLogPanel({ mart, selectedCat }: MartDecisionLogPanelProps) {
  const sampleItem = mart.stock.find((s) => s.category === selectedCat && s.standard === 3)
    ?? mart.stock.find((s) => s.category === selectedCat);
  const pf = sampleItem?.priceFactors;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
      <div className="sm:col-span-5 bg-[#111827] border border-slate-800/90 rounded-lg p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Why This Price ({CATEGORY_LABELS[selectedCat]} L3)
          </h3>
          {sampleItem && (
            <span className="font-mono text-xs text-amber-300">
              {formatPrice(sampleItem.sellPrice)} (Cost {formatPrice(sampleItem.buyCost)})
            </span>
          )}
        </div>
        {!pf ? (
          <div className="text-xs text-slate-500 py-6">Awaiting first end-of-day AI pricing cycle.</div>
        ) : (
          <div className="space-y-1.5 text-xs">
            {[
              ['Mood Base Margin', pf.baseMarginPct],
              ['Stock / Supply Days', pf.stockAdjPct],
              ['Shelf-Life Expiry', pf.expiryAdjPct],
              ['Demand Trend', pf.demandAdjPct],
              ['Citizen Affordability', pf.affordabilityAdjPct],
              ['Mart Cash Health', pf.cashAdjPct],
              ['Reputation Factor', pf.reputationAdjPct],
              ['Delays & Sabotage', pf.delaySabotageAdjPct],
            ].map(([label, pct]) => (
              <div key={String(label)} className="flex justify-between border-b border-slate-800/50 pb-1">
                <span className="text-slate-400">{label}</span>
                <span className={`font-mono ${Number(pct) > 0 ? 'text-amber-300' : Number(pct) < 0 ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {Number(pct) > 0 ? `+${pct}%` : `${pct}%`}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-semibold">
              <span className="text-slate-200">Effective Markup vs Cost</span>
              <span className="font-mono text-sky-300">{pf.finalMultiplier}x</span>
            </div>
          </div>
        )}
      </div>

      <div className="sm:col-span-7 bg-[#111827] border border-slate-800/90 rounded-lg p-4">
        <h3 className="font-display text-sm font-semibold text-slate-100 mb-3">Manager Decision Log</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {mart.decisionLog.slice(0, 30).map((d) => (
            <div key={d.id} className="text-xs border-b border-slate-800/60 pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-100">{d.summary}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] text-teal-300">{d.managerName ?? 'Floor Manager'}</span>
                  <span className="font-mono text-[11px] text-slate-500">{d.dateLabel}</span>
                </div>
              </div>
              <div className="text-slate-400 mt-0.5">{d.reason}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
