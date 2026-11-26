// HousingDetailView.tsx — Detailed inspector for an individual Vij house: 5 scores, occupants, histories, queue, and SimGod controls

import { ArrowLeft } from 'lucide-react';
import { ElectricityLedgerCard } from './ElectricityLedgerCard';
import { formatDelta, formatSignedDelta } from './formatters';
import { DISTRICTS, HOUSE_SPECS } from './housingCatalog';
import { getHouseMonthlyMaintenance, getTenantMonthlyRent } from './housingScores';
import { HousingSimGodExtraPanel } from './HousingSimGodExtraPanel';
import { HousingSimGodPanel } from './HousingSimGodPanel';
import type { House } from './housingTypes';
import { RecordsPanel } from './RecordsPanel';
import { SparkChart } from './SparkChart';
import type { CityState } from './types';

interface HousingDetailViewProps {
  city: CityState;
  house: House;
  onBack: () => void;
  onUpdateCity: (next: CityState) => void;
  onSelectCitizen: (id: string) => void;
}

export function HousingDetailView({ city, house, onBack, onUpdateCity, onSelectCitizen }: HousingDetailViewProps) {
  const owner = house.ownerId === 'gov' ? null : city.citizens.find((c) => c.id === house.ownerId) ?? null;
  const occupants = city.citizens.filter((c) => house.occupantIds.includes(c.id));
  const perTenant = getTenantMonthlyRent(house);
  const maint = getHouseMonthlyMaintenance(house);

  const scoreBars: { label: string; value: number; color: string; hint?: string }[] = [
    { label: 'Comfort', value: house.scores.comfort, color: 'bg-amber-400' },
    { label: 'Space', value: house.scores.space, color: 'bg-sky-400' },
    { label: 'Noise Level', value: house.scores.noise, color: house.scores.noise > 68 ? 'bg-rose-400' : 'bg-slate-400', hint: 'Lower is quieter' },
    { label: 'Privacy', value: house.scores.privacy, color: 'bg-purple-400' },
    { label: 'Safety', value: house.scores.safety, color: house.scores.safety < 45 ? 'bg-rose-400' : 'bg-emerald-400' },
  ];

  const condPoints = house.conditionHistory.length > 0 ? house.conditionHistory.map((p) => ({ label: p.label, value: p.condition })) : [{ label: 'Now', value: house.condition }];

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /><span>Back to Houses</span></button>

      <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-50">{house.name}</h2>
            <div className="text-xs text-slate-400 mt-1">
              {HOUSE_SPECS[house.type].label} · {DISTRICTS[house.district].label} ({DISTRICTS[house.district].summary}) · Capacity {house.capacity}
            </div>
          </div>
          <div className="text-right font-mono tabular-nums text-xs space-y-1">
            <div className={house.condemned ? 'text-rose-400 font-semibold' : house.occupantIds.length === 0 ? 'text-teal-300' : 'text-emerald-300'}>
              {house.condemned ? 'Condemned' : house.occupantIds.length === 0 ? 'Vacant' : `${house.occupantIds.length}/${house.capacity} Occupied`}
              {house.forSale && !house.condemned ? ' · For Sale' : ''}
            </div>
            <div className="text-slate-300">
              Rent {formatDelta(house.rentPrice)}/mo ({formatDelta(perTenant)}/resident) · Maint {formatDelta(maint)}/mo
            </div>
            <div className="text-slate-400">
              Owner: {owner ? (
                <button type="button" onClick={() => onSelectCitizen(owner.id)} className="text-amber-300 hover:underline cursor-pointer">{owner.name}</button>
              ) : 'Government'} · {house.buyPrice ? `Buy ${formatDelta(house.buyPrice)}` : 'Rent only'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {scoreBars.map((s) => (
            <div key={s.label} className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3">
              <div className="flex items-baseline justify-between text-xs mb-1.5">
                <span className="text-slate-300">{s.label}</span>
                <span className="font-mono tabular-nums text-slate-100 font-semibold">{Math.round(s.value)}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${s.color}`} style={{ width: `${Math.min(100, Math.max(0, s.value))}%` }} />
              </div>
              {s.hint && <div className="text-[10px] text-slate-500 mt-1">{s.hint}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <h3 className="font-display text-sm font-semibold text-slate-100">Current Occupants ({occupants.length}/{house.capacity})</h3>
          {occupants.length === 0 ? (
            <div className="text-xs text-slate-500 py-4">No current residents.</div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {occupants.map((c) => (
                <button key={c.id} type="button" onClick={() => onSelectCitizen(c.id)} className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-800/30 px-2 -mx-2 rounded cursor-pointer text-xs">
                  <div>
                    <div className="font-medium text-slate-100">{c.name} <span className="text-slate-500 font-mono">({c.tier})</span></div>
                    <div className="text-slate-400">{c.roleLevel} · Mood {Math.round(c.mood)}</div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-amber-300">{house.ownerId === c.id ? 'Owner' : `${formatDelta(perTenant)}/mo`}</div>
                    {(c.rentArrearsMonths ?? 0) > 0 && <div className="text-rose-400">{c.rentArrearsMonths}mo overdue</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {house.applications.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-xs font-medium text-slate-300">Recent Applicant Queue</div>
              {house.applications.map((a) => (
                <div key={a.citizenId} className="flex items-center justify-between text-xs text-slate-400">
                  <button type="button" onClick={() => onSelectCitizen(a.citizenId)} className="text-slate-200 hover:text-amber-300 cursor-pointer">{a.citizenName}</button>
                  <span className="font-mono tabular-nums">Score {a.score} · Inc {formatDelta(a.monthlyIncome)} · Evict {a.evictionCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 space-y-4">
          <SparkChart title={`Condition Over Time (Now ${house.condition}/100)`} points={condPoints} strokeColor="#34d399" formatValue={(v) => `${Math.round(v)}`} fixedDomain={[0, 100]} />
          <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-2 text-xs">
            <h3 className="font-display text-sm font-semibold text-slate-100">Maintenance & Eviction Log</h3>
            {house.maintenanceHistory.slice(0, 5).map((m, i) => (
              <div key={`m_${i}`} className="flex justify-between text-slate-400 font-mono tabular-nums">
                <span>{m.dateLabel} · {m.ownerLabel}</span>
                <span>{formatDelta(m.cost)} ({formatSignedDelta(m.deltaCondition).replace('∆', '')} cond)</span>
              </div>
            ))}
            {house.evictionHistory.slice(0, 5).map((e, i) => (
              <div key={`e_${i}`} className="flex justify-between text-rose-300/90">
                <span>{e.dateLabel} · Evicted {e.citizenName}</span>
                <span className="text-slate-400">{e.reason}</span>
              </div>
            ))}
            {house.maintenanceHistory.length === 0 && house.evictionHistory.length === 0 && (
              <div className="text-slate-500">No monthly maintenance or eviction events recorded yet.</div>
            )}
          </div>
        </div>
      </div>

      <ElectricityLedgerCard title={`Electricity Ledger — ${house.name}`} ledger={house.electricLedger} profile={house.usageProfile} tariff={city.electricity?.tariff} />
      <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-4">
        <RecordsPanel pageSize={3} fixedSubjectId={house.id} title={`House Records — ${house.name}`} refreshKey={city.totalDays} maxDay={city.totalDays} />
      </div>
      <HousingSimGodPanel city={city} house={house} onUpdateCity={onUpdateCity} />
      <HousingSimGodExtraPanel city={city} house={house} onUpdateCity={onUpdateCity} />
    </div>
  );
}
