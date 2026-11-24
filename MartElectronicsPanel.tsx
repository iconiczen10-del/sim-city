// MartElectronicsPanel.tsx — Vij Mart Electronics category inventory, pricing mood, and in-transit deliveries

import { APPLIANCE_CATALOG, TIER_LABELS } from './electronicsCatalog';
import type { ElectronicsOrder, ElectronicsStockItem } from './electronicsTypes';
import { formatPrice } from './formatters';
import type { CategoryMoodState } from './martTypes';

interface MartElectronicsPanelProps {
  stock?: ElectronicsStockItem[];
  mood?: CategoryMoodState;
  deliveries?: ElectronicsOrder[];
}

export function MartElectronicsPanel({ stock = [], mood, deliveries = [] }: MartElectronicsPanelProps) {
  if (stock.length === 0) return null;

  return (
    <section className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-slate-100">
          Vij Mart Electronics Category ({stock.length} SKUs)
        </h2>
        <span className="text-xs text-slate-400 font-mono tabular-nums">
          Mood: <span className="text-amber-300 capitalize">{mood?.mood ?? 'typical'}</span> ({mood?.marginPct ?? 48}% margin) · {deliveries.length} order(s) in transit
        </span>
      </div>

      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-[#0c1220]">
              <th className="text-left font-medium px-4 py-2.5">Appliance</th>
              <th className="text-left font-medium px-4 py-2.5">Tier</th>
              <th className="text-right font-medium px-4 py-2.5">Qty</th>
              <th className="text-right font-medium px-4 py-2.5">Wholesale</th>
              <th className="text-right font-medium px-4 py-2.5">Base</th>
              <th className="text-right font-medium px-4 py-2.5">Sell Price</th>
              <th className="text-right font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {stock.map((s) => {
              const inTransit = deliveries.some((d) => d.applianceId === s.applianceId && d.tier === s.tier);
              const spec = APPLIANCE_CATALOG[s.applianceId];
              return (
                <tr key={`${s.applianceId}_${s.tier}`} className="hover:bg-slate-800/25">
                  <td className="px-4 py-2 text-slate-200 font-medium">{spec.name}</td>
                  <td className="px-4 py-2 text-slate-300">{TIER_LABELS[s.tier]}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-100">{s.quantity}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-400">{formatPrice(s.buyCost)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-400">{formatPrice(s.basePrice)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-amber-300">{formatPrice(s.sellPrice)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${s.quantity === 0 ? 'text-rose-300' : s.quantity <= 1 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {s.quantity === 0 ? (inTransit ? 'Out (Ordered)' : 'Out of Stock') : inTransit ? 'Low (In Transit)' : s.quantity <= 1 ? 'Low Stock' : 'In Stock'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
