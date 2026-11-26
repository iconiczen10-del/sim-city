// FamilyRankingsPanel.tsx — City-wide family rankings rendered inside City Events (PC & mobile)

import { useMemo, useState } from 'react';
import { computeCityFamilyRankings, type CityFamilyRankings } from './familyRankings';
import { formatDelta } from './formatters';
import type { CityState } from './types';

interface FamilyRankingsPanelProps {
  city: CityState;
  onSelectCitizen: (id: string) => void;
}

type RankTab = keyof CityFamilyRankings;

const RANK_TABS: { id: RankTab; label: string }[] = [
  { id: 'wealthiest', label: 'Wealthiest' },
  { id: 'oldestLine', label: 'Oldest Line' },
  { id: 'mostAchievements', label: 'Most Achievements' },
  { id: 'mostDarkAchievements', label: 'Most Dark' },
  { id: 'largestLiving', label: 'Largest Living' },
];

export function FamilyRankingsPanel({ city, onSelectCitizen }: FamilyRankingsPanelProps) {
  const [tab, setTab] = useState<RankTab>('wealthiest');
  const rankings = useMemo(() => computeCityFamilyRankings(city, 5), [city]);
  const rows = rankings[tab];
  const fam = city.family;

  return (
    <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-100">City-Wide Family Rankings</h3>
          <p className="text-[11px] text-slate-400">Dynastic wealth, continuous generations, achievements, and living lineage.</p>
        </div>
      </div>

      <div className="overflow-x-auto max-w-full">
        <div className="flex items-center gap-1 p-0.5 bg-[#090d16] border border-slate-800 rounded-md w-max">
          {RANK_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-2.5 py-1.5 text-xs rounded whitespace-nowrap cursor-pointer ${tab === t.id ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-slate-500 py-4 text-center">No entries recorded for this ranking yet.</div>
      ) : (
        <div className="divide-y divide-slate-800/80 bg-[#090d16] border border-slate-800 rounded-md">
          {rows.map((r, idx) => {
            const line = fam?.families[r.familyId];
            const founderId = line?.founderIds[0];
            return (
              <div key={r.familyId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[11px] text-amber-300 w-5">#{idx + 1}</span>
                  {founderId ? (
                    <button type="button" onClick={() => onSelectCitizen(founderId)} className="font-semibold text-slate-100 hover:text-amber-300 truncate cursor-pointer">
                      {r.surname} Family
                    </button>
                  ) : (
                    <span className="font-semibold text-slate-100 truncate">{r.surname} Family</span>
                  )}
                  <span className="text-[11px] text-slate-500 truncate">({r.founderName})</span>
                </div>
                <div className="font-mono text-[11px] text-slate-300 shrink-0">
                  {tab === 'wealthiest' && formatDelta(r.totalWealth)}
                  {tab === 'oldestLine' && `Gen ${r.maxGeneration} · ${r.totalMembers} members`}
                  {tab === 'mostAchievements' && `${r.achievementCount} unlocked`}
                  {tab === 'mostDarkAchievements' && <span className="text-rose-300">{r.darkAchievementCount} dark</span>}
                  {tab === 'largestLiving' && `${r.livingCount} living (${r.totalMembers} total)`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
