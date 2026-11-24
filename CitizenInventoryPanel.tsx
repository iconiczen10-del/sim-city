// CitizenInventoryPanel.tsx — Itemized citizen inventory table, survival meters, purchases, and SimGod actions

import { CitizenElectronicsList } from './CitizenElectronicsList';
import { CitizenInventoryActions } from './CitizenInventoryActions';
import { FOOD_SPOIL_DAYS, HOUSEHOLD_PACK_DAYS, SHOPPING_CATEGORIES } from './constants';
import { CATEGORY_LABELS, formatDelta, formatPrice, STANDARD_LABELS } from './formatters';
import { getUnitValue } from './simgodInventory';
import type { Citizen, CityState } from './types';

interface CitizenInventoryPanelProps {
  citizen: Citizen;
  city?: CityState;
  onUpdateCity?: (next: CityState) => void;
  showFullDetails?: boolean;
}

function MeterBar({ label, value, color }: { label: string; value: number; color: string }) {
  const rounded = Math.round(value);
  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono font-semibold text-slate-100">{rounded} / 100</span>
      </div>
      <div className="h-1.5 w-full bg-slate-900 rounded-sm overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${rounded}%` }} />
      </div>
    </div>
  );
}

export function CitizenInventoryPanel({ citizen, city, onUpdateCity, showFullDetails = false }: CitizenInventoryPanelProps) {
  const rows = [
    ...citizen.inventory.food.map((b, i) => ({
      key: `f_${i}`, cat: 'Food', std: `L${b.standard} · ${STANDARD_LABELS[b.standard]}`,
      qty: `${b.meals} meals`, cond: b.contaminated ? `${b.contaminated} tainted` : '100%',
      exp: `${Math.max(0, FOOD_SPOIL_DAYS - b.daysOld)}d left`, val: b.meals * getUnitValue('food', b.standard),
    })),
    ...citizen.inventory.water.map((w, i) => ({
      key: `w_${i}`, cat: 'Water', std: `L${w.standard} · ${STANDARD_LABELS[w.standard]}`,
      qty: `${w.days} days`, cond: w.contaminated ? `${w.contaminated} tainted` : '100%',
      exp: 'No expiry', val: w.days * getUnitValue('water', w.standard),
    })),
    ...citizen.inventory.outfits.map((o, i) => ({
      key: o.id + i, cat: 'Clothes', std: `L${o.standard} · ${STANDARD_LABELS[o.standard]}`,
      qty: '1 outfit', cond: `${Math.round(o.condition)}%`,
      exp: `~${Math.round(o.condition * 1.2)}d wear`, val: getUnitValue('clothes', o.standard) * (o.condition / 100),
    })),
    ...citizen.inventory.household.map((h, i) => ({
      key: `h_${i}`, cat: 'Household', std: `L${h.standard} · ${STANDARD_LABELS[h.standard]}`,
      qty: '1 pack', cond: `${Math.round((h.daysLeft / HOUSEHOLD_PACK_DAYS) * 100)}%`,
      exp: `${h.daysLeft}d left`, val: getUnitValue('household', h.standard) * (h.daysLeft / HOUSEHOLD_PACK_DAYS),
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <MeterBar label="Hunger" value={citizen.hunger} color={citizen.hunger < 30 ? 'bg-rose-500' : 'bg-amber-400'} />
        <MeterBar label="Thirst" value={citizen.thirst} color={citizen.thirst < 30 ? 'bg-rose-500' : 'bg-sky-400'} />
        <MeterBar label="Health" value={citizen.health} color={citizen.health < 45 ? 'bg-rose-500' : 'bg-emerald-400'} />
        <MeterBar label="Stress" value={citizen.stress} color={citizen.stress >= 60 ? 'bg-rose-500' : citizen.stress >= 35 ? 'bg-amber-400' : 'bg-teal-400'} />
      </div>

      {showFullDetails && city && onUpdateCity && (
        <CitizenInventoryActions citizen={citizen} city={city} onUpdateCity={onUpdateCity} />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Owned Items ({rows.length})</span>
            <span className="font-mono text-amber-300">Total {formatDelta(rows.reduce((s, r) => s + r.val, 0))}</span>
          </div>
          {!showFullDetails ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {SHOPPING_CATEGORIES.map((cat) => (
                <div key={cat} className="bg-[#090d16] border border-slate-800/70 rounded px-2.5 py-1.5 flex justify-between">
                  <span className="text-slate-400">{CATEGORY_LABELS[cat]}</span>
                  <span className="font-mono text-amber-300">L{citizen.standards[cat]}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-800/60 text-xs">
            {rows.length === 0 ? (
              <div className="text-slate-500 py-6 text-center">Inventory empty.</div>
            ) : rows.map((r) => (
              <div key={r.key} className="py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-slate-200 font-medium">{r.cat}</span>
                  <span className="text-slate-500 ml-1.5">{r.std}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-300 shrink-0">
                  {r.qty} · {r.cond} · {r.exp} · <span className="text-amber-300">{formatPrice(r.val)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4">
          <div className="text-xs font-semibold text-slate-200 mb-2.5">Recent Vij Mart Purchases</div>
          {citizen.recentPurchases.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">No purchases recorded yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {citizen.recentPurchases.slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-1">
                  <span className="text-slate-300 truncate">{p.quantity}x {CATEGORY_LABELS[p.category]} (L{p.standard})</span>
                  <span className="font-mono text-slate-400 shrink-0 ml-2">{formatPrice(p.totalPrice)} · {p.dateLabel}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <CitizenElectronicsList electronics={citizen.inventory.electronics} powerCutToday={citizen.housePowerCutToday} />
    </div>
  );
}
