// CitizenElectronicsList.tsx — Displays owned citizen electronics, tier, lifespan variance, and working/broken status

import { TIER_LABELS } from './electronicsCatalog';
import type { OwnedAppliance } from './electronicsTypes';
import { formatPrice } from './formatters';

export function CitizenElectronicsList({
  electronics = [],
  powerCutToday = false,
}: {
  electronics?: OwnedAppliance[];
  powerCutToday?: boolean;
}) {
  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-200">Electronics ({electronics.length})</span>
        {powerCutToday && <span className="font-mono text-rose-400">Grid Power Off</span>}
      </div>
      {electronics.length === 0 ? (
        <div className="text-slate-500 py-4 text-center">No appliances owned yet.</div>
      ) : (
        <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
          {electronics.map((a) => (
            <div key={a.id} className="py-1.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-slate-200 font-medium">{a.name}</span>
                <span className="text-slate-500 ml-1.5">{TIER_LABELS[a.tier]} · {formatPrice(a.purchasePrice)}</span>
              </div>
              <div className="font-mono text-[11px] tabular-nums shrink-0">
                {a.broken ? (
                  <span className="text-rose-400 font-semibold">Broken</span>
                ) : powerCutToday ? (
                  <span className="text-amber-300">Unpowered · {a.daysLeft}d left</span>
                ) : (
                  <span className="text-emerald-300">{a.daysLeft}/{a.totalLifespanDays}d ({a.variancePct > 0 ? `+${a.variancePct}%` : `${a.variancePct}%`})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
