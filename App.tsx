// App.tsx — Root Vij simulator controller with 10s/day 1x clock, Companies, and Job Market

import { useEffect, useMemo, useState } from 'react';
import { CitizenProfileModal } from './CitizenProfileModal';
import { CitizensView } from './CitizensView';
import { CompaniesView } from './CompaniesView';
import { ConfirmModal } from './ConfirmModal';
import { EventLogView } from './EventLogView';
import { JobMarketView } from './JobMarketView';
import { MartView } from './MartView';
import { OverviewView } from './OverviewView';
import { createInitialCityState } from './seeder';
import { Sidebar } from './Sidebar';
import { advanceSimulationDay } from './simulation';
import { clearSavedCity, loadSavedCity, saveCityState } from './storage';
import { TopBar } from './TopBar';
import type { CityState, NavTab, SimSpeed } from './types';

const SPEED_INTERVAL_MS: Record<Exclude<SimSpeed, 0>, number> = {
  1: 10000,
  5: 2000,
  20: 500,
};

export default function App() {
  const [city, setCity] = useState<CityState>(() => loadSavedCity() ?? createInitialCityState());
  const [speed, setSpeed] = useState<SimSpeed>(1);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(null);
  const [showNewCityConfirm, setShowNewCityConfirm] = useState(false);

  useEffect(() => {
    saveCityState(city);
  }, [city]);

  useEffect(() => {
    if (speed === 0) return;
    const ms = SPEED_INTERVAL_MS[speed];
    const timer = window.setInterval(() => {
      setCity((prev) => advanceSimulationDay(prev));
    }, ms);
    return () => window.clearInterval(timer);
  }, [speed]);

  const livingPopulation = useMemo(() => city.citizens.filter((c) => c.alive).length, [city.citizens]);
  const martLowStockCount = useMemo(
    () => city.mart.stock.filter((s) => s.quantity / Math.max(0.2, s.dailyForecast) < 4).length,
    [city.mart.stock]
  );
  const selectedCitizen = useMemo(
    () => city.citizens.find((c) => c.id === selectedCitizenId) ?? null,
    [city.citizens, selectedCitizenId]
  );

  function handleConfirmNewCity() {
    clearSavedCity();
    const fresh = createInitialCityState();
    setCity(fresh);
    saveCityState(fresh);
    setSelectedCitizenId(null);
    setShowNewCityConfirm(false);
    setSpeed(1);
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#090d16] text-slate-100">
      <TopBar
        cityName={city.cityName}
        day={city.day}
        month={city.month}
        year={city.year}
        speed={speed}
        onSpeedChange={setSpeed}
        treasury={city.treasury}
        population={livingPopulation}
      />

      <div className="flex-1 flex min-h-0">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          citizenCount={livingPopulation}
          vacancyCount={city.vacancies.length}
          eventCount={city.events.length}
          martLowStockCount={martLowStockCount}
          onRequestNewCity={() => setShowNewCityConfirm(true)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1200px] mx-auto">
            {activeTab === 'overview' && (
              <OverviewView
                city={city}
                onOpenEvents={() => setActiveTab('events')}
                onOpenCompanies={() => setActiveTab('companies')}
                onSelectCitizen={(id) => setSelectedCitizenId(id)}
              />
            )}
            {activeTab === 'citizens' && (
              <CitizensView city={city} onUpdateCity={setCity} onSelectCitizen={(id) => setSelectedCitizenId(id)} />
            )}
            {activeTab === 'companies' && (
              <CompaniesView city={city} onSelectCitizen={(id) => setSelectedCitizenId(id)} />
            )}
            {activeTab === 'jobs' && (
              <JobMarketView city={city} onSelectCitizen={(id) => setSelectedCitizenId(id)} />
            )}
            {activeTab === 'mart' && (
              <MartView city={city} onUpdateCity={setCity} onSelectCitizen={(id) => setSelectedCitizenId(id)} />
            )}
            {activeTab === 'events' && (
              <EventLogView events={city.events} onSelectCitizen={(id) => setSelectedCitizenId(id)} />
            )}
          </div>
        </main>
      </div>

      {selectedCitizen && (
        <CitizenProfileModal
          citizen={selectedCitizen}
          city={city}
          onUpdateCity={setCity}
          onClose={() => setSelectedCitizenId(null)}
        />
      )}

      {showNewCityConfirm && (
        <ConfirmModal
          title="Start a New City?"
          message="This will replace the current simulation of Vij, reset the municipal treasury to ∆20,000, seed 4 companies at ∆40,000 each, and generate 50 fresh citizens from Day 1."
          confirmLabel="Create New City"
          onConfirm={handleConfirmNewCity}
          onCancel={() => setShowNewCityConfirm(false)}
        />
      )}
    </div>
  );
}
