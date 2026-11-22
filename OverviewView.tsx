// OverviewView.tsx — City overview KPIs, employment, payroll, company health, tiers, and live feed

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { formatDelta, formatSignedDelta } from './formatters';
import { TierBreakdown } from './TierBreakdown';
import type { CityState } from './types';

interface OverviewViewProps {
  city: CityState;
  onOpenEvents: () => void;
  onOpenCompanies: () => void;
  onSelectCitizen: (citizenId: string) => void;
}

export function OverviewView({ city, onOpenEvents, onOpenCompanies, onSelectCitizen }: OverviewViewProps) {
  const alive = city.citizens.filter((c) => c.alive);
  const pop = alive.length;
  const deaths = city.citizens.length - pop;
  const totalSavings = alive.reduce((sum, c) => sum + c.savings, 0);
  const avgMood = pop ? Math.round(alive.reduce((sum, c) => sum + c.mood, 0) / pop) : 0;
  const avgStress = pop ? Math.round(alive.reduce((sum, c) => sum + c.stress, 0) / pop) : 0;
  const unemployedCount = alive.filter((c) => c.roleLevel === 'Unemployed').length;
  const employedCount = pop - unemployedCount;
  const unempPct = pop ? Math.round((unemployedCount / pop) * 100) : 0;
  const hungryCount = alive.filter((c) => c.hunger < 35).length;
  const thirstyCount = alive.filter((c) => c.thirst < 35).length;
  const sickCount = alive.filter((c) => c.health < 65).length;
  const activePayroll = alive.reduce((s, c) => s + c.lastGrossPay, 0);

  const kpis = [
    { label: 'Employment', value: `${employedCount} / ${pop}`, sub: `${unempPct}% unemployed · ${deaths} deceased` },
    { label: 'Total Payroll / Savings', value: formatDelta(activePayroll), sub: `Citizen savings ${formatDelta(totalSavings)}` },
    { label: 'Avg Mood / Stress', value: `${avgMood} / ${avgStress}`, sub: `${hungryCount}H · ${thirstyCount}T · ${sickCount}S states` },
    { label: 'City Treasury', value: formatDelta(city.treasury), sub: `Inc +${formatDelta(city.lastMonthTaxCollected)} · Biz +${formatDelta(city.lastBusinessTaxCollected)}` },
    { label: 'Open Job Seats', value: String(city.vacancies.length), sub: `${city.jobEvents.length} recent career shifts` },
  ];

  const latestEvents = city.events.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-[#111827] border border-slate-800/90 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-2">{kpi.label}</div>
            <div className="font-mono text-2xl font-semibold text-slate-50 tracking-tight">{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-1.5 font-mono">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <TierBreakdown citizens={alive} />
        </div>
        <section className="col-span-5 bg-[#111827] border border-slate-800/90 rounded-lg p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-semibold text-slate-100">Company Health Summary</h2>
            <button type="button" onClick={onOpenCompanies} className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-amber-200 cursor-pointer">
              <span>Inspect</span><ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="divide-y divide-slate-800/70 text-xs">
            {city.companies.map((comp) => (
              <div key={comp.id} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-slate-100">{comp.name}</span>
                  <span className="text-slate-500 ml-1.5 font-mono">Rep {comp.reputation.toFixed(0)}</span>
                </div>
                <div className="font-mono flex items-center gap-3">
                  <span className={comp.cash < 0 ? 'text-rose-300' : 'text-amber-300'}>{formatDelta(comp.cash)}</span>
                  <span className={comp.bankrupt ? 'text-rose-400' : comp.lastMonthProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    {comp.bankrupt ? 'Bankrupt' : formatSignedDelta(comp.lastMonthProfit)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-5 bg-[#111827] border border-slate-800/90 rounded-lg p-5 flex flex-col">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-sm font-semibold text-slate-100">Tier Movement This Month</h2>
            <span className="font-mono text-xs text-slate-400">{city.tierMovementsThisMonth.length} shifts</span>
          </div>
          {city.tierMovementsThisMonth.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded">
              No tier transitions recorded yet for the latest completed month.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {city.tierMovementsThisMonth.map((m) => (
                <button key={`${m.citizenId}_${m.monthLabel}`} type="button" onClick={() => onSelectCitizen(m.citizenId)} className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-800/30 px-2 -mx-2 rounded cursor-pointer">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100 truncate">{m.citizenName}</div>
                    <div className="text-xs text-slate-500 font-mono">Score {m.statusScore.toFixed(1)} · {m.monthLabel}</div>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
                    <span className="text-slate-400">{m.fromTier}</span>
                    {m.direction === 'up' ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />}
                    <span className={m.direction === 'up' ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>{m.toTier}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="col-span-7 bg-[#111827] border border-slate-800/90 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-semibold text-slate-100">Live City Feed</h2>
            <button type="button" onClick={onOpenEvents} className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-amber-200 cursor-pointer">
              <span>Full log</span><ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="divide-y divide-slate-800/80">
            {latestEvents.map((evt) => (
              <div key={evt.id} className="py-2.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-slate-200">{evt.title}</span>
                    <span className="text-slate-600">·</span>
                    <span className="capitalize text-slate-400">{evt.type}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{evt.detail}</p>
                </div>
                <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap shrink-0">{evt.dateLabel}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
