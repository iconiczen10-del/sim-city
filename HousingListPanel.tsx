// HousingListPanel.tsx — Filterable and sortable grid of all 60 Vij houses

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatDelta } from './formatters';
import { DISTRICTS, DISTRICT_ORDER, HOUSE_SPECS } from './housingCatalog';
import type { DistrictId } from './housingTypes';
import type { CityState, HomeType } from './types';

interface HousingListPanelProps {
  city: CityState;
  onSelectHouse: (houseId: string) => void;
}

type SortKey = 'name' | 'rent_asc' | 'rent_desc' | 'cond_asc' | 'price_desc' | 'district';
type VacancyFilter = 'all' | 'vacant' | 'occupied' | 'for_sale' | 'condemned';
type OwnerFilter = 'all' | 'gov' | 'citizen';

export function HousingListPanel({ city, onSelectHouse }: HousingListPanelProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | HomeType>('all');
  const [districtFilter, setDistrictFilter] = useState<'all' | DistrictId>('all');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [vacancyFilter, setVacancyFilter] = useState<VacancyFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');

  const citById = useMemo(() => new Map(city.citizens.map((c) => [c.id, c])), [city.citizens]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = city.housing.houses.filter((h) => {
      if (typeFilter !== 'all' && h.type !== typeFilter) return false;
      if (districtFilter !== 'all' && h.district !== districtFilter) return false;
      if (ownerFilter === 'gov' && h.ownerId !== 'gov') return false;
      if (ownerFilter === 'citizen' && h.ownerId === 'gov') return false;
      if (vacancyFilter === 'vacant' && (h.condemned || h.occupantIds.length >= h.capacity)) return false;
      if (vacancyFilter === 'occupied' && (h.condemned || h.occupantIds.length === 0)) return false;
      if (vacancyFilter === 'for_sale' && (!h.forSale || h.condemned)) return false;
      if (vacancyFilter === 'condemned' && !h.condemned) return false;
      if (!q) return true;
      const occNames = h.occupantIds.map((id) => citById.get(id)?.name ?? '').join(' ').toLowerCase();
      return h.name.toLowerCase().includes(q) || occNames.includes(q) || DISTRICTS[h.district].label.toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'rent_asc') return a.rentPrice - b.rentPrice;
      if (sortBy === 'rent_desc') return b.rentPrice - a.rentPrice;
      if (sortBy === 'cond_asc') return a.condition - b.condition;
      if (sortBy === 'price_desc') return (b.buyPrice ?? 0) - (a.buyPrice ?? 0);
      if (sortBy === 'district') return a.district.localeCompare(b.district) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [city.housing.houses, citById, query, typeFilter, districtFilter, ownerFilter, vacancyFilter, sortBy]);

  return (
    <div className="space-y-4">
      <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-3.5 flex flex-wrap items-center gap-2.5 text-xs">
        <label className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by house, district, or occupant..."
            className="w-full bg-[#090d16] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70"
          />
        </label>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | HomeType)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200">
          <option value="all">All Types</option>
          {(Object.keys(HOUSE_SPECS) as HomeType[]).map((t) => <option key={t} value={t}>{HOUSE_SPECS[t].label}</option>)}
        </select>
        <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value as 'all' | DistrictId)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200">
          <option value="all">All Districts</option>
          {DISTRICT_ORDER.map((d) => <option key={d} value={d}>{DISTRICTS[d].label}</option>)}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value as OwnerFilter)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200">
          <option value="all">All Owners</option>
          <option value="gov">Government</option>
          <option value="citizen">Citizen Owned</option>
        </select>
        <select value={vacancyFilter} onChange={(e) => setVacancyFilter(e.target.value as VacancyFilter)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200">
          <option value="all">All Statuses</option>
          <option value="vacant">Has Space</option>
          <option value="occupied">Occupied</option>
          <option value="for_sale">For Sale</option>
          <option value="condemned">Condemned</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="bg-[#090d16] border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200">
          <option value="name">Sort: Name</option>
          <option value="rent_asc">Sort: Rent Low-High</option>
          <option value="rent_desc">Sort: Rent High-Low</option>
          <option value="cond_asc">Sort: Condition Low-High</option>
          <option value="price_desc">Sort: Price High-Low</option>
          <option value="district">Sort: District</option>
        </select>
      </div>

      <div className="text-xs text-slate-400 font-mono tabular-nums">Showing {filtered.length} of {city.housing.houses.length} houses</div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((h) => {
          const ownerName = h.ownerId === 'gov' ? 'Government' : citById.get(h.ownerId)?.name ?? 'Citizen';
          const statusText = h.condemned ? 'Condemned' : h.occupantIds.length === 0 ? 'Vacant' : `${h.occupantIds.length}/${h.capacity} Occupied`;
          const statusCls = h.condemned ? 'text-rose-400' : h.occupantIds.length === 0 ? 'text-teal-300' : 'text-slate-300';
          return (
            <button
              key={h.id} type="button" onClick={() => onSelectHouse(h.id)}
              className="text-left bg-[#111827] border border-slate-800/90 hover:border-amber-500/60 rounded-lg p-4 space-y-2 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-display text-sm font-semibold text-slate-100 truncate">{h.name}</div>
                <span className={`font-mono tabular-nums text-[11px] shrink-0 ${statusCls}`}>{statusText}</span>
              </div>
              <div className="text-xs text-slate-400">
                {HOUSE_SPECS[h.type].label} · {DISTRICTS[h.district].label} · {ownerName}
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/70 font-mono tabular-nums text-xs">
                <span className="text-amber-300">{formatDelta(h.rentPrice)}/mo</span>
                <span className="text-slate-400">{h.buyPrice ? (h.forSale ? `Buy ${formatDelta(h.buyPrice)}` : `Val ${formatDelta(h.buyPrice)}`) : 'Rent only'}</span>
                <span className={h.condition < 40 ? 'text-rose-300' : 'text-emerald-300'}>Cond {h.condition}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
