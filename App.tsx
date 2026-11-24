// App.tsx — Root Vij simulator controller with async IndexedDB load, 10s/day clock, and Board UI

import { useEffect, useMemo, useState } from 'react';
import { CitizenProfileModal } from './CitizenProfileModal';
import { CitizensView } from './CitizensView';
import { CompaniesView } from './CompaniesView';
import { ConfirmModal } from './ConfirmModal';
import { EventLogView } from './EventLogView';
import { HousingView } from './HousingView';
import { JobMarketView } from './JobMarketView';
import { MartView } from './MartView';
import { OverviewView } from './OverviewView';
import { SaveNoticeBanner } from './SaveNoticeBanner';
import { SharityView } from './SharityView';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { NavTab, SimSpeed } from './types';
import { useCityPersistence } from './useCityPersistence';

const SPEED_INTERVAL_MS: Record<Exclude<SimSpeed, 0>, number> = { 1: 10000, 2: 5000, 5: 2000, 10: 1000, 20: 500 };

export default function App() {
  const { loading, city, meetings, warning, dismissWarning, exportNotice, dismissExportNotice, stepOneDay, updateCity, markMeetingRead, resetCity, exportCity, importJson } = useCityPersistence();

  const [speed, setSpeed] = useState<SimSpeed>(1);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(null);
  const [selectedCitizenTab, setSelectedCitizenTab] = useState<'overview' | 'housing'>('overview');
  const [selectedSharityProfileId, setSelectedSharityProfileId] = useState<string | null>(null);
  const [highlightedSharityPostId, setHighlightedSharityPostId] = useState<string | null>(null);
  const [showNewCityConfirm, setShowNewCityConfirm] = useState(false);
  const [seedInput, setSeedInput] = useState('');

  useEffect(() => {
    if (loading || speed === 0) return;
    const timer = window.setInterval(() => stepOneDay(speed), SPEED_INTERVAL_MS[speed]);
    return () => window.clearInterval(timer);
  }, [loading, speed, stepOneDay]);

  const livingPopulation = useMemo(() => (city ? city.citizens.filter((c) => c.alive).length : 0), [city]);
  const homelessCount = useMemo(() => (city ? city.citizens.filter((c) => c.alive && !c.homeId).length : 0), [city]);
  const martLowStockCount = useMemo(() => (city ? city.mart.stock.filter((s) => s.quantity / Math.max(0.2, s.dailyForecast) < 4).length : 0), [city]);
  const selectedCitizen = useMemo(() => (city ? city.citizens.find((c) => c.id === selectedCitizenId) ?? null : null), [city, selectedCitizenId]);
  const boardUnreadCount = useMemo(() => meetings.filter((m) => !m.read).length, [meetings]);

  if (loading || !city) {
    return (
      <div className="h-screen w-screen bg-[#090d16] text-slate-100 flex items-center justify-center">
        <div className="bg-[#111827] border border-slate-800 rounded-lg px-6 py-5 text-center space-y-2">
          <div className="font-display text-base font-semibold text-slate-100">Loading Vij</div>
          <div className="text-xs text-slate-400">Restoring city state and board archives from IndexedDB...</div>
        </div>
      </div>
    );
  }

  async function handleConfirmNewCity() {
    const parsedSeed = seedInput.trim() ? Number.parseInt(seedInput.trim(), 10) : undefined;
    await resetCity(Number.isFinite(parsedSeed) ? parsedSeed : undefined);
    setSelectedCitizenId(null); setSelectedSharityProfileId(null); setShowNewCityConfirm(false); setSeedInput(''); setSpeed(1);
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#090d16] text-slate-100">
      <TopBar
        cityName={city.cityName}
        seed={city.seed}
        day={city.day}
        month={city.month}
        year={city.year}
        speed={speed}
        onSpeedChange={setSpeed}
        treasury={city.treasury}
        population={livingPopulation}
      />

      {warning && (
        <div className="bg-rose-950/80 border-b border-rose-500/40 px-6 py-2 flex items-center justify-between text-xs text-rose-200">
          <span>{warning}</span>
          <button type="button" onClick={dismissWarning} className="text-rose-300 hover:text-white underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {exportNotice && <SaveNoticeBanner notice={exportNotice} onDismiss={dismissExportNotice} />}

      <div className="flex-1 flex min-h-0 min-w-0">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(t) => { if (t !== 'sharity') setSelectedSharityProfileId(null); setActiveTab(t); }}
          citizenCount={livingPopulation}
          vacancyCount={city.vacancies.length}
          eventCount={city.events.length}
          martLowStockCount={martLowStockCount}
          homelessCount={homelessCount}
          boardUnreadCount={boardUnreadCount}
          sharityPostCount={city.sharity.posts.length}
          sharityUnreadCount={city.sharity.unreadPostCount}
          onExportCity={exportCity}
          onImportJson={importJson}
          onRequestNewCity={() => setShowNewCityConfirm(true)}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-28 sm:p-6">
          <div className="mx-auto w-full max-w-[1200px] min-w-0">
            {activeTab === 'overview' && <OverviewView city={city} onOpenEvents={() => setActiveTab('events')} onOpenCompanies={() => setActiveTab('companies')} onSelectCitizen={setSelectedCitizenId} />}
            {activeTab === 'citizens' && <CitizensView city={city} onUpdateCity={(u) => updateCity(typeof u === 'function' ? u : () => u)} onSelectCitizen={setSelectedCitizenId} />}
            {activeTab === 'housing' && <HousingView city={city} onUpdateCity={(u) => updateCity(typeof u === 'function' ? u : () => u)} onSelectCitizen={(id, t = 'overview') => { setSelectedCitizenTab(t); setSelectedCitizenId(id); }} />}
            {activeTab === 'companies' && <CompaniesView city={city} meetings={meetings} onMarkMeetingRead={markMeetingRead} onSelectCitizen={setSelectedCitizenId} onUpdateCity={(u) => updateCity(typeof u === 'function' ? u : () => u)} />}
            {activeTab === 'jobs' && <JobMarketView city={city} onSelectCitizen={setSelectedCitizenId} />}
            {activeTab === 'mart' && <MartView city={city} onUpdateCity={(u) => updateCity(typeof u === 'function' ? u : () => u)} onSelectCitizen={setSelectedCitizenId} />}
            {activeTab === 'sharity' && (
              <SharityView
                city={city} speed={speed} selectedProfileId={selectedSharityProfileId} highlightedPostId={highlightedSharityPostId}
                onClearHighlightPost={() => setHighlightedSharityPostId(null)} onSelectProfileId={setSelectedSharityProfileId} onSelectCitizen={setSelectedCitizenId}
                onMarkPostsRead={() => updateCity((c) => ({ ...c, sharity: { ...c.sharity, unreadPostCount: 0 } }))}
              />
            )}
            {activeTab === 'events' && <EventLogView events={city.events} onSelectCitizen={setSelectedCitizenId} />}
          </div>
        </main>
      </div>

      {selectedCitizen && (
        <CitizenProfileModal
          key={`${selectedCitizen.id}_${selectedCitizenTab}`}
          citizen={selectedCitizen} city={city} initialTab={selectedCitizenTab}
          onUpdateCity={(u) => updateCity(typeof u === 'function' ? u : () => u)}
          onSelectCitizen={(id) => { setSelectedCitizenTab('overview'); setSelectedCitizenId(id); }}
          onOpenSharityProfile={(pid) => { setSelectedCitizenId(null); setHighlightedSharityPostId(null); setSelectedSharityProfileId(pid); setActiveTab('sharity'); }}
          onOpenSharityPost={(postId) => { setSelectedCitizenId(null); setSelectedSharityProfileId(null); setHighlightedSharityPostId(postId); setActiveTab('sharity'); }}
          onClose={() => { setSelectedCitizenId(null); setSelectedCitizenTab('overview'); }}
        />
      )}

      {showNewCityConfirm && (
        <ConfirmModal
          title="Start a New City?"
          message="This replaces the current simulation of Vij, clears stored board meetings, resets treasury to ∆20,000, seeds 5 companies at ∆40,000 each, and creates 50 fresh citizens."
          confirmLabel="Create New City"
          seedValue={seedInput}
          onSeedChange={setSeedInput}
          onConfirm={handleConfirmNewCity}
          onCancel={() => { setShowNewCityConfirm(false); setSeedInput(''); }}
        />
      )}
    </div>
  );
}
