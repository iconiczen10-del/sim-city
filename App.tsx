// App.tsx — Root Vij simulator controller with Web Worker clock, mobile/PC adaptive layouts, and Board UI

import { useEffect, useMemo, useState } from 'react';
import { CitizenProfileModal } from './CitizenProfileModal';
import { CitizensView } from './CitizensView';
import { CompaniesView } from './CompaniesView';
import { ConfirmModal } from './ConfirmModal';
import { EventLogView } from './EventLogView';
import { HousingView } from './HousingView';
import { JobMarketView } from './JobMarketView';
import { MartView } from './MartView';
import { MobileSettingsView, type MobileSettingsSubPage } from './MobileSettingsView';
import { OverviewView } from './OverviewView';
import { SaveNoticeBanner } from './SaveNoticeBanner';
import { SharityView } from './SharityView';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { NavTab, SimSpeed } from './types';
import { useCityPersistence } from './useCityPersistence';
import { useIsPhone } from './useIsPhone';

const SPEED_MS: Record<Exclude<SimSpeed, 0>, number> = { 1: 10000, 2: 5000, 5: 2000, 10: 1000, 20: 500, 25: 400, 30: 333, 40: 250, 50: 200 };

export default function App() {
  const { loading, city, meetings, warning, dismissWarning, exportNotice, dismissExportNotice, storageQuota, runningBehind, recordsCount, hasWorker, setWorkerSpeed, stepOneDayFallback, updateCity, markMeetingRead, resetCity, exportCity, importJson } = useCityPersistence();
  const isPhone = useIsPhone();
  const [speed, setSpeed] = useState<SimSpeed>(1);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [settingsSubPage, setSettingsSubPage] = useState<MobileSettingsSubPage>('menu');
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(null);
  const [selectedCitizenTab, setSelectedCitizenTab] = useState<'overview' | 'housing'>('overview');
  const [selectedSharityProfileId, setSelectedSharityProfileId] = useState<string | null>(null);
  const [highlightedSharityPostId, setHighlightedSharityPostId] = useState<string | null>(null);
  const [showNewCityConfirm, setShowNewCityConfirm] = useState(false);
  const [seedInput, setSeedInput] = useState('');

  const handleSpeedChange = (next: SimSpeed) => { setSpeed(next); setWorkerSpeed(next); };
  const handleSelectTab = (tab: NavTab) => {
    if (tab !== 'sharity') setSelectedSharityProfileId(null);
    if (tab === 'settings') setSettingsSubPage('menu');
    setActiveTab(tab);
  };

  useEffect(() => {
    if (isPhone && speed > 25) handleSpeedChange(25);
    if (isPhone && activeTab === 'sharity') {
      setSettingsSubPage('sharity');
      setActiveTab('settings');
    } else if (!isPhone && activeTab === 'settings') {
      setActiveTab(settingsSubPage === 'sharity' ? 'sharity' : settingsSubPage === 'events' ? 'events' : 'overview');
    }
  }, [isPhone, speed, activeTab, settingsSubPage]);

  useEffect(() => {
    if (loading || hasWorker || speed === 0) return;
    const timer = window.setInterval(() => stepOneDayFallback(speed), SPEED_MS[speed]);
    return () => window.clearInterval(timer);
  }, [loading, hasWorker, speed, stepOneDayFallback]);

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

  const effectiveTab: NavTab = isPhone && !['overview', 'citizens', 'companies', 'settings'].includes(activeTab) ? 'overview' : !isPhone && activeTab === 'settings' ? 'overview' : activeTab;

  async function handleConfirmNewCity() {
    const parsedSeed = seedInput.trim() ? Number.parseInt(seedInput.trim(), 10) : undefined;
    await resetCity(Number.isFinite(parsedSeed) ? parsedSeed : undefined);
    setSelectedCitizenId(null); setSelectedSharityProfileId(null); setShowNewCityConfirm(false); setSeedInput(''); handleSpeedChange(1);
  }

  const markSharityRead = () => updateCity((c) => ({ ...c, sharity: { ...c.sharity, unreadPostCount: 0 } }));
  const openSharityFromCitizen = (pid: string | null, postId: string | null) => {
    setSelectedCitizenId(null); setSelectedSharityProfileId(pid); setHighlightedSharityPostId(postId);
    if (isPhone) { setSettingsSubPage('sharity'); setActiveTab('settings'); } else setActiveTab('sharity');
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#090d16] text-slate-100">
      <TopBar cityName={city.cityName} seed={city.seed} day={city.day} month={city.month} year={city.year} speed={speed} onSpeedChange={handleSpeedChange} treasury={city.treasury} population={livingPopulation} runningBehind={runningBehind} storageQuota={storageQuota} onOpenSettings={() => handleSelectTab('settings')} />
      {warning && (
        <div className="bg-rose-950/80 border-b border-rose-500/40 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-rose-200">
          <span>{warning}</span>
          <button type="button" onClick={dismissWarning} className="text-rose-300 hover:text-white underline cursor-pointer">Dismiss</button>
        </div>
      )}
      {exportNotice && <SaveNoticeBanner notice={exportNotice} onDismiss={dismissExportNotice} />}
      <div className="flex-1 flex min-h-0 min-w-0">
        <Sidebar activeTab={effectiveTab} onSelectTab={handleSelectTab} citizenCount={livingPopulation} vacancyCount={city.vacancies.length} eventCount={recordsCount} martLowStockCount={martLowStockCount} homelessCount={homelessCount} boardUnreadCount={boardUnreadCount} sharityPostCount={city.sharity.posts.length} sharityUnreadCount={city.sharity.unreadPostCount} onExportCity={exportCity} onImportJson={importJson} onRequestNewCity={() => setShowNewCityConfirm(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 pb-24 sm:p-6">
          <div className="mx-auto w-full max-w-[1200px] min-w-0">
            {effectiveTab === 'overview' && <OverviewView city={city} isPhone={isPhone} onOpenEvents={() => { if (isPhone) { setSettingsSubPage('events'); setActiveTab('settings'); } else setActiveTab('events'); }} onOpenCompanies={() => setActiveTab('companies')} onSelectCitizen={setSelectedCitizenId} />}
            {effectiveTab === 'citizens' && <CitizensView city={city} isPhone={isPhone} onUpdateCity={(u) => updateCity(typeof u === 'function' ? u : () => u)} onSelectCitizen={setSelectedCitizenId} />}
            {effectiveTab === 'housing' && <HousingView city={city} onUpdateCity={(u) => updateCity(typeof u === 'function' ? u : () => u)} onSelectCitizen={(id, t = 'overview') => { setSelectedCitizenTab(t); setSelectedCitizenId(id); }} />}
            {effectiveTab === 'companies' && <CompaniesView city={city} isPhone={isPhone} meetings={meetings} onMarkMeetingRead={markMeetingRead} onSelectCitizen={setSelectedCitizenId} onUpdateCity={(u) => updateCity(typeof u === 'function' ? u : () => u)} />}
            {effectiveTab === 'jobs' && <JobMarketView city={city} onSelectCitizen={setSelectedCitizenId} />}
            {effectiveTab === 'mart' && <MartView city={city} onUpdateCity={(u) => updateCity(typeof u === 'function' ? u : () => u)} onSelectCitizen={setSelectedCitizenId} />}
            {effectiveTab === 'sharity' && <SharityView city={city} speed={speed} selectedProfileId={selectedSharityProfileId} highlightedPostId={highlightedSharityPostId} onClearHighlightPost={() => setHighlightedSharityPostId(null)} onSelectProfileId={setSelectedSharityProfileId} onSelectCitizen={setSelectedCitizenId} onMarkPostsRead={markSharityRead} />}
            {effectiveTab === 'events' && <EventLogView city={city} onSelectCitizen={setSelectedCitizenId} />}
            {effectiveTab === 'settings' && <MobileSettingsView city={city} speed={speed} subPage={settingsSubPage} selectedSharityProfileId={selectedSharityProfileId} highlightedSharityPostId={highlightedSharityPostId} onChangeSubPage={setSettingsSubPage} onExportDownload={() => exportCity('download')} onImportJson={importJson} onRequestNewCity={() => setShowNewCityConfirm(true)} onSelectCitizen={setSelectedCitizenId} onSelectSharityProfileId={setSelectedSharityProfileId} onClearHighlightPost={() => setHighlightedSharityPostId(null)} onMarkSharityPostsRead={markSharityRead} />}
          </div>
        </main>
      </div>
      {selectedCitizen && (
        <CitizenProfileModal key={`${selectedCitizen.id}_${selectedCitizenTab}`} citizen={selectedCitizen} city={city} initialTab={selectedCitizenTab} onUpdateCity={(u) => updateCity(typeof u === 'function' ? u : () => u)} onSelectCitizen={(id) => { setSelectedCitizenTab('overview'); setSelectedCitizenId(id); }} onOpenSharityProfile={(pid) => openSharityFromCitizen(pid, null)} onOpenSharityPost={(postId) => openSharityFromCitizen(null, postId)} onClose={() => { setSelectedCitizenId(null); setSelectedCitizenTab('overview'); }} />
      )}
      {showNewCityConfirm && (
        <ConfirmModal title="Start a New City?" message="This replaces the current simulation of Vij, clears stored board meetings, resets treasury to ∆20,000, seeds 5 companies at ∆40,000 each, and creates 50 fresh citizens." confirmLabel="Create New City" seedValue={seedInput} onSeedChange={setSeedInput} onConfirm={handleConfirmNewCity} onCancel={() => { setShowNewCityConfirm(false); setSeedInput(''); }} />
      )}
    </div>
  );
}
