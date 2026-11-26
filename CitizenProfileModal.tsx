// CitizenProfileModal.tsx — Citizen profile with Traits, Needs, Health, Emotions, Decisions, Inventory, Why?, Memory, and Life Log

import { X } from 'lucide-react';
import { useState } from 'react';
import { CitizenDecisionsTab } from './CitizenDecisionsTab';
import { CitizenEmotionsTab } from './CitizenEmotionsTab';
import { CitizenFamilyTab } from './CitizenFamilyTab';
import { CitizenFinancials } from './CitizenFinancials';
import { CitizenHealthTab } from './CitizenHealthTab';
import { CitizenHousingTab } from './CitizenHousingTab';
import { CitizenInventoryPanel } from './CitizenInventoryPanel';
import { CitizenMemoryTab } from './CitizenMemoryTab';
import { CitizenNeedsTab } from './CitizenNeedsTab';
import { CitizenRecordsTab } from './CitizenRecordsTab';
import { CitizenOverviewHousing } from './CitizenOverviewHousing';
import { CitizenOverviewStats } from './CitizenOverviewStats';
import { CitizenSharityCard } from './CitizenSharityCard';
import { CitizenTraitsTab } from './CitizenTraitsTab';
import { CitizenWhyTab } from './CitizenWhyTab';
import { CitizenWorkSection } from './CitizenWorkSection';
import { DEATH_CAUSE_LABELS, EDUCATION_LABELS, formatDelta, TIER_STYLES } from './formatters';
import { SparkChart } from './SparkChart';
import type { Citizen, CityState } from './types';

interface CitizenProfileModalProps {
  citizen: Citizen;
  city: CityState;
  onUpdateCity: (next: CityState) => void;
  onSelectCitizen?: (id: string) => void;
  onOpenSharityProfile: (profileId: string) => void;
  onOpenSharityPost?: (postId: string) => void;
  initialTab?: ProfileTab;
  onClose: () => void;
}

type ProfileTab = 'overview' | 'family' | 'housing' | 'traits' | 'needs' | 'health' | 'emotions' | 'decisions' | 'inventory' | 'why' | 'memory' | 'records';

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'family', label: 'Family' }, { id: 'housing', label: 'Housing' },
  { id: 'traits', label: 'Traits' }, { id: 'needs', label: 'Needs' }, { id: 'health', label: 'Health' },
  { id: 'emotions', label: 'Emotions' }, { id: 'decisions', label: 'Decisions' }, { id: 'inventory', label: 'Inventory' },
  { id: 'why', label: 'Why?' }, { id: 'memory', label: 'Memory' }, { id: 'records', label: 'Records' },
];

export function CitizenProfileModal({ citizen, city, onUpdateCity, onSelectCitizen, onOpenSharityProfile, onOpenSharityPost, initialTab, onClose }: CitizenProfileModalProps) {
  const [tab, setTab] = useState<ProfileTab>(initialTab ?? 'overview');
  const [highlightedDecisionId, setHighlightedDecisionId] = useState<string | null>(null);

  const tierStyle = TIER_STYLES[citizen.tier];
  const employer = citizen.employerId ? city.companies.find((c) => c.id === citizen.employerId) : null;
  const roleLabel = citizen.alive
    ? `${citizen.roleLevel}${employer ? ` @ ${employer.name}` : ''}`
    : `Former ${citizen.previousRole ?? citizen.roleLevel}`;
  const savingsPoints = citizen.history.map((h) => ({ label: h.label, value: h.savings }));
  const moodPoints = citizen.history.map((h) => ({ label: h.label, value: Math.round(h.mood) }));
  const statusPoints = citizen.history.map((h) => ({ label: h.label, value: h.statusScore }));

  function jumpToDecision(decId: string) {
    setHighlightedDecisionId(decId);
    setTab('decisions');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4 md:p-6" role="dialog" aria-modal="true" aria-label={`${citizen.name} profile`} onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto overflow-x-hidden bg-[#111827] border border-slate-700/80 rounded-lg p-4 sm:p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="font-display text-lg sm:text-xl font-semibold text-slate-50 truncate">{citizen.name}</h2>
              <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border ${tierStyle.badge}`}>{citizen.tier}</span>
              {!citizen.alive && (
                <span className="font-mono text-xs text-rose-300">Deceased · {citizen.deathCause ? DEATH_CAUSE_LABELS[citizen.deathCause] : ''} · {citizen.deathDate}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1.5">
              <span className="text-slate-200 font-medium">{roleLabel}</span>
              <span>·</span><span>Age {citizen.age}</span>
              <span>·</span><span className="capitalize">{citizen.relationship?.stage ?? 'single'}</span>
              {citizen.pregnancy && <span className="text-pink-300 font-medium">· Expecting</span>}
              {citizen.lucky && <span className="text-emerald-300 font-medium">· Lucky</span>}
              <span>·</span><span>{citizen.gender}</span>
              <span>·</span><span>{EDUCATION_LABELS[citizen.education]}</span>
              <span>·</span><span className="font-mono">{citizen.experience} yrs exp</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close profile" className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer shrink-0">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <CitizenOverviewStats citizen={citizen} />

        <div className="overflow-x-auto max-w-full">
          <div className="flex items-center gap-1 p-1 bg-[#090d16] border border-slate-800 rounded-md w-max sm:w-fit sm:flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-2.5 py-1.5 text-xs rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${tab === t.id ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}
              >
                {t.label}
                {t.id === 'decisions' && citizen.decisions.length > 0 ? ` (${citizen.decisions.length})` : ''}
                {t.id === 'memory' && citizen.memories.length > 0 ? ` (${citizen.memories.length})` : ''}
              </button>
            ))}
          </div>
        </div>

        {tab === 'overview' && (
          <div className="space-y-4">
            {citizen.changeExplanations[0] && (
              <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-300">Latest shift: {citizen.changeExplanations[0].summary}</span>
                {(citizen.changeExplanations[0].decisionId || (citizen.changeExplanations[0].postId && onOpenSharityPost)) && (
                  <button type="button" onClick={() => citizen.changeExplanations[0].decisionId ? jumpToDecision(citizen.changeExplanations[0].decisionId!) : onOpenSharityPost?.(citizen.changeExplanations[0].postId!)} className="text-amber-300 hover:text-amber-200 font-medium cursor-pointer shrink-0">
                    Explain this change →
                  </button>
                )}
              </div>
            )}
            <CitizenOverviewHousing citizen={citizen} city={city} onSelectCitizen={onSelectCitizen} />
            <CitizenSharityCard citizen={citizen} city={city} onOpenSharityProfile={onOpenSharityProfile} />
            <CitizenWorkSection citizen={citizen} city={city} />
            <CitizenInventoryPanel citizen={citizen} />
            <CitizenFinancials citizen={citizen} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SparkChart title="Savings Over Time" points={savingsPoints} strokeColor="#fbbf24" formatValue={(v) => formatDelta(v)} />
              <SparkChart title="Mood Over Time" points={moodPoints} strokeColor="#34d399" formatValue={(v) => `${Math.round(v)}`} fixedDomain={[0, 100]} />
              <SparkChart title="Status Score Over Time" points={statusPoints} strokeColor="#38bdf8" formatValue={(v) => v.toFixed(1)} fixedDomain={[0, 100]} />
            </div>
          </div>
        )}

        {tab === 'family' && <CitizenFamilyTab citizen={citizen} city={city} onSelectCitizen={onSelectCitizen} />}
        {tab === 'housing' && <CitizenHousingTab citizen={citizen} city={city} onSelectCitizen={onSelectCitizen} />}
        {tab === 'traits' && <CitizenTraitsTab citizen={citizen} />}
        {tab === 'needs' && <CitizenNeedsTab citizen={citizen} currentDay={city.totalDays} />}
        {tab === 'health' && <CitizenHealthTab citizen={citizen} currentDay={city.totalDays} />}
        {tab === 'emotions' && <CitizenEmotionsTab citizen={citizen} />}
        {tab === 'decisions' && <CitizenDecisionsTab citizen={citizen} highlightedDecisionId={highlightedDecisionId} onHighlightDecision={setHighlightedDecisionId} />}
        {tab === 'inventory' && <CitizenInventoryPanel citizen={citizen} city={city} onUpdateCity={onUpdateCity} showFullDetails />}
        {tab === 'why' && <CitizenWhyTab citizen={citizen} highlightedDecisionId={highlightedDecisionId} onHighlightDecision={(id) => (id ? jumpToDecision(id) : setHighlightedDecisionId(null))} onOpenSharityPost={onOpenSharityPost} />}
        {tab === 'memory' && <CitizenMemoryTab citizen={citizen} currentTotalDay={city.totalDays} onJumpToDecision={jumpToDecision} />}
        {tab === 'records' && <CitizenRecordsTab citizen={citizen} totalDays={city.totalDays} />}
      </div>
    </div>
  );
}
