// GJElectricityView.tsx — GJ Electricity company dashboard: grid KPIs, gas plants, tariff, demand, blackouts, and staff

import {
  buildGJPlant, moveRationingPriority, repairGJPlant, setGJTariffMultiplier, toggleCompanyPowerCut, toggleDistrictPowerCut,
} from './electricityActions';
import { getSeasonFromMonth } from './electricityCatalog';
import { formatDelta, formatSignedDelta } from './formatters';
import { GJDemandBlackoutsPanel } from './GJDemandBlackoutsPanel';
import { GJPlantsTariffPanel } from './GJPlantsTariffPanel';
import { GJStaffPanel } from './GJStaffPanel';
import { GJSubsidyPanel } from './GJSubsidyPanel';
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

  const nonCeoStaff = city.citizens.filter((c) => c.alive && c.employerId === 'gjelectricity' && c.roleLevel !== 'CEO');
  const season = getSeasonFromMonth(city.month);
  const peakPts = el.demandHistory.length > 0
    ? el.demandHistory.map((d) => ({ label: d.label, value: d.peakPerHour }))
    : [{ label: 'Now', value: el.todayPeakDemandPerHour }];

  const kpis = [
    { label: 'GJ Cash Reserve', value: formatDelta(gj.cash), sub: `Last profit ${formatSignedDelta(gj.lastMonthProfit)} · Absorbed ${formatDelta(el.totalSubsidyAbsorbed ?? 0)}` },
    { label: 'Grid Capacity / Peak', value: `${el.todayCapacityPerHour} / ${el.todayPeakDemandPerHour} u/hr`, sub: `${season} · 1.6x evening peak · ${el.todayCityUnits.toFixed(0)} u/d` },
    { label: 'Monthly Billed / Paid', value: formatDelta(el.monthlyCollectedTotal), sub: `Billed ${formatDelta(el.monthlyBilledTotal)} · Fuel ${formatDelta(el.monthlyFuelCost)}` },
    { label: 'GJ Staff (Non-CEO)', value: `${nonCeoStaff.length} / 6`, sub: `${city.vacancies.filter((v) => v.companyId === 'gjelectricity').length} open vacancy · Mood: ${el.subsidyMood ?? 'balanced'}` },
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
        <div className="lg:col-span-5">
          <GJStaffPanel city={city} onSelectCitizen={onSelectCitizen} />
        </div>
      </div>

      <GJSubsidyPanel city={city} onUpdateCity={onUpdateCity} />

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
