// HousingPreferencesPanel.tsx — All 50 citizens' housing preferences, satisfaction scores, and search filters

import { useState } from 'react';
import { DISTRICTS, HOUSE_SPECS } from './housingCatalog';
import { seedHousingPreferences } from './housingPreferences';
import type { Citizen, CityState } from './types';

interface HousingPreferencesPanelProps {
  city: CityState;
  onSelectCitizenHousing: (citizenId: string) => void;
}

type PrefFilter = 'all' | 'dissatisfied' | 'content' | 'searching' | 'homeless';

const TOL_LABELS = { welcomes: 'Welcomes roommates', neutral: 'Neutral', prefers_alone: 'Prefers alone' };

export function HousingPreferencesPanel({ city, onSelectCitizenHousing }: HousingPreferencesPanelProps) {
  const [filter, setFilter] = useState<PrefFilter>('all');
  const byHouse = new Map(city.housing.houses.map((h) => [h.id, h]));

  const rows = city.citizens.filter((c) => {
    if (!c.alive) return false;
    const sat = c.housingSatisfaction?.total ?? 50;
    if (filter === 'dissatisfied') return sat < 40;
    if (filter === 'content') return sat > 75;
    if (filter === 'searching') return Boolean(c.seekingHousing);
    if (filter === 'homeless') return c.homeId === null;
    return true;
  });

  const filters: { id: PrefFilter; label: string }[] = [
    { id: 'all', label: 'All Living' },
    { id: 'dissatisfied', label: 'Dissatisfied (<40)' },
    { id: 'content', label: 'Content (>75)' },
    { id: 'searching', label: 'In Search' },
    { id: 'homeless', label: 'Homeless' },
  ];

  const satTone = (s: number) => (s > 75 ? 'text-emerald-300' : s < 40 ? 'text-rose-400' : 'text-amber-300');
  const statusText = (c: Citizen) => (c.homeId === null ? 'Homeless' : c.seekingHousing ? 'Searching' : (c.housingSatisfaction?.total ?? 50) > 75 ? 'Content' : 'Settled');

  return (
    <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">Citizen Housing Preferences & Satisfaction</h2>
          <p className="text-xs text-slate-400">Click any citizen row to open their Housing satisfaction breakdown and move triggers</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#090d16] border border-slate-800 rounded-md">
          {filters.map((f) => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={`px-2.5 py-1 text-xs rounded cursor-pointer ${filter === f.id ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="border-b border-slate-800 text-slate-400">
            <tr>
              <th className="py-2 pr-3 font-medium">Citizen</th>
              <th className="py-2 pr-3 font-medium">Current Home</th>
              <th className="py-2 pr-3 font-medium">Pref Type</th>
              <th className="py-2 pr-3 font-medium">Pref District</th>
              <th className="py-2 pr-3 font-medium text-right">Max Rent</th>
              <th className="py-2 pr-3 font-medium">Roommates</th>
              <th className="py-2 pr-3 font-medium text-right">Sat</th>
              <th className="py-2 font-medium text-right">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {rows.map((c) => {
              const prefs = c.housingPrefs ?? seedHousingPreferences(c);
              const house = c.homeId ? byHouse.get(c.homeId) : null;
              const sat = c.housingSatisfaction?.total ?? 0;
              return (
                <tr key={c.id} onClick={() => onSelectCitizenHousing(c.id)} className="hover:bg-slate-800/40 cursor-pointer">
                  <td className="py-2 pr-3 font-medium text-slate-100">{c.name} <span className="font-mono text-slate-500">({c.tier})</span></td>
                  <td className="py-2 pr-3 text-slate-300">{house ? `${house.name} · ${DISTRICTS[house.district].label}` : 'Homeless'}</td>
                  <td className="py-2 pr-3 text-slate-300">{HOUSE_SPECS[prefs.preferredType].label}</td>
                  <td className="py-2 pr-3 text-slate-300">{DISTRICTS[prefs.preferredDistrict].label}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300">{Math.round(prefs.maxRentRatio * 100)}%</td>
                  <td className="py-2 pr-3 text-slate-400">{TOL_LABELS[prefs.roommateTolerance]}</td>
                  <td className={`py-2 pr-3 text-right font-mono tabular-nums font-semibold ${satTone(sat)}`}>{sat}</td>
                  <td className="py-2 text-right font-mono text-slate-300">{statusText(c)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-slate-500">No citizens match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
