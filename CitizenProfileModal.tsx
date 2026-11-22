// CitizenProfileModal.tsx — Citizen profile with career details, Inventory, Why?, Memory, and Life Log tabs

import { X } from 'lucide-react';
import { useState } from 'react';
import { CitizenFinancials } from './CitizenFinancials';
import { CitizenInventoryPanel } from './CitizenInventoryPanel';
import { CitizenLifeLogTab } from './CitizenLifeLogTab';
import { CitizenMemoryTab } from './CitizenMemoryTab';
import { CitizenSharityCard } from './CitizenSharityCard';
import { CitizenWhyTab } from './CitizenWhyTab';
import { CitizenWorkSection } from './CitizenWorkSection';
import { DEATH_CAUSE_LABELS, EDUCATION_LABELS, formatDelta, TIER_STYLES } from './formatters';
import { SparkChart } from './SparkChart';
import type { Citizen, CityState } from './types';

interface CitizenProfileModalProps {
  citizen: Citizen;
  city: CityState;
  onUpdateCity: (next: CityState) => void;
  onOpenSharityProfile: (profileId: string) => void;
  onClose: () => void;
}

type ProfileTab = 'overview' | 'inventory' | 'why' | 'memory' | 'lifelog';

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'why', label: 'Why?' },
  { id: 'memory', label: 'Memory' },
  { id: 'lifelog', label: 'Life Log' },
];

export function CitizenProfileModal({ citizen, city, onUpdateCity, onOpenSharityProfile, onClose }: CitizenProfileModalProps) {
  const [tab, setTab] = useState<ProfileTab>('overview');
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
    setTab('why');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={`${citizen.name} profile`} onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#111827] border border-slate-700/80 rounded-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl font-semibold text-slate-50">{citizen.name}</h2>
              <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border ${tierStyle.badge}`}>{citizen.tier}</span>
              {!citizen.alive && (
                <span className="font-mono text-xs text-rose-300">Deceased · {citizen.deathCause ? DEATH_CAUSE_LABELS[citizen.deathCause] : ''} · {citizen.deathDate}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1.5">
              <span className="text-slate-200 font-medium">{roleLabel}</span>
              <span>·</span><span>Age {citizen.age}</span>
              <span>·</span><span>{citizen.gender}</span>
              <span>·</span><span>{EDUCATION_LABELS[citizen.education]}</span>
              <span>·</span><span className="font-mono">{citizen.experience} yrs exp</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close profile" className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Savings', value: formatDelta(citizen.savings) },
            { label: 'Mood', value: `${Math.round(citizen.mood)} / 100` },
            { label: 'Stress', value: `${Math.round(citizen.stress)} / 100` },
            { label: 'Status Score', value: citizen.statusScore.toFixed(1) },
            { label: 'Respect', value: `${citizen.respect.toFixed(1)} / 100` },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0c1220] border border-slate-800/80 rounded-md px-3 py-2.5">
              <div className="text-[11px] text-slate-400">{stat.label}</div>
              <div className="font-mono text-base font-semibold text-slate-100 mt-0.5">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#090d16] border border-slate-800 rounded-md w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs rounded transition-colors cursor-pointer ${tab === t.id ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}
            >
              {t.label}{t.id === 'memory' && citizen.memories.length > 0 ? ` (${citizen.memories.length})` : ''}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-4">
            {citizen.changeExplanations[0] && (
              <div className="bg-[#0c1220] border border-slate-800/80 rounded-md px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-300">Latest shift: {citizen.changeExplanations[0].summary}</span>
                {citizen.changeExplanations[0].decisionId && (
                  <button type="button" onClick={() => jumpToDecision(citizen.changeExplanations[0].decisionId!)} className="text-amber-300 hover:text-amber-200 font-medium cursor-pointer shrink-0 ml-3">
                    Explain this change →
                  </button>
                )}
              </div>
            )}
            <CitizenSharityCard citizen={citizen} city={city} onOpenSharityProfile={onOpenSharityProfile} />
            <CitizenWorkSection citizen={citizen} city={city} />
            <CitizenInventoryPanel citizen={citizen} />
            <CitizenFinancials citizen={citizen} />
            <div className="grid grid-cols-3 gap-4">
              <SparkChart title="Savings Over Time" points={savingsPoints} strokeColor="#fbbf24" formatValue={(v) => formatDelta(v)} />
              <SparkChart title="Mood Over Time" points={moodPoints} strokeColor="#34d399" formatValue={(v) => `${Math.round(v)}`} fixedDomain={[0, 100]} />
              <SparkChart title="Status Score Over Time" points={statusPoints} strokeColor="#38bdf8" formatValue={(v) => v.toFixed(1)} fixedDomain={[0, 100]} />
            </div>
          </div>
        )}

        {tab === 'inventory' && <CitizenInventoryPanel citizen={citizen} city={city} onUpdateCity={onUpdateCity} showFullDetails />}
        {tab === 'why' && <CitizenWhyTab citizen={citizen} highlightedDecisionId={highlightedDecisionId} onHighlightDecision={setHighlightedDecisionId} />}
        {tab === 'memory' && <CitizenMemoryTab citizen={citizen} currentTotalDay={city.totalDays} onJumpToDecision={jumpToDecision} />}
        {tab === 'lifelog' && <CitizenLifeLogTab citizen={citizen} />}
      </div>
    </div>
  );
}
