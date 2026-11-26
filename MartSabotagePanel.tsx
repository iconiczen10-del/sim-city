// MartSabotagePanel.tsx — SimGod sabotage powers and manager controls with confirmation prompts

import { useState } from 'react';
import { LIVING_STANDARDS, SHOPPING_CATEGORIES } from './constants';
import { CATEGORY_LABELS, STANDARD_LABELS } from './formatters';
import type { LivingStandard, ManagerStyle, MartState, ShoppingCategory } from './martTypes';

export interface SabotageHandlers {
  onStock: (action: 'destroy' | 'steal', cat: ShoppingCategory, std: LivingStandard, pct: number) => void;
  onContaminate: (cat: 'food' | 'water', std: LivingStandard, qty: number) => void;
  onPrice: (cat: ShoppingCategory, mode: 'fixed' | 'multiplier' | 'release', val: number, days: number) => void;
  onCloseShop: (days: number) => void;
  onCash: (delta: number) => void;
  onPersonality: (style: ManagerStyle, lean: number) => void;
}

interface MartSabotagePanelProps {
  mart: MartState;
  handlers: SabotageHandlers;
}

export function MartSabotagePanel({ mart, handlers }: MartSabotagePanelProps) {
  const [cat, setCat] = useState<ShoppingCategory>('food');
  const [std, setStd] = useState<LivingStandard>(3);
  const [pct, setPct] = useState(50);
  const [contamQty, setContamQty] = useState(12);
  const [priceMode, setPriceMode] = useState<'fixed' | 'multiplier'>('multiplier');
  const [priceVal, setPriceVal] = useState(2.5);
  const [priceDays, setPriceDays] = useState(5);
  const [closeDays, setCloseDays] = useState(3);
  const [cashAmt, setCashAmt] = useState(5000);
  const [style, setStyle] = useState<ManagerStyle>(mart.personality.style);
  const [lean, setLean] = useState(mart.personality.greedyLean);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-100">Stock & Batch Sabotage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={cat} onChange={(e) => setCat(e.target.value as ShoppingCategory)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
            {SHOPPING_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <select value={std} onChange={(e) => setStd(Number(e.target.value) as LivingStandard)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
            {LIVING_STANDARDS.map((l) => <option key={l} value={l}>L{l} · {STANDARD_LABELS[l]}</option>)}
          </select>
          <input type="number" min={10} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value) || 50)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" title="Percentage %" />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => handlers.onStock('destroy', cat, std, pct)} className="flex-1 py-1.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 cursor-pointer">
            Destroy {pct}%
          </button>
          <button type="button" onClick={() => handlers.onStock('steal', cat, std, pct)} className="flex-1 py-1.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 cursor-pointer">
            Steal {pct}%
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center gap-2">
          <span className="text-slate-400">Contaminate</span>
          <input type="number" min={1} max={100} value={contamQty} onChange={(e) => setContamQty(Number(e.target.value) || 5)} className="w-20 bg-[#090d16] border border-slate-800 rounded px-2 py-1 font-mono text-slate-100" />
          <button
            type="button"
            onClick={() => handlers.onContaminate(cat === 'water' ? 'water' : 'food', std, contamQty)}
            className="flex-1 py-1.5 rounded bg-lime-500/15 border border-lime-500/40 text-lime-300 hover:bg-lime-500/25 cursor-pointer"
          >
            Taint {cat === 'water' ? 'Water' : 'Food'} L{std}
          </button>
        </div>
      </section>

      <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-100">Price Override & Store Closure</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={priceMode} onChange={(e) => setPriceMode(e.target.value as 'fixed' | 'multiplier')} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
            <option value="multiplier">Multiplier</option>
            <option value="fixed">Fixed ∆</option>
          </select>
          <input type="number" step="0.1" min={0.1} value={priceVal} onChange={(e) => setPriceVal(Number(e.target.value) || 1)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" />
          <input type="number" min={1} max={30} value={priceDays} onChange={(e) => setPriceDays(Number(e.target.value) || 5)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" />
          <button type="button" onClick={() => handlers.onPrice(cat, priceMode, priceVal, priceDays)} className="rounded bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 cursor-pointer">
            Override
          </button>
        </div>
        {mart.overrides[cat] && (
          <button type="button" onClick={() => handlers.onPrice(cat, 'release', 1, 0)} className="w-full py-1 rounded bg-slate-800 text-sky-300 hover:bg-slate-700 cursor-pointer">
            Release {CATEGORY_LABELS[cat]} Override ({mart.overrides[cat]?.daysLeft}d left)
          </button>
        )}

        <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center gap-2">
          <span className="text-slate-400">Close Shop (days)</span>
          <input type="number" min={0} max={30} value={closeDays} onChange={(e) => setCloseDays(Number(e.target.value) || 0)} className="w-20 bg-[#090d16] border border-slate-800 rounded px-2 py-1 font-mono text-slate-100" />
          <button type="button" onClick={() => handlers.onCloseShop(closeDays)} className="flex-1 py-1.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 cursor-pointer">
            Close {closeDays}d
          </button>
        </div>
      </section>

      <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-100">Mart Cash Injection / Drain</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" min={100} step={500} value={cashAmt} onChange={(e) => setCashAmt(Number(e.target.value) || 500)} className="flex-1 min-w-[100px] bg-[#090d16] border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-100" />
          <button type="button" onClick={() => handlers.onCash(cashAmt)} className="px-3 py-1.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer">
            +Add ∆
          </button>
          <button type="button" onClick={() => handlers.onCash(-cashAmt)} className="px-3 py-1.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 cursor-pointer">
            -Drain ∆
          </button>
        </div>
      </section>

      <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-100">Manager Personality</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select value={style} onChange={(e) => setStyle(e.target.value as ManagerStyle)} className="bg-[#090d16] border border-slate-800 rounded px-2.5 py-1.5 text-slate-100">
            <option value="cautious">Cautious</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
          <input type="range" min={-50} max={50} value={lean} onChange={(e) => setLean(Number(e.target.value))} className="flex-1 accent-amber-500" />
          <span className="font-mono w-10 text-right text-slate-300">{lean > 0 ? `+${lean}` : lean}</span>
          <button type="button" onClick={() => handlers.onPersonality(style, lean)} className="px-3 py-1.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 hover:bg-sky-500/25 cursor-pointer">
            Apply
          </button>
        </div>
      </section>
    </div>
  );
}
