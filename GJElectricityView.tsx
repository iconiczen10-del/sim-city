// GJElectricityView.tsx — GJ Electricity company dashboard: grid KPIs, gas plants, tariff, demand, blackouts, and staff

import { Zap } from 'lucide-react';
import {
  buildGJPlant, moveRationingPriority, repairGJPlant, setGJTariffMultiplier, toggleCompanyPowerCut, toggleDistrictPowerCut,
} from './electricityActions';
import { getSeasonFromMonth } from './electricityCatalog';
import { formatDelta, formatSignedDelta } from './formatters';
import { GJDemandBlackoutsPanel } from './GJDemandBlackoutsPanel';
import { GJPlantsTariffPanel } from './GJPlantsTariffPanel';
import { RecordsPanel } from './RecordsPanel';
import { SparkChart } from './SparkChart';
import type { CityState } from './types';

interface GJElectricityViewProps {
  city: CityState;
  onUpdateCity: (updater: (prev: CityState) => CityState) => void;
  onSelectCitizen: (citizenId: string) => void;
}

export function GJElectricityView({ city, onUpdateCity, onSelectCitizen }: GJElectricityViewProps) {
  const gj = city.companies.find((c) => c.id === 'gjelectricity');
  const el = city.electricity;
  if (!gj || !el) return <div className="text-xs text-slate-400">GJ Electricity grid state not initialized.</div>;

  const staff = city.citizens.filter((c) => c.alive && c.employerId === 'gjelectricity');
  const season = getSeasonFromMonth(city.month);
  const peakPts = el.demandHistory.length > 0
    ? el.demandHistory.map((d) => ({ label: d.label, value: d.peakPerHour }))
    : [{ label: 'Now', value: el.todayPeakDemandPerHour }];

  const kpis = [
    { label: 'GJ Cash Reserve', value: formatDelta(gj.cash), sub: `Last profit ${formatSignedDelta(gj.lastMonthProfit)} · 0 outside rev` },
    { label: 'Grid Capacity / Peak', value: `${el.todayCapacityPerHour} / ${el.todayPeakDemandPerHour} u/hr`, sub: `${season} · 1.6x evening peak · ${el.todayCityUnits.toFixed(0)} u/d` },
    { label: 'Monthly Billed / Paid', value: formatDelta(el.monthlyCollectedTotal), sub: `Billed ${formatDelta(el.monthlyBilledTotal)} · Fuel ${formatDelta(el.monthlyFuelCost)}` },
    { label: 'Staff & Vacancies', value: `${staff.length} / 3`, sub: `${city.vacancies.filter((v) => v.companyId === 'gjelectricity').length} open job seat(s) · 1.10x pay` },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-[#111827] border border-slate-800/90 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-1.5">{k.label}</div>
            <div className="font-mono tabular-nums text-xl font-semibold text-slate-50">{k.value}</div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <SparkChart title={`Evening Peak Demand (u/hr vs ${el.todayCapacityPerHour} u/hr cap)`} points={peakPts} strokeColor="#fbbf24" formatValue={(v) => `${v.toFixed(1)} u/hr`} />
        </div>
        <section className="lg:col-span-5 bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Zap className="w-4 h-4 text-amber-300" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold text-slate-100">GJ Electricity Roster (1–3 Staff)</h3>
          </div>
          <div className="divide-y divide-slate-800/70">
            {staff.map((emp) => (
              <button key={emp.id} type="button" onClick={() => onSelectCitizen(emp.id)} className="w-full py-2 flex items-center justify-between text-left hover:bg-slate-800/30 px-2 -mx-2 rounded cursor-pointer">
                <div>
                  <div className="font-medium text-slate-100">{emp.name}</div>
                  <div className="text-slate-400">{emp.roleLevel} · Perf {emp.performanceScore}/100</div>
                </div>
                <span className="font-mono tabular-nums text-amber-300">{formatDelta(emp.lastGrossPay)}/mo</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <GJPlantsTariffPanel
        electricity={el}
        gj={gj}
        onBuildPlant={() => onUpdateCity((p) => buildGJPlant(p))}
        onRepairPlant={(id) => onUpdateCity((p) => repairGJPlant(p, id))}
        onSetTariff={(m) => onUpdateCity((p) => setGJTariffMultiplier(p, m))}
      />

      <GJDemandBlackoutsPanel
        city={city}
        electricity={el}
        onToggleDistrict={(d) => onUpdateCity((p) => toggleDistrictPowerCut(p, d))}
        onToggleCompany={(id) => onUpdateCity((p) => toggleCompanyPowerCut(p, id))}
        onMovePriority={(tier, dir) => onUpdateCity((p) => moveRationingPriority(p, tier, dir))}
      />

      <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-4">
        <RecordsPanel pageSize={3} fixedSubjectId="gjelectricity" title="GJ Electricity Records" refreshKey={city.totalDays} maxDay={city.totalDays} />
      </div>
    </div>
  );
}
