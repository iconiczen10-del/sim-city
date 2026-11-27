// OuterCityWaterPanel.tsx — Outer City Water status, L1-L5 pricing vs Mart, SimGod overrides, and purchase log

import { useState } from 'react';
import { formatDelta, formatPrice, STANDARD_LABELS } from './formatters';
import { findStockItem } from './martSetup';
import type { LivingStandard, MartState } from './martTypes';
import { ensureOuterCityWater, OUTER_SUPPLIER_LABELS } from './outerCityWater';
import type { OuterSupplierPersonality } from './outerCityWaterTypes';

interface OuterCityWaterPanelProps {
  mart: MartState;
  onSelectCitizen: (citizenId: string) => void;
  onSetPersonality: (personality: OuterSupplierPersonality) => void;
  onSetOverride: (mode: 'multiplier' | 'fixed_floor' | 'release', value: number, days: number) => void;
}

export function OuterCityWaterPanel({ mart, onSelectCitizen, onSetPersonality, onSetOverride }: OuterCityWaterPanelProps) {
  const ocw = mart.outerCityWater ?? ensureOuterCityWater(mart);
  const [multVal, setMultVal] = useState(1.5);
  const [daysVal, setDaysVal] = useState(5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-3.5">
          <div className="text-xs text-slate-400">Supplier Personality</div>
          <div className="text-sm font-semibold text-sky-300 mt-1">{OUTER_SUPPLIER_LABELS[ocw.personality]}</div>
          <div className="text-[11px] text-slate-500 mt-1">{ocw.driftNote}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-3.5">
          <div className="text-xs text-slate-400">Total Outer Water Sold</div>
          <div className="font-mono text-lg font-semibold text-slate-100 mt-1">{ocw.totalUnitsSold}u</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">{formatDelta(ocw.totalRevenue)} revenue</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-3.5">
          <div className="text-xs text-slate-400">Lost Vij Mart Sales</div>
          <div className="font-mono text-lg font-semibold text-rose-300 mt-1">{ocw.lostMartSalesCount}u</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">{formatDelta(ocw.lostMartRevenue)} missed</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-3.5">
          <div className="text-xs text-slate-400">Scarcity Streak</div>
          <div className="font-mono text-lg font-semibold text-amber-300 mt-1">{ocw.scarcityDays}d</div>
          <div className="text-[11px] text-slate-500 mt-1">{ocw.override ? `Override ${ocw.override.daysLeft}d left` : 'Market pricing active'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-2.5">
          <div className="text-xs font-semibold text-slate-200">Today&apos;s L1–L5 Prices (vs Vij Mart)</div>
          <div className="divide-y divide-slate-800/70 text-xs">
            {([1, 2, 3, 4, 5] as LivingStandard[]).map((lvl) => {
              const martP = findStockItem(mart, 'water', lvl)?.sellPrice ?? 0;
              const outerP = ocw.pricesByLevel[lvl];
              const pct = martP > 0 ? Math.round(((outerP - martP) / martP) * 100) : 0;
              return (
                <div key={lvl} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-300">L{lvl} · {STANDARD_LABELS[lvl]}</span>
                  <div className="font-mono flex items-center gap-3">
                    <span className="text-slate-500">Mart {formatPrice(martP)}</span>
                    <span className="text-sky-300 font-semibold">{formatPrice(outerP)}</span>
                    <span className="text-amber-300 text-[11px]">+{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-200">SimGod Supplier Overrides</div>
          <div className="flex flex-wrap gap-2">
            {(['fair_trader', 'opportunist', 'gouger'] as OuterSupplierPersonality[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onSetPersonality(p)}
                className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded text-xs font-medium border cursor-pointer ${
                  ocw.personality === p ? 'bg-sky-500/20 border-sky-400 text-sky-200' : 'bg-[#090d16] border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {OUTER_SUPPLIER_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <label className="text-slate-400">Mult:</label>
            <input type="number" step="0.1" min="0.5" max="4" value={multVal} onChange={(e) => setMultVal(Number(e.target.value) || 1)} className="w-16 bg-[#090d16] border border-slate-700 rounded px-2 py-1.5 font-mono text-slate-100" />
            <label className="text-slate-400">Days:</label>
            <input type="number" min="1" max="30" value={daysVal} onChange={(e) => setDaysVal(Number(e.target.value) || 1)} className="w-14 bg-[#090d16] border border-slate-700 rounded px-2 py-1.5 font-mono text-slate-100" />
            <button type="button" onClick={() => onSetOverride('multiplier', multVal, daysVal)} className="min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 cursor-pointer">
              Apply Multiplier
            </button>
            {ocw.override && (
              <button type="button" onClick={() => onSetOverride('release', 1, 0)} className="min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer">
                Release
              </button>
            )}
          </div>
        </section>
      </div>

      <section className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-semibold text-slate-200">
          Outer City Water Purchase Log ({ocw.purchaseLog.length})
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/70">
          {ocw.purchaseLog.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No emergency Outer City Water purchases yet.</div>
          ) : ocw.purchaseLog.slice(0, 80).map((log) => (
            <div key={log.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-mono text-slate-500 mr-2">D{log.day}</span>
                <button type="button" onClick={() => onSelectCitizen(log.buyerId)} className="font-medium text-sky-300 hover:underline cursor-pointer">
                  {log.buyerName}
                </button>
                {log.recipientName && <span className="text-slate-400"> (for {log.recipientName})</span>}
                <span className="text-slate-300 ml-2">bought {log.quantity}x L{log.level}</span>
                <span className="text-slate-500 ml-2">· {log.reason}</span>
              </div>
              <div className="font-mono text-slate-300 shrink-0">
                {formatPrice(log.unitPrice)}/u · <span className="text-amber-300">{formatPrice(log.totalPrice)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
