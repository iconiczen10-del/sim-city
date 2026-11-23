// HousingMarketPanel.tsx — For Sale, For Rent, Recent Housing Transactions, and Vij Capital Loans placeholder

import { formatDelta } from './formatters';
import { DISTRICTS, HOUSE_SPECS } from './housingCatalog';
import type { CityState } from './types';

interface HousingMarketPanelProps {
  city: CityState;
  onSelectHouse: (houseId: string) => void;
  onSelectCitizen: (citizenId: string) => void;
}

export function HousingMarketPanel({ city, onSelectHouse, onSelectCitizen }: HousingMarketPanelProps) {
  const citById = new Map(city.citizens.map((c) => [c.id, c]));
  const forSale = city.housing.houses.filter((h) => h.forSale && !h.condemned && h.buyPrice !== null);
  const forRent = city.housing.houses.filter((h) => !h.condemned && h.occupantIds.length < h.capacity);
  const txs = city.housing.transactions.slice(0, 30);

  return (
    <div className="space-y-5">
      <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-sm font-semibold text-slate-100">Vij Capital Loans — Coming Soon</div>
          <p className="text-xs text-slate-400 mt-0.5">All home purchases are currently cash-only. Mortgage underwriting and interest rates will arrive with Vij Capital lending.</p>
        </div>
        <span className="font-mono text-xs text-slate-500">Status: Cash Market Active</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">Homes For Sale (Cash Only)</h3>
            <span className="font-mono tabular-nums text-xs text-slate-400">{forSale.length} listings</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 text-xs">
            {forSale.map((h) => (
              <button key={h.id} type="button" onClick={() => onSelectHouse(h.id)} className="w-full py-2 flex items-center justify-between text-left hover:bg-slate-800/30 px-2 -mx-2 rounded cursor-pointer">
                <div>
                  <div className="font-medium text-slate-100">{h.name}</div>
                  <div className="text-slate-400">{HOUSE_SPECS[h.type].label} · {DISTRICTS[h.district].label} · Cond {h.condition}</div>
                </div>
                <span className="font-mono tabular-nums font-semibold text-amber-300">{formatDelta(h.buyPrice ?? 0)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">Available For Rent</h3>
            <span className="font-mono tabular-nums text-xs text-slate-400">{forRent.length} openings</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 text-xs">
            {forRent.map((h) => {
              const owner = h.ownerId === 'gov' ? 'Government' : citById.get(h.ownerId)?.name ?? 'Citizen';
              return (
                <button key={h.id} type="button" onClick={() => onSelectHouse(h.id)} className="w-full py-2 flex items-center justify-between text-left hover:bg-slate-800/30 px-2 -mx-2 rounded cursor-pointer">
                  <div>
                    <div className="font-medium text-slate-100">{h.name}</div>
                    <div className="text-slate-400">{DISTRICTS[h.district].label} · {owner} · {h.capacity - h.occupantIds.length} slot(s)</div>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-emerald-300">{formatDelta(h.rentPrice)}/mo</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-100">Recent Housing Transactions</h3>
        {txs.length === 0 ? (
          <div className="text-xs text-slate-500 py-4">No housing moves, purchases, or evictions recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/80 text-xs">
            {txs.map((tx) => (
              <div key={tx.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono tabular-nums text-slate-500">{tx.dateLabel}</span>
                  <span className="text-slate-600">·</span>
                  <span className={`capitalize font-medium ${tx.kind === 'evicted' || tx.kind === 'condemned' ? 'text-rose-300' : tx.kind === 'bought' ? 'text-amber-300' : 'text-teal-300'}`}>{tx.kind}</span>
                  <span className="text-slate-600">·</span>
                  {tx.citizenId ? (
                    <button type="button" onClick={() => onSelectCitizen(tx.citizenId)} className="text-slate-100 hover:text-amber-300 cursor-pointer">{tx.citizenName}</button>
                  ) : <span className="text-slate-300">{tx.citizenName}</span>}
                  <span className="text-slate-500">→</span>
                  <button type="button" onClick={() => onSelectHouse(tx.houseId)} className="text-slate-200 hover:text-amber-300 cursor-pointer">{tx.houseName}</button>
                </div>
                <div className="font-mono tabular-nums text-slate-400">
                  {tx.amount ? `${formatDelta(tx.amount)} · ` : ''}{tx.note}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
