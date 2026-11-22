// CitizensView.tsx — Citizen directory with filters, sorting, Living/In Memory, and Mass Actions

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CitizenCard } from './CitizenCard';
import { TIER_ORDER } from './constants';
import { MassInventoryPanel } from './MassInventoryPanel';
import type { CitizenSort, CityState, RoleLevel, TierId } from './types';

interface CitizensViewProps {
  city: CityState;
  onUpdateCity: (next: CityState) => void;
  onSelectCitizen: (citizenId: string) => void;
}

const ROLE_OPTIONS: RoleLevel[] = ['CEO', 'Executive', 'Manager', 'Team Lead', 'Staff', 'Entry', 'Unemployed'];

export function CitizensView({ city, onUpdateCity, onSelectCitizen }: CitizensViewProps) {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'living' | 'memory'>('living');
  const [tierFilter, setTierFilter] = useState<TierId | 'ALL'>('ALL');
  const [roleFilter, setRoleFilter] = useState<RoleLevel | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<CitizenSort>('status');
  const [showMass, setShowMass] = useState(false);

  const livingCount = city.citizens.filter((c) => c.alive).length;
  const deceasedCount = city.citizens.length - livingCount;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = city.citizens.filter((c) => {
      if (viewMode === 'living' && !c.alive) return false;
      if (viewMode === 'memory' && c.alive) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (tierFilter !== 'ALL' && c.tier !== tierFilter) return false;
      const role = c.alive ? c.roleLevel : (c.previousRole ?? c.roleLevel);
      if (roleFilter !== 'ALL' && role !== roleFilter) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'richest') return b.savings - a.savings;
      if (sortBy === 'happiest') return b.mood - a.mood;
      return b.statusScore - a.statusScore;
    });
  }, [city.citizens, query, viewMode, tierFilter, roleFilter, sortBy]);

  return (
    <div className="space-y-5">
      <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="flex items-center gap-1 p-0.5 bg-[#090d16] border border-slate-800 rounded-md shrink-0">
            <button type="button" onClick={() => setViewMode('living')} className={`px-2.5 py-1 text-xs rounded cursor-pointer ${viewMode === 'living' ? 'bg-slate-800 text-slate-100 font-medium' : 'text-slate-400 hover:text-slate-100'}`}>
              Living ({livingCount})
            </button>
            <button type="button" onClick={() => setViewMode('memory')} className={`px-2.5 py-1 text-xs rounded cursor-pointer ${viewMode === 'memory' ? 'bg-slate-800 text-rose-300 font-medium' : 'text-slate-400 hover:text-slate-100'}`}>
              In Memory ({deceasedCount})
            </button>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search citizens..." className="w-full bg-[#090d16] border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Filter by tier" value={tierFilter} onChange={(e) => setTierFilter(e.target.value as TierId | 'ALL')} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200">
            <option value="ALL">All Tiers</option>
            {TIER_ORDER.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="Filter by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleLevel | 'ALL')} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200">
            <option value="ALL">All Roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex items-center gap-1 p-0.5 bg-[#090d16] border border-slate-800 rounded-md">
            {([['status', 'Highest Status'], ['richest', 'Richest'], ['happiest', 'Happiest']] as const).map(([id, lbl]) => (
              <button key={id} type="button" onClick={() => setSortBy(id)} className={`px-2.5 py-1 text-xs rounded whitespace-nowrap cursor-pointer ${sortBy === id ? 'bg-slate-800 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-100'}`}>
                {lbl}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowMass((v) => !v)} className={`px-2.5 py-1.5 text-xs rounded border cursor-pointer ${showMass ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold' : 'bg-[#090d16] border-amber-500/40 text-amber-300 hover:bg-amber-500/10'}`}>
            Mass Actions
          </button>
        </div>
      </div>

      {showMass && <MassInventoryPanel city={city} onUpdateCity={onUpdateCity} />}

      {filtered.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-lg py-16 text-center text-sm text-slate-400">
          {viewMode === 'memory' && deceasedCount === 0 ? 'No deceased citizens recorded in Vij.' : 'No citizens match the active search or filters.'}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3.5">
          {filtered.map((c) => <CitizenCard key={c.id} citizen={c} onSelect={onSelectCitizen} />)}
        </div>
      )}
    </div>
  );
}
