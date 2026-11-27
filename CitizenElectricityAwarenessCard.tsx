// CitizenElectricityAwarenessCard.tsx — Citizen Housing sub-panel showing active subsidy and "What I Know" electricity beliefs

import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { ensureCitizenElectricityAwareness } from './electricityAwarenessSeed';
import { formatDelta } from './formatters';
import type { Citizen, CityState } from './types';

interface CitizenElectricityAwarenessCardProps {
  citizen: Citizen;
  city: CityState;
}

export function CitizenElectricityAwarenessCard({ citizen, city }: CitizenElectricityAwarenessCardProps) {
  const [openHistId, setOpenHistId] = useState<string | null>(null);
  const aw = citizen.electricityAwareness ?? ensureCitizenElectricityAwareness({ ...citizen });
  const house = citizen.homeId ? city.housing.houses.find((h) => h.id === citizen.homeId) : undefined;
  const sub = house?.electricLedger?.currentSubsidy;
  const hist = citizen.subsidyHistory ?? [];

  const knowItems: { label: string; value: string; ok: boolean }[] = [
    { label: 'Tariff Bands', value: aw.knowsTariffBands ? `Knows (${aw.tariffBeliefAccuracy})` : `Unaware (${aw.tariffBeliefAccuracy})`, ok: aw.knowsTariffBands && aw.tariffBeliefAccuracy === 'accurate' },
    { label: 'Late Fee (5%)', value: aw.knowsLateFee ? 'Knows 5% fee' : 'Unaware', ok: aw.knowsLateFee },
    { label: '3-Mo Disconnect', value: aw.knowsDisconnectRule ? 'Knows 3mo cut rule' : 'Unaware', ok: aw.knowsDisconnectRule },
    { label: '∆50 Reconnect Fine', value: aw.knowsReconnectFine ? 'Knows ∆50 fine' : 'Unaware', ok: aw.knowsReconnectFine },
    { label: 'GJ Subsidies', value: aw.knowsSubsidy ? `Knows (${aw.subsidySource.replace('_', ' ')})` : 'Unaware', ok: aw.knowsSubsidy },
    { label: 'Usage Conservation', value: aw.monthlyConservationPct > 0 ? `-${aw.monthlyConservationPct}% active` : 'None', ok: aw.monthlyConservationPct > 0 },
  ];

  return (
    <section className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-300" aria-hidden="true" />
          <h3 className="font-display text-sm font-semibold text-slate-100">What I Know &amp; Electricity Subsidy</h3>
        </div>
        <span className="font-mono tabular-nums text-[11px] text-slate-300">
          Trust in GJ: <span className={aw.trustInGJ >= 60 ? 'text-emerald-300' : aw.trustInGJ < 40 ? 'text-rose-300' : 'text-amber-300'}>{aw.trustInGJ}/100</span>
        </span>
      </div>

      {sub && (
        <div className="bg-[#111827] border border-slate-800 rounded p-2.5 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono tabular-nums text-[11px]">
            <span className="text-slate-200 uppercase">Home Subsidy: <span className="text-emerald-300">{sub.status.replace('_', ' ')}</span></span>
            <span className="text-emerald-300">Absorbed {formatDelta(sub.monthlyAbsorbed)}</span>
          </div>
          <div className="text-[11px] text-slate-400">{sub.reasonSummary}</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {knowItems.map((it) => (
          <div key={it.label} className="bg-[#111827] border border-slate-800/90 rounded p-2.5 flex items-center justify-between gap-2">
            <span className="text-slate-400">{it.label}</span>
            <span className={`font-mono tabular-nums text-[11px] ${it.ok ? 'text-emerald-300' : 'text-slate-300'}`}>{it.value}</span>
          </div>
        ))}
      </div>

      {aw.lastReactionNote && (
        <div className="text-[11px] text-slate-300 bg-[#111827] border border-slate-800/80 rounded px-3 py-2">
          <span className="text-slate-500">Latest reaction: </span>{aw.lastReactionNote}
          {aw.refusedSubsidy ? ' · Pride-refused subsidy.' : ''}
          {aw.askedForPlan ? ' · Requested payment plan.' : ''}
        </div>
      )}

      {hist.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-slate-400 font-medium">Personal Electric Bill &amp; Subsidy Decisions</div>
          {hist.slice(0, 5).map((h) => {
            const open = openHistId === h.id;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setOpenHistId(open ? null : h.id)}
                className="w-full min-h-[44px] sm:min-h-[34px] bg-[#111827] border border-slate-800 rounded px-3 py-2 text-left cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 font-mono tabular-nums text-[11px]">
                  <span className="text-slate-200">{h.dateLabel} · {h.billChoice.replace(/_/g, ' ')}</span>
                  <span className="flex items-center gap-1.5 text-slate-300">
                    Paid {formatDelta(h.sharePaid)} {h.amountSaved > 0 ? `· Saved ${formatDelta(h.amountSaved)}` : ''}
                    {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </span>
                </div>
                {open && <div className="mt-1 pt-1 border-t border-slate-800/70 text-[11px] text-slate-400">{h.houseName} · {h.reason}</div>}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
