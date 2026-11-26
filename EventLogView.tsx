// EventLogView.tsx — Master Simulation Records viewer (3 entries/page, filters, and Jump to Day)

import { useMemo } from 'react';
import { FamilyRankingsPanel } from './FamilyRankingsPanel';
import { RecordsPanel } from './RecordsPanel';
import type { SubjectOption } from './RecordsFilterBar';
import { getRecordsIndex } from './recordsStore';
import type { CityState } from './types';

interface EventLogViewProps {
  city: CityState;
  onSelectCitizen: (citizenId: string) => void;
}

export function EventLogView({ city, onSelectCitizen }: EventLogViewProps) {
  const subjects = useMemo<SubjectOption[]>(() => [
    { id: 'city', label: 'City of Vij' },
    ...city.companies.map((c) => ({ id: c.id, label: `Co: ${c.name}` })),
    ...city.citizens.map((c) => ({ id: c.id, label: `Citizen: ${c.name}` })),
    ...city.housing.houses.map((h) => ({ id: h.id, label: `House: ${h.name}` })),
  ], [city.companies, city.citizens, city.housing.houses]);

  const idx = getRecordsIndex();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#111827] border border-slate-800/90 rounded-lg px-4 py-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-50">Simulation Records — Master Log</h2>
          <p className="text-xs text-slate-400">Append-only city archive. All records stored locally with cursor pagination.</p>
        </div>
        <div className="font-mono text-xs text-amber-300 tabular-nums">
          {idx.totalCount.toLocaleString('en-IN')} total records
        </div>
      </div>

      <FamilyRankingsPanel city={city} onSelectCitizen={onSelectCitizen} />

      <RecordsPanel
        pageSize={3}
        showJumpToDay
        subjects={subjects}
        refreshKey={city.totalDays}
        maxDay={city.totalDays}
        onSelectCitizen={onSelectCitizen}
      />
    </div>
  );
}
