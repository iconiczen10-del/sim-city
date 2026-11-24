// GJDemandBlackoutsPanel.tsx — District demand cuts, rationing priority order, top 10 users, and blackouts log

import { ArrowDown, ArrowUp } from 'lucide-react';
import type { CompanyId } from './companyTypes';
import { RATIONING_LABELS } from './electricityCatalog';
import { getDistrictDailyDemand, getTopPowerConsumers } from './electricityStats';
import type { ElectricityState, RationingTier } from './electricityTypes';
import { DISTRICTS } from './housingCatalog';
import type { DistrictId } from './housingTypes';
import type { CityState } from './types';

interface GJDemandBlackoutsPanelProps {
  city: CityState;
  electricity: ElectricityState;
  onToggleDistrict: (d: DistrictId) => void;
  onToggleCompany: (c: CompanyId) => void;
  onMovePriority: (tier: RationingTier, dir: -1 | 1) => void;
}

export function GJDemandBlackoutsPanel({
  city,
  electricity,
  onToggleDistrict,
  onToggleCompany,
  onMovePriority,
}: GJDemandBlackoutsPanelProps) {
  const districtDemand = getDistrictDailyDemand(city.housing);
  const topUsers = getTopPowerConsumers(city.housing, city.companies, electricity);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
      <section className="lg:col-span-4 bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">District Demand &amp; Manual Cuts</h3>
        <div className="divide-y divide-slate-800/70">
          {(Object.keys(DISTRICTS) as DistrictId[]).map((d) => {
            const cut = electricity.manualCutDistricts.includes(d);
            return (
              <div key={d} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-slate-200 font-medium">{DISTRICTS[d].label}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{districtDemand[d].toFixed(1)} u/day</div>
                </div>
                <button type="button" onClick={() => onToggleDistrict(d)} className={`px-2.5 py-1 rounded border text-[11px] cursor-pointer ${cut ? 'border-rose-500/50 bg-rose-500/10 text-rose-300' : 'border-slate-700 text-slate-300 hover:border-amber-500/50'}`}>
                  {cut ? 'Restore' : 'Cut Power'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-1.5">
          <div className="text-slate-300 font-medium">Company Grid Switches</div>
          {city.companies.filter((c) => c.id !== 'gjelectricity').map((c) => {
            const cut = electricity.manualCutCompanies.includes(c.id);
            return (
              <div key={c.id} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">{c.name} ({(electricity.companyLedgers[c.id]?.todayUnits ?? 0).toFixed(0)}u/d)</span>
                <button type="button" onClick={() => onToggleCompany(c.id)} className={`px-2 py-0.5 rounded border cursor-pointer ${cut ? 'border-rose-500/50 text-rose-300' : 'border-slate-700 text-slate-400 hover:text-slate-100'}`}>
                  {cut ? 'Cut' : 'Live'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="lg:col-span-4 bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">Rationing Priority &amp; Top Users</h3>
        <div className="space-y-1.5">
          {electricity.rationingPriority.map((tier, idx) => (
            <div key={tier} className="bg-[#0c1220] border border-slate-800 rounded px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-slate-200 font-mono">{idx + 1}. {RATIONING_LABELS[tier]}</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={idx === 0} onClick={() => onMovePriority(tier, -1)} aria-label={`Move ${tier} up`} className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button type="button" disabled={idx === electricity.rationingPriority.length - 1} onClick={() => onMovePriority(tier, 1)} aria-label={`Move ${tier} down`} className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-1">
          <div className="text-slate-300 font-medium mb-1">Top 10 Power Users Today</div>
          {topUsers.map((u, i) => (
            <div key={u.id} className="flex justify-between font-mono tabular-nums text-[11px] text-slate-300">
              <span className="truncate">{i + 1}. {u.name} <span className="text-slate-500">({u.kind})</span></span>
              <span className="text-amber-300">{u.units.toFixed(1)}u</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lg:col-span-4 bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
          Blackouts &amp; Rationing Log ({electricity.blackouts.length})
        </h3>
        {electricity.blackouts.length === 0 ? (
          <div className="text-slate-500 py-8 text-center">No evening peak blackouts recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/70 max-h-80 overflow-y-auto space-y-1">
            {electricity.blackouts.slice(0, 20).map((b) => (
              <div key={b.id} className="py-2 space-y-0.5">
                <div className="flex justify-between font-mono tabular-nums text-rose-300 font-medium">
                  <span>{b.dateLabel} · {b.season}</span>
                  <span>-{b.shortfallPerHour.toFixed(1)} u/hr</span>
                </div>
                <div className="text-slate-300">{b.reason}</div>
                <div className="text-slate-500 font-mono text-[11px]">
                  {b.affectedHouseIds.length} home(s) · {b.affectedCompanyIds.length} company(s)
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
