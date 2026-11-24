// GJPlantsTariffPanel.tsx — Gas plant fleet, build/repair controls, and CEO tariff multiplier panel

import type { Company } from './companyTypes';
import { MAX_GAS_PLANTS, PLANT_BUILD_COST, PLANT_REPAIR_COST } from './electricityCatalog';
import type { ElectricityState } from './electricityTypes';
import { formatDelta, formatPrice } from './formatters';

interface GJPlantsTariffPanelProps {
  electricity: ElectricityState;
  gj: Company;
  onBuildPlant: () => void;
  onRepairPlant: (plantId: string) => void;
  onSetTariff: (mult: number) => void;
}

const TARIFF_STEPS = [0.7, 0.85, 1.0, 1.15, 1.3, 1.5];

export function GJPlantsTariffPanel({
  electricity,
  gj,
  onBuildPlant,
  onRepairPlant,
  onSetTariff,
}: GJPlantsTariffPanelProps) {
  const canBuild = !gj.bankrupt && electricity.plants.length < MAX_GAS_PLANTS && gj.cash >= PLANT_BUILD_COST;
  const mult = electricity.tariff.multiplier;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
      <section className="lg:col-span-7 bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Gas Plants ({electricity.plants.length} / {MAX_GAS_PLANTS})
            </h3>
            <div className="text-slate-400 mt-0.5 font-mono tabular-nums">
              Output {electricity.todayCapacityPerHour} u/hr · Upkeep ∆1,500/plant/mo · Fuel ∆0.60/u
            </div>
          </div>
          <button
            type="button"
            disabled={!canBuild}
            onClick={onBuildPlant}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${canBuild ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer font-semibold' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
          >
            Build Plant ({formatDelta(PLANT_BUILD_COST)} · 180d)
          </button>
        </div>

        <div className="divide-y divide-slate-800/70">
          {electricity.plants.map((p) => (
            <div key={p.id} className="py-2 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-100">{p.name}</div>
                <div className="text-slate-400 font-mono text-[11px]">
                  {p.status === 'online' ? `${p.capacityPerHour} u/hr online` : p.status === 'building' ? `Under construction · ${p.daysRemaining}d left` : p.status === 'repairing' ? `Repairing · ${p.daysRemaining}d left` : `Failed (0 u/hr) · ${p.failuresCount} failure(s)`}
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className={p.status === 'online' ? 'text-emerald-300' : p.status === 'failed' ? 'text-rose-400 font-semibold' : 'text-amber-300'}>
                  {p.status.toUpperCase()}
                </span>
                {p.status === 'failed' && (
                  <button
                    type="button"
                    disabled={gj.cash < PLANT_REPAIR_COST}
                    onClick={() => onRepairPlant(p.id)}
                    className={`px-2.5 py-1 rounded border text-[11px] ${gj.cash >= PLANT_REPAIR_COST ? 'border-amber-500/50 text-amber-300 hover:bg-amber-500/10 cursor-pointer' : 'border-slate-800 text-slate-500 cursor-not-allowed'}`}
                  >
                    Repair ({formatDelta(PLANT_REPAIR_COST)} / 10d)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lg:col-span-5 bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="font-display text-sm font-semibold text-slate-100">Tariff Bands &amp; CEO Control</h3>
          <span className="font-mono tabular-nums text-amber-300 font-semibold">
            {mult.toFixed(2)}x ({Math.round((mult - 1) * 100) >= 0 ? `+${Math.round((mult - 1) * 100)}` : Math.round((mult - 1) * 100)}%)
          </span>
        </div>

        <div className="bg-[#0c1220] border border-slate-800/80 rounded p-3 space-y-1 font-mono tabular-nums text-[11px] text-slate-300">
          <div className="flex justify-between"><span>Connection Fee</span><span>∆1.00 / day (∆30/mo)</span></div>
          <div className="flex justify-between"><span>Band 1 (0–60 u)</span><span>{formatPrice(0.5 * mult)} / u</span></div>
          <div className="flex justify-between"><span>Band 2 (61–180 u)</span><span>{formatPrice(1.5 * mult)} / u</span></div>
          <div className="flex justify-between"><span>Band 3 (181+ u)</span><span>{formatPrice(2.5 * mult)} / u</span></div>
        </div>

        <div>
          <div className="text-slate-400 mb-1.5">Set Tariff Multiplier (-30% to +50%)</div>
          <div className="grid grid-cols-3 gap-1.5 font-mono tabular-nums">
            {TARIFF_STEPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSetTariff(s)}
                className={`py-1.5 rounded border text-xs cursor-pointer ${Math.abs(mult - s) < 0.02 ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold' : 'bg-[#0c1220] text-slate-300 border-slate-800 hover:border-slate-600'}`}
              >
                {s === 1 ? 'Base (1.0x)' : `${Math.round((s - 1) * 100) > 0 ? `+${Math.round((s - 1) * 100)}` : Math.round((s - 1) * 100)}%`}
              </button>
            ))}
          </div>
        </div>
        <div className="text-[11px] text-slate-400">Latest change: {electricity.tariff.lastReason}</div>
      </section>
    </div>
  );
}
