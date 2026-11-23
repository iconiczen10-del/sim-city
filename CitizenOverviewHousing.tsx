// CitizenOverviewHousing.tsx — Current home or homelessness summary block inside Citizen Profile Overview

import { formatDelta } from './formatters';
import { DISTRICTS, HOUSE_SPECS } from './housingCatalog';
import { getHouseMonthlyMaintenance, getTenantMonthlyRent } from './housingScores';
import type { Citizen, CityState } from './types';

interface CitizenOverviewHousingProps {
  citizen: Citizen;
  city: CityState;
  onSelectCitizen?: (id: string) => void;
}

export function CitizenOverviewHousing({ citizen, city, onSelectCitizen }: CitizenOverviewHousingProps) {
  const house = citizen.homeId ? city.housing.houses.find((h) => h.id === citizen.homeId) ?? null : null;
  const landlord = house && house.ownerId !== 'gov' && house.ownerId !== citizen.id
    ? city.citizens.find((c) => c.id === house.ownerId) ?? null
    : null;
  const roommates = (citizen.roommateIds ?? [])
    .map((id) => city.citizens.find((c) => c.id === id))
    .filter((c): c is Citizen => Boolean(c));

  return (
    <section className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-200">Housing Status</span>
        {house ? (
          <span className="font-mono tabular-nums text-slate-300">
            {house.ownerId === citizen.id ? 'Homeowner' : landlord ? `Tenant (${landlord.name})` : 'Gov Tenant'}
          </span>
        ) : (
          <span className="font-mono text-rose-400 font-semibold">Homeless ({citizen.homelessDays ?? 0}d)</span>
        )}
      </div>

      {house ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
          <span>
            <strong className="text-slate-100 font-medium">{house.name}</strong> · {HOUSE_SPECS[house.type].label} · {DISTRICTS[house.district].label} · Cond {house.condition}/100
          </span>
          <span className="font-mono tabular-nums text-amber-300">
            {house.ownerId === citizen.id
              ? `Maint ${formatDelta(getHouseMonthlyMaintenance(house))}/mo`
              : `Rent ${formatDelta(getTenantMonthlyRent(house))}/mo`}
            {(citizen.rentArrearsMonths ?? 0) > 0 && (
              <span className="text-rose-400 ml-2">({citizen.rentArrearsMonths}mo overdue)</span>
            )}
          </span>
        </div>
      ) : (
        <div className="text-rose-300/90">
          Without shelter (Shelter 0 · Safety 20 · {citizen.seekingHousing ? 'Actively searching' : 'Waiting'}).
        </div>
      )}

      {roommates.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-slate-400 pt-1 border-t border-slate-800/70">
          <span>Roommates:</span>
          {roommates.map((r, i) => (
            <span key={r.id}>
              {onSelectCitizen ? (
                <button type="button" onClick={() => onSelectCitizen(r.id)} className="text-amber-300 hover:underline cursor-pointer">
                  {r.name}
                </button>
              ) : (
                <span className="text-slate-200">{r.name}</span>
              )}
              {i < roommates.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
