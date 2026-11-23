// HousingView.tsx — Top-level Housing tab orchestrating Overview KPIs, Houses directory, Market & Loans, and House Detail

import { useState } from 'react';
import { HousingDetailView } from './HousingDetailView';
import { HousingListPanel } from './HousingListPanel';
import { HousingMarketDynamicsPanel } from './HousingMarketDynamicsPanel';
import { HousingMarketPanel } from './HousingMarketPanel';
import { HousingOverviewPanel } from './HousingOverviewPanel';
import { HousingPreferencesPanel } from './HousingPreferencesPanel';
import type { CityState } from './types';

interface HousingViewProps {
  city: CityState;
  onUpdateCity: (next: CityState) => void;
  onSelectCitizen: (citizenId: string, initialTab?: 'overview' | 'housing') => void;
}

type HousingSubTab = 'houses' | 'preferences' | 'dynamics' | 'market';

export function HousingView({ city, onUpdateCity, onSelectCitizen }: HousingViewProps) {
  const [subTab, setSubTab] = useState<HousingSubTab>('houses');
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);

  const selectedHouse = selectedHouseId ? city.housing.houses.find((h) => h.id === selectedHouseId) ?? null : null;

  if (selectedHouse) {
    return (
      <HousingDetailView
        city={city}
        house={selectedHouse}
        onBack={() => setSelectedHouseId(null)}
        onUpdateCity={onUpdateCity}
        onSelectCitizen={(id) => onSelectCitizen(id)}
      />
    );
  }

  const tabs: { id: HousingSubTab; label: string }[] = [
    { id: 'houses', label: 'Houses (60)' },
    { id: 'preferences', label: 'Preferences (50)' },
    { id: 'dynamics', label: 'Market Dynamics' },
    { id: 'market', label: 'Market & Loans' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-semibold text-slate-50">Vij Housing & Districts</h1>
          <p className="text-xs text-slate-400">60 residences across 5 districts · Preferences, satisfaction, rent drift, and ownership</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#111827] border border-slate-800 rounded-md">
          {tabs.map((t) => (
            <button
              key={t.id} type="button" onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 text-xs rounded whitespace-nowrap shrink-0 cursor-pointer ${subTab === t.id ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <HousingOverviewPanel city={city} onSelectCitizen={(id) => onSelectCitizen(id)} />

      {subTab === 'houses' && <HousingListPanel city={city} onSelectHouse={setSelectedHouseId} />}
      {subTab === 'preferences' && <HousingPreferencesPanel city={city} onSelectCitizenHousing={(id) => onSelectCitizen(id, 'housing')} />}
      {subTab === 'dynamics' && <HousingMarketDynamicsPanel city={city} />}
      {subTab === 'market' && <HousingMarketPanel city={city} onSelectHouse={setSelectedHouseId} onSelectCitizen={(id) => onSelectCitizen(id)} />}
    </div>
  );
}
