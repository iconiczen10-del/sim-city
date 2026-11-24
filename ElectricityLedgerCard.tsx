// ElectricityLedgerCard.tsx — Monthly electricity ledger with banded breakdown, daily/monthly chart, spikes, and bill history

import { Zap } from 'lucide-react';
import { useState } from 'react';
import type { ElectricLedger, HouseUsageProfile, TariffState } from './electricityTypes';
import { formatDelta, formatPrice } from './formatters';
import { SparkChart } from './SparkChart';

interface ElectricityLedgerCardProps {
  title: string;
  ledger?: ElectricLedger;
  profile?: HouseUsageProfile;
  tariff?: TariffState;
}

export function ElectricityLedgerCard({ title, ledger, profile, tariff }: ElectricityLedgerCardProps) {
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('daily');
  if (!ledger) return null;

  const latest = ledger.bills[0];
  const points = chartMode === 'daily'
    ? (ledger.dailyUnitsHistory.length ? ledger.dailyUnitsHistory.map((d) => ({ label: d.label, value: d.units })) : [{ label: 'Today', value: ledger.todayUnits }])
    : (ledger.monthlyUnitsHistory.length ? ledger.monthlyUnitsHistory.map((m) => ({ label: m.label, value: m.units })) : [{ label: 'MTD', value: ledger.monthUnits }]);

  return (
    <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-300" aria-hidden="true" />
          <h3 className="font-display text-sm font-semibold text-slate-100">{title}</h3>
        </div>
        <div className="flex items-center gap-3 font-mono tabular-nums">
          <span className={ledger.powerCut ? 'text-rose-400 font-semibold' : ledger.blackedOutToday ? 'text-amber-300 font-semibold' : 'text-emerald-300'}>
            {ledger.powerCut ? 'Disconnected (Unpaid)' : ledger.blackedOutToday ? 'Rationed / Blackout' : 'Power Connected'}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300">Today {ledger.todayUnits.toFixed(1)}u · MTD {ledger.monthUnits.toFixed(1)}u</span>
        </div>
      </div>

      {profile && (
        <div className="bg-[#0c1220] border border-slate-800/80 rounded px-3 py-2 text-slate-300">
          <span className="text-slate-400 mr-1.5">Usage Profile:</span>
          <span className="text-slate-100">{profile.summary}</span>
          <span className="text-slate-500 font-mono ml-2">({profile.profileMult.toFixed(2)}x)</span>
        </div>
      )}

      {ledger.disconnectNotice && (
        <div className="bg-rose-500/10 border border-rose-500/40 rounded px-3 py-2 text-rose-200 font-medium">
          {ledger.disconnectNotice} · Arrears {formatPrice(ledger.arrearsBalance)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Usage Trend (units)</span>
            <div className="flex items-center gap-1 p-0.5 bg-[#090d16] border border-slate-800 rounded">
              {(['daily', 'monthly'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setChartMode(m)} className={`px-2 py-0.5 rounded text-[11px] capitalize cursor-pointer ${chartMode === m ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <SparkChart title={chartMode === 'daily' ? 'Daily Units' : 'Monthly Units'} points={points} strokeColor="#fbbf24" formatValue={(v) => `${v.toFixed(1)}u`} />
        </div>

        <div className="lg:col-span-6 bg-[#0c1220] border border-slate-800/80 rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-semibold text-slate-200">{latest ? `Latest Bill (${latest.dateLabel})` : 'Current Tariff Bands'}</span>
            {latest && <span className="font-mono tabular-nums text-amber-300 font-semibold">{formatPrice(latest.totalDue)} ({latest.status})</span>}
          </div>
          {latest ? (
            <div className="space-y-1 font-mono tabular-nums text-[11px] text-slate-300">
              <div className="flex justify-between"><span>Connection (30d @ ∆1/d)</span><span>{formatPrice(latest.connectionFee)}</span></div>
              <div className="flex justify-between"><span>Band 1 (0-60u: {latest.band1Units}u)</span><span>{formatPrice(latest.band1Charge)}</span></div>
              <div className="flex justify-between"><span>Band 2 (61-180u: {latest.band2Units}u)</span><span>{formatPrice(latest.band2Charge)}</span></div>
              <div className="flex justify-between"><span>Band 3 (181+u: {latest.band3Units}u)</span><span>{formatPrice(latest.band3Charge)}</span></div>
              {latest.lateFee > 0 && <div className="flex justify-between text-rose-300"><span>5% Late Fee</span><span>{formatPrice(latest.lateFee)}</span></div>}
              <div className="flex justify-between border-t border-slate-800 pt-1 text-slate-100 font-semibold">
                <span>Total {latest.units}u · Paid {formatPrice(latest.paidAmount)}</span>
                <span>{formatPrice(latest.totalDue)}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 font-mono text-[11px] space-y-1">
              <div>First bill settles on Day 30 after payroll.</div>
              {tariff && <div>Tariff {tariff.multiplier.toFixed(2)}x: ∆{(0.5 * tariff.multiplier).toFixed(2)} / ∆{(1.5 * tariff.multiplier).toFixed(2)} / ∆{(2.5 * tariff.multiplier).toFixed(2)} per unit</div>}
            </div>
          )}
        </div>
      </div>

      {ledger.spikeHistory.length > 0 && (
        <div className="bg-[#0c1220] border border-slate-800/80 rounded p-2.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-300">Spike Events</div>
          {ledger.spikeHistory.slice(0, 4).map((sp) => (
            <div key={sp.id} className="flex justify-between text-[11px] text-slate-400 font-mono tabular-nums">
              <span className="text-slate-300">{sp.reason}</span>
              <span>+{sp.extraUnitsPerDay}u/d · D{sp.startDay}–D{sp.endDay}</span>
            </div>
          ))}
        </div>
      )}

      {ledger.bills.length > 0 && (
        <div className="divide-y divide-slate-800/70 max-h-32 overflow-y-auto font-mono tabular-nums text-[11px]">
          {ledger.bills.slice(0, 6).map((b) => (
            <div key={b.id} className="py-1.5 flex items-center justify-between text-slate-300">
              <span>{b.dateLabel} · {b.units.toFixed(1)}u</span>
              <span>Due {formatDelta(b.totalDue)} · Paid {formatDelta(b.paidAmount)} · <span className={b.status === 'paid' || b.status === 'reconnected' ? 'text-emerald-300' : 'text-rose-300'}>{b.status}</span></span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
