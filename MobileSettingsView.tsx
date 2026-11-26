// MobileSettingsView.tsx — Mobile Settings screen containing Export, Import, New City, City Events, Tier Movement, and Sharity

import { ArrowLeft, AtSign, ChevronRight, Download, RotateCcw, ScrollText, TrendingUp, Upload } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { FamilyRankingsPanel } from './FamilyRankingsPanel';
import { MobileTierMovementView } from './MobileTierMovementView';
import type { SubjectOption } from './RecordsFilterBar';
import { RecordsPanel } from './RecordsPanel';
import { getRecordsIndex } from './recordsStore';
import { SharityView } from './SharityView';
import type { CityState, SimSpeed } from './types';

export type MobileSettingsSubPage = 'menu' | 'events' | 'tier_movement' | 'sharity';

interface MobileSettingsViewProps {
  city: CityState;
  speed: SimSpeed;
  subPage: MobileSettingsSubPage;
  selectedSharityProfileId: string | null;
  highlightedSharityPostId: string | null;
  onChangeSubPage: (page: MobileSettingsSubPage) => void;
  onExportDownload: () => void;
  onImportJson: (file: File) => void;
  onRequestNewCity: () => void;
  onSelectCitizen: (citizenId: string) => void;
  onSelectSharityProfileId: (id: string | null) => void;
  onClearHighlightPost: () => void;
  onMarkSharityPostsRead: () => void;
}

export function MobileSettingsView({
  city, speed, subPage, selectedSharityProfileId, highlightedSharityPostId, onChangeSubPage,
  onExportDownload, onImportJson, onRequestNewCity, onSelectCitizen,
  onSelectSharityProfileId, onClearHighlightPost, onMarkSharityPostsRead,
}: MobileSettingsViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const subjects = useMemo<SubjectOption[]>(() => [
    { id: 'city', label: 'City of Vij' },
    ...city.companies.map((c) => ({ id: c.id, label: `Co: ${c.name}` })),
    ...city.citizens.map((c) => ({ id: c.id, label: `Citizen: ${c.name}` })),
    ...city.housing.houses.map((h) => ({ id: h.id, label: `House: ${h.name}` })),
  ], [city.companies, city.citizens, city.housing.houses]);

  if (subPage === 'events') {
    const idx = getRecordsIndex();
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => onChangeSubPage('menu')} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-800 bg-[#111827] px-3 text-xs font-medium text-slate-200 cursor-pointer">
            <ArrowLeft className="size-4" aria-hidden="true" /><span>Settings</span>
          </button>
          <span className="font-mono text-xs text-amber-300 tabular-nums">{idx.totalCount.toLocaleString('en-IN')} records</span>
        </div>
        <FamilyRankingsPanel city={city} onSelectCitizen={onSelectCitizen} />
        <RecordsPanel pageSize={3} title="City Events" showJumpToDay subjects={subjects} refreshKey={city.totalDays} maxDay={city.totalDays} onSelectCitizen={onSelectCitizen} />
      </div>
    );
  }

  if (subPage === 'tier_movement') {
    return <MobileTierMovementView city={city} onBack={() => onChangeSubPage('menu')} onSelectCitizen={onSelectCitizen} />;
  }

  if (subPage === 'sharity') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => { onSelectSharityProfileId(null); onClearHighlightPost(); onChangeSubPage('menu'); }} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-800 bg-[#111827] px-3 text-xs font-medium text-slate-200 cursor-pointer">
            <ArrowLeft className="size-4" aria-hidden="true" /><span>Settings</span>
          </button>
          <span className="font-mono text-xs text-sky-300 tabular-nums">{city.sharity.posts.length.toLocaleString('en-IN')} posts</span>
        </div>
        <SharityView city={city} speed={speed} selectedProfileId={selectedSharityProfileId} highlightedPostId={highlightedSharityPostId} onClearHighlightPost={onClearHighlightPost} onSelectProfileId={onSelectSharityProfileId} onSelectCitizen={onSelectCitizen} onMarkPostsRead={onMarkSharityPostsRead} />
      </div>
    );
  }

  const unreadSharity = city.sharity.unreadPostCount;
  const rows = [
    { id: 'export', title: 'Export', sub: 'Download records save JSON file', Icon: Download, cls: 'text-amber-300', badge: 0, onClick: onExportDownload },
    { id: 'import', title: 'Import', sub: 'Load a city and records JSON file', Icon: Upload, cls: 'text-sky-300', badge: 0, onClick: () => fileRef.current?.click() },
    { id: 'new_city', title: 'New City', sub: 'Start a fresh simulation (asks first)', Icon: RotateCcw, cls: 'text-rose-300', badge: 0, onClick: onRequestNewCity },
    { id: 'events', title: 'City Events', sub: 'Browse full master records log', Icon: ScrollText, cls: 'text-emerald-300', badge: 0, onClick: () => onChangeSubPage('events') },
    { id: 'tier', title: 'Tier Movement', sub: 'All tier promotions & demotions', Icon: TrendingUp, cls: 'text-amber-300', badge: 0, onClick: () => onChangeSubPage('tier_movement') },
    { id: 'sharity', title: 'Sharity', sub: `Civic social feed, people & network (${city.sharity.posts.length} posts)`, Icon: AtSign, cls: 'text-sky-300', badge: unreadSharity, onClick: () => onChangeSubPage('sharity') },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-base font-semibold text-slate-50">Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">Save data, city tools, events, tier movements, and Sharity.</p>
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportJson(f); e.target.value = ''; }} />

      <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-[#111827]">
        {rows.map(({ id, title, sub, Icon, cls, badge, onClick }) => (
          <button key={id} type="button" onClick={onClick} className="flex w-full min-h-[56px] items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 cursor-pointer">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className={`size-4 shrink-0 ${cls}`} aria-hidden="true" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-100">{title}</span>
                  {badge > 0 && <span className="rounded bg-amber-500 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-950">{badge} new</span>}
                </div>
                <div className="text-xs text-slate-400 truncate">{sub}</div>
              </div>
            </div>
            <ChevronRight className="size-4 text-slate-500 shrink-0" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
