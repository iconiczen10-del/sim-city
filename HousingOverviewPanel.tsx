// HousingOverviewPanel.tsx — Housing KPI metrics and Homelessness Index banner with clickable resident links

import { formatDelta } from './formatters';
import type { CityState } from './types';

interface HousingOverviewPanelProps {
  city: CityState;
  onSelectCitizen: (id: string) => void;
}

export function HousingOverviewPanel({ city, onSelectCitizen }: HousingOverviewPanelProps) {
  const houses = city.housing.houses;
  const occupied = houses.filter((h) => !h.condemned && h.occupantIds.length > 0).length;
  const vacant = houses.filter((h) => !h.condemned && h.occupantIds.length === 0).length;
  const condemned = houses.filter((h) => h.condemned).length;
  const govOwned = houses.filter((h) => h.ownerId === 'gov').length;
  const citOwned = houses.length - govOwned;
  const forSale = houses.filter((h) => h.forSale && !h.condemned).length;
  const avgRent = houses.length ? Math.round(houses.reduce((s, h) => s + h.rentPrice, 0) / houses.length) : 0;
  const avgCond = houses.length ? Math.round(houses.reduce((s, h) => s + h.condition, 0) / houses.length) : 0;
  const alive = city.citizens.filter((c) => c.alive);
  const homeless = alive.filter((c) => !c.homeId);
  const homelessPct = alive.length ? ((homeless.length / alive.length) * 100).toFixed(1) : '0.0';

  const kpis = [
    { label: 'Housing Stock', value: String(houses.length), sub: `${occupied} occupied · ${vacant} vacant · ${condemned} condemned` },
    { label: 'Ownership Split', value: `${govOwned} / ${citOwned}`, sub: `Gov vs Citizen · ${forSale} for sale` },
    { label: 'Avg Rent / Treasury', value: formatDelta(avgRent), sub: `Collected ${formatDelta(city.housing.treasuryRentThisMonth)}/mo` },
    { label: 'Avg Condition', value: `${avgCond}/100`, sub: `${city.housing.evictionsThisMonth} evictions this mo` },
    { label: 'Homelessness Index', value: `${homeless.length} (${homelessPct}%)`, sub: homeless.length > 0 ? `City mood -${(homeless.length * 0.5).toFixed(1)}` : 'All citizens housed' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-[#111827] border border-slate-800/90 rounded-lg p-3.5">
            <div className="text-xs text-slate-400 mb-1.5">{k.label}</div>
            <div className={`font-mono tabular-nums text-xl font-semibold ${k.label === 'Homelessness Index' && homeless.length > 0 ? 'text-rose-300' : 'text-slate-50'}`}>
              {k.value}
            </div>
            <div className="font-mono tabular-nums text-[11px] text-slate-500 mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {homeless.length > 0 && (
        <div className="bg-[#111827] border border-rose-500/35 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span className="font-medium text-rose-300">Currently Homeless ({homeless.length}):</span>
          {homeless.map((c, idx) => (
            <span key={c.id} className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectCitizen(c.id)}
                className="text-slate-100 hover:text-amber-300 underline decoration-slate-600 cursor-pointer"
              >
                {c.name}
              </button>
              <span className="font-mono tabular-nums text-slate-500">({c.homelessDays ?? 0}d)</span>
              {idx < homeless.length - 1 && <span className="text-slate-600 ml-1">·</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
