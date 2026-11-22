// MartDeliveryPanel.tsx — SimGod per-category delivery schedule controls and in-transit order actions

import { SHOPPING_CATEGORIES } from './constants';
import { CATEGORY_LABELS, formatPrice } from './formatters';
import type { MartState, ShoppingCategory } from './martTypes';

interface MartDeliveryPanelProps {
  mart: MartState;
  onUpdateSchedule: (
    cat: ShoppingCategory,
    mode: 'auto' | 'manual',
    gapDays: number,
    targetSupplyDays: number
  ) => void;
  onOrderAction: (orderId: string, action: 'rush' | 'delay' | 'cancel', delayDays?: number) => void;
}

export function MartDeliveryPanel({
  mart,
  onUpdateSchedule,
  onOrderAction,
}: MartDeliveryPanelProps) {
  return (
    <div className="space-y-5">
      <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Delivery Schedule Control (Per Category)
          </h3>
          <span className="text-xs text-slate-400">2-day lead time · ∆40 trip fee · 4% discount over ∆1,500</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {SHOPPING_CATEGORIES.map((cat) => {
            const s = mart.schedules[cat];
            return (
              <div key={cat} className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-100">{CATEGORY_LABELS[cat]}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-sky-300">{s.nextDeliveryLabel}</span>
                    {s.mode === 'manual' && (
                      <button
                        type="button"
                        onClick={() => onUpdateSchedule(cat, 'auto', s.gapDays, s.targetSupplyDays)}
                        className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 rounded cursor-pointer"
                      >
                        Return to Auto
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="space-y-1">
                    <span className="text-slate-400 block">Deliver every N days</span>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={s.gapDays}
                      onChange={(e) => onUpdateSchedule(cat, 'manual', Number(e.target.value) || 1, s.targetSupplyDays)}
                      className="w-full bg-[#090d16] border border-slate-800 rounded px-2 py-1 font-mono text-slate-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-slate-400 block">Target supply (days)</span>
                    <input
                      type="number"
                      min={2}
                      max={14}
                      value={s.targetSupplyDays}
                      onChange={(e) => onUpdateSchedule(cat, 'manual', s.gapDays, Number(e.target.value) || 4)}
                      className="w-full bg-[#090d16] border border-slate-800 rounded px-2 py-1 font-mono text-slate-100"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            In-Transit Wholesale Orders ({mart.deliveries.length})
          </h3>
          <span className="text-xs text-slate-400">Rush fee ∆100 (next day)</span>
        </div>

        {mart.deliveries.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">No orders currently in transit.</div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {mart.deliveries.map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-medium text-slate-100">
                    {d.quantity}x {CATEGORY_LABELS[d.category]} (L{d.standard})
                  </span>
                  <span className="text-slate-400 ml-2">· {formatPrice(d.totalCost)} · Ordered {d.orderedDate}</span>
                  {d.isLate && <span className="ml-2 font-mono text-rose-300">LATE</span>}
                  {d.isRush && <span className="ml-2 font-mono text-amber-300">RUSH</span>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-sky-300 mr-2">ETA {d.etaDays}d</span>
                  <button
                    type="button"
                    onClick={() => onOrderAction(d.id, 'rush')}
                    className="px-2 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                  >
                    Rush (∆100)
                  </button>
                  <button
                    type="button"
                    onClick={() => onOrderAction(d.id, 'delay', 2)}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    Delay +2d
                  </button>
                  <button
                    type="button"
                    onClick={() => onOrderAction(d.id, 'cancel')}
                    className="px-2 py-1 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
