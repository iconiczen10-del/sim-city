// SharityView.tsx — Sharity social platform root view with Feed, People, Network, and Profile routing

import { useEffect, useState } from 'react';
import { SharityFeedView } from './SharityFeedView';
import { SharityNetworkView } from './SharityNetworkView';
import { SharityPeopleView } from './SharityPeopleView';
import { SharityProfileView } from './SharityProfileView';
import type { SharitySubTab } from './sharityTypes';
import type { CityState, SimSpeed } from './types';

interface SharityViewProps {
  city: CityState;
  speed: SimSpeed;
  selectedProfileId: string | null;
  highlightedPostId?: string | null;
  onClearHighlightPost?: () => void;
  onSelectProfileId: (id: string | null) => void;
  onSelectCitizen: (id: string) => void;
  onMarkPostsRead: () => void;
}

export function SharityView({
  city,
  speed,
  selectedProfileId,
  highlightedPostId,
  onClearHighlightPost,
  onSelectProfileId,
  onSelectCitizen,
  onMarkPostsRead,
}: SharityViewProps) {
  const [subTab, setSubTab] = useState<SharitySubTab>('feed');

  useEffect(() => {
    if (city.sharity.unreadPostCount > 0) onMarkPostsRead();
  }, [city.sharity.unreadPostCount, onMarkPostsRead]);

  useEffect(() => {
    if (highlightedPostId) setSubTab('feed');
  }, [highlightedPostId]);

  const activeProfile = selectedProfileId ? city.sharity.profiles[selectedProfileId] ?? null : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-slate-50">Sharity</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Vij civic network · 50 citizen accounts & 4 company pages · SimGod observer access
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0c111d] border border-slate-800 rounded-md overflow-x-auto max-w-full no-scrollbar">
          {([
            { id: 'feed', label: 'Feed' },
            { id: 'people', label: 'People' },
            { id: 'network', label: 'Network' },
          ] as const).map((t) => {
            const active = !activeProfile && subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { onSelectProfileId(null); onClearHighlightPost?.(); setSubTab(t.id); }}
                className={`px-3.5 py-1.5 text-xs rounded shrink-0 transition-colors whitespace-nowrap cursor-pointer ${
                  active ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeProfile ? (
        <SharityProfileView
          profile={activeProfile}
          city={city}
          onBack={() => onSelectProfileId(null)}
          onOpenProfile={(id) => onSelectProfileId(id)}
          onSelectCitizen={onSelectCitizen}
        />
      ) : subTab === 'feed' ? (
        <SharityFeedView city={city} speed={speed} highlightedPostId={highlightedPostId} onClearHighlightPost={onClearHighlightPost} onOpenProfile={(id) => onSelectProfileId(id)} />
      ) : subTab === 'people' ? (
        <SharityPeopleView city={city} onOpenProfile={(id) => onSelectProfileId(id)} />
      ) : (
        <SharityNetworkView city={city} onOpenProfile={(id) => onSelectProfileId(id)} />
      )}
    </div>
  );
}
