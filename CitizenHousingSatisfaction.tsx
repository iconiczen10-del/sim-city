// CitizenHousingSatisfaction.tsx — 5-factor satisfaction breakdown, preferences, and "Would move if..." trigger panel

import { DISTRICTS, HOUSE_SPECS } from './housingCatalog';
import { buildWouldMoveSummary, computeHousingSatisfaction, seedHousingPreferences } from './housingPreferences';
import type { House } from './housingTypes';
import type { Citizen, CityState } from './types';

interface CitizenHousingSatisfactionProps {
  citizen: Citizen;
  city: CityState;
  house: House | null;
}

const TOL_LABEL = { welcomes: 'Welcomes roommates', neutral: 'Neutral', prefers_alone: 'Prefers to live alone' };

export function CitizenHousingSatisfaction({ citizen, city, house }: CitizenHousingSatisfactionProps) {
  const prefs = citizen.housingPrefs ?? seedHousingPreferences(citizen);
  const sat = citizen.housingSatisfaction ?? computeHousingSatisfaction(citizen, house, city.sharity);
  const satColor = sat.total > 75 ? 'text-emerald-300' : sat.total < 30 ? 'text-rose-400' : 'text-amber-300';

  const factors: { label: string; weight: string; val: number }[] = [
    { label: 'Affordability', weight: '40%', val: sat.affordability },
    { label: 'Type Match', weight: '20%', val: sat.typeMatch },
    { label: 'District Match', weight: '15%', val: sat.districtMatch },
    { label: 'Condition', weight: '10%', val: sat.condition },
    { label: 'Roommate Fit', weight: '15%', val: sat.roommates },
  ];

  return (
    <section className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-slate-100">Housing Satisfaction Breakdown</h3>
        <span className={`font-mono tabular-nums text-sm font-semibold ${satColor}`}>{sat.total} / 100</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {factors.map((f) => (
          <div key={f.label} className="bg-[#111827] border border-slate-800 rounded p-2 space-y-1">
            <div className="flex items-baseline justify-between text-[11px] text-slate-400">
              <span>{f.label}</span><span className="font-mono">{f.weight}</span>
            </div>
            <div className="font-mono tabular-nums text-sm font-semibold text-slate-100">{f.val}</div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${f.val > 75 ? 'bg-emerald-400' : f.val < 35 ? 'bg-rose-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, Math.max(0, f.val))}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-300">
        <div>
          <span className="text-slate-500">Preferences: </span>
          {HOUSE_SPECS[prefs.preferredType].label} · {DISTRICTS[prefs.preferredDistrict].label} · Max rent {Math.round(prefs.maxRentRatio * 100)}% · {TOL_LABEL[prefs.roommateTolerance]}
          {(citizen.friendRentDiscount ?? 1) < 1 && <span className="text-emerald-300"> · Friend rent {Math.round((citizen.friendRentDiscount ?? 1) * 100)}%</span>}
        </div>
        <div>
          <span className="text-slate-500">Would move if... </span>
          <span className="text-slate-200">{buildWouldMoveSummary(citizen, house)}</span>
        </div>
      </div>
    </section>
  );
}
