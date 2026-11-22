// MartStockTable.tsx — Vij Mart inventory table across all 4 categories and 5 standards

import { CATEGORY_LABELS, formatPrice, STANDARD_LABELS } from './formatters';
import type { MartOrder, MartStockItem } from './martTypes';

interface MartStockTableProps {
  stock: MartStockItem[];
  deliveries: MartOrder[];
  martCash: number;
}

export function MartStockTable({ stock, deliveries, martCash }: MartStockTableProps) {
  return (
    <section className="bg-[#111827] border border-slate-800/90 rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-slate-100">
          Vij Mart Inventory & Uncapped AI Pricing
        </h2>
        <span className="text-xs text-slate-400">
          Dynamic AI pricing · Rationing below 2d supply
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-[#0c1220]">
              <th className="text-left font-medium px-4 py-2.5">Category</th>
              <th className="text-left font-medium px-4 py-2.5">Standard</th>
              <th className="text-right font-medium px-4 py-2.5">Qty</th>
              <th className="text-right font-medium px-4 py-2.5">Buy Cost</th>
              <th className="text-right font-medium px-4 py-2.5">Sell Price</th>
              <th className="text-right font-medium px-4 py-2.5">Forecast/d</th>
              <th className="text-right font-medium px-4 py-2.5">Supply Left</th>
              <th className="text-right font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {stock.map((item) => {
              const daysLeft = item.quantity / Math.max(0.2, item.dailyForecast);
              const inTransit = deliveries.some((d) => d.category === item.category && d.standard === item.standard);
              const priceDeltaPct = Math.round(((item.sellPrice - item.basePrice) / item.basePrice) * 100);

              let statusText = 'Nominal';
              let statusClass = 'text-emerald-300';
              if (item.quantity === 0) {
                statusText = inTransit ? 'Out (In Transit)' : martCash < item.buyCost * 2 ? 'Out (No Cash)' : 'Out of Stock';
                statusClass = 'text-rose-300';
              } else if (daysLeft < 2) {
                statusText = 'Rationed';
                statusClass = 'text-rose-300';
              } else if (inTransit) {
                statusText = 'In Transit';
                statusClass = 'text-sky-300';
              } else if (daysLeft < 4) {
                statusText = 'Low Stock';
                statusClass = 'text-amber-300';
              }

              return (
                <tr key={`${item.category}_${item.standard}`} className="hover:bg-slate-800/25">
                  <td className="px-4 py-2 text-slate-200 font-medium">{CATEGORY_LABELS[item.category]}</td>
                  <td className="px-4 py-2 text-slate-300">
                    L{item.standard} · {STANDARD_LABELS[item.standard]}
                    {item.contaminatedQty > 0 && (
                      <span className="ml-2 font-mono text-[10px] text-lime-300">({item.contaminatedQty} tainted)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-100">{item.quantity}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-400">{formatPrice(item.buyCost)}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-100">
                    {formatPrice(item.sellPrice)}{' '}
                    {priceDeltaPct !== 0 && (
                      <span className={priceDeltaPct > 0 ? 'text-amber-300' : 'text-emerald-300'}>
                        ({priceDeltaPct > 0 ? `+${priceDeltaPct}%` : `${priceDeltaPct}%`})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-400">{item.dailyForecast.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-300">{daysLeft.toFixed(1)}d</td>
                  <td className={`px-4 py-2 text-right font-medium ${statusClass}`}>{statusText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
