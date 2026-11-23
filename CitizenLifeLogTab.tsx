// CitizenLifeLogTab.tsx — Searchable 60-day citizen diary of meals, shopping, losses, and feelings

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LIFE_LOG_LABELS } from './citizenInspectorLabels';
import type { LifeLogCategory } from './citizenInspectorTypes';
import type { Citizen } from './types';

interface CitizenLifeLogTabProps {
  citizen: Citizen;
}

const CAT_COLORS: Record<LifeLogCategory, string> = {
  meal: 'text-amber-300',
  shop: 'text-sky-300',
  loss: 'text-rose-300',
  gift: 'text-emerald-300',
  health: 'text-pink-300',
  mood: 'text-purple-300',
  money: 'text-teal-300',
  sharity: 'text-cyan-300',
};

export function CitizenLifeLogTab({ citizen }: CitizenLifeLogTabProps) {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<LifeLogCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return citizen.lifeLog.filter((e) => {
      if (catFilter !== 'all' && e.category !== catFilter) return false;
      if (q && !e.summary.toLowerCase().includes(q) && !e.dateLabel.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [citizen.lifeLog, query, catFilter]);

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0c1220] border border-slate-800/80 rounded-md p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 60-day diary..."
            className="w-full bg-[#090d16] border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as LifeLogCategory | 'all')}
          className="bg-[#090d16] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
        >
          <option value="all">All Diary Entries ({citizen.lifeLog.length})</option>
          {(Object.keys(LIFE_LOG_LABELS) as LifeLogCategory[]).map((k) => (
            <option key={k} value={k}>{LIFE_LOG_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md py-12 text-center text-slate-500">
          No diary entries match your filter.
        </div>
      ) : (
        <div className="bg-[#0c1220] border border-slate-800/80 rounded-md divide-y divide-slate-800/60 max-h-[410px] overflow-y-auto">
          {filtered.map((entry) => (
            <div key={entry.id} className="px-4 py-2.5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className={`font-medium mr-2 ${CAT_COLORS[entry.category]}`}>[{LIFE_LOG_LABELS[entry.category]}]</span>
                <span className="text-slate-200">{entry.summary}</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500 shrink-0">{entry.dateLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
