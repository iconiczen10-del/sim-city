// CitizenHousingTab.tsx — Citizen Housing tab: current home scores, landlord portfolio, housing history, and evictions

import { CitizenHousingSatisfaction } from './CitizenHousingSatisfaction';
import { ElectricityLedgerCard } from './ElectricityLedgerCard';
import { formatDelta } from './formatters';
import { DISTRICTS, HOUSE_SPECS } from './housingCatalog';
import { getHouseMonthlyMaintenance, getTenantMonthlyRent } from './housingScores';
import type { Citizen, CityState } from './types';

interface CitizenHousingTabProps {
  citizen: Citizen;
  city: CityState;
  onSelectCitizen?: (id: string) => void;
}

export function CitizenHousingTab({ citizen, city, onSelectCitizen }: CitizenHousingTabProps) {
  const house = citizen.homeId ? city.housing.houses.find((h) => h.id === citizen.homeId) ?? null : null;
  const ownedHouses = city.housing.houses.filter((h) => h.ownerId === citizen.id);
  const roommates = (citizen.roommateIds ?? []).map((id) => city.citizens.find((c) => c.id === id)).filter((c): c is Citizen => Boolean(c));
  const history = [...(citizen.housingHistory ?? [])].reverse();
  const evictions = [...(citizen.evictionRecords ?? [])].reverse();

  return (
    <div className="space-y-4 text-xs">
      <section className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            {house ? `${house.name} — ${HOUSE_SPECS[house.type].label}` : 'Currently Homeless'}
          </h3>
          {house ? (
            <span className="font-mono tabular-nums text-amber-300">
              {DISTRICTS[house.district].label} · Cond {house.condition}/100 · {house.ownerId === citizen.id ? `Maint ${formatDelta(getHouseMonthlyMaintenance(house))}/mo` : `Rent ${formatDelta(getTenantMonthlyRent(house))}/mo`}
            </span>
          ) : (
            <span className="font-mono tabular-nums text-rose-400">{citizen.homelessDays ?? 0} days without shelter</span>
          )}
        </div>

        {house && (
          <div className="grid grid-cols-5 gap-2">
            {(['comfort', 'space', 'noise', 'privacy', 'safety'] as const).map((k) => (
              <div key={k} className="bg-[#111827] border border-slate-800 rounded p-2">
                <div className="text-slate-400 capitalize">{k}</div>
                <div className="font-mono tabular-nums text-sm font-semibold text-slate-100 mt-0.5">{Math.round(house.scores[k])}</div>
              </div>
            ))}
          </div>
        )}

        {roommates.length > 0 && (
          <div className="text-slate-400">
            Roommates:{' '}
            {roommates.map((r, i) => (
              <span key={r.id}>
                <button type="button" onClick={() => onSelectCitizen?.(r.id)} className="text-amber-300 hover:underline cursor-pointer">{r.name}</button>
                {i < roommates.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        )}
      </section>

      <CitizenHousingSatisfaction citizen={citizen} city={city} house={house} />
      {house && <ElectricityLedgerCard title="Home Electricity Ledger" ledger={house.electricLedger} profile={house.usageProfile} tariff={city.electricity?.tariff} />}

      {ownedHouses.length > 0 && (
        <section className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">Owned Properties ({ownedHouses.length})</h3>
            <span className="font-mono tabular-nums text-emerald-300">Last rental income: {formatDelta(citizen.lastRentalIncome ?? 0)}/mo</span>
          </div>
          <div className="divide-y divide-slate-800/70">
            {ownedHouses.map((oh) => (
              <div key={oh.id} className="py-1.5 flex items-center justify-between">
                <span className="text-slate-200">{oh.name} · {DISTRICTS[oh.district].label} · {oh.occupantIds.length}/{oh.capacity} occupants</span>
                <span className="font-mono tabular-nums text-slate-400">Rent {formatDelta(oh.rentPrice)}/mo · Cond {oh.condition}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Housing History ({history.length})</h3>
          {history.length === 0 ? (
            <div className="text-slate-500">No housing moves recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/70 max-h-56 overflow-y-auto">
              {history.map((e, i) => (
                <div key={`${e.houseId}_${i}`} className="py-2 space-y-0.5">
                  <div className="flex items-center justify-between text-slate-200 font-medium">
                    <span>{e.houseName} ({e.ownership})</span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-400">{e.startDate}{e.endDate ? ` → ${e.endDate}` : ' → Present'}</span>
                  </div>
                  <div className="text-slate-400">{HOUSE_SPECS[e.type].label} · {DISTRICTS[e.district].label}{e.reason ? ` · ${e.reason}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Eviction Record ({evictions.length})</h3>
          {evictions.length === 0 ? (
            <div className="text-slate-500">Clean rental history — 0 evictions on record.</div>
          ) : (
            <div className="divide-y divide-slate-800/70 max-h-56 overflow-y-auto">
              {evictions.map((ev, i) => (
                <div key={`${ev.houseId}_${i}`} className="py-2 space-y-0.5">
                  <div className="flex items-center justify-between text-rose-300 font-medium">
                    <span>{ev.houseName}</span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-400">{ev.dateLabel}</span>
                  </div>
                  <div className="text-slate-400">{ev.reason} (-20 future application score)</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
