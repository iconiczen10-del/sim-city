// HousingSimGodExtraPanel.tsx — Part 3 SimGod housing powers: rent hike, district shift, force sell-back, shortage, force roommates

import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { DISTRICTS } from './housingCatalog';
import {
  simGodDistrictMarketShift, simGodForceRoommates, simGodForceSellBack,
  simGodHousingShortage, simGodRaiseHouseRent,
} from './housingSimGodExtra';
import type { House } from './housingTypes';
import type { CityState } from './types';

interface HousingSimGodExtraPanelProps {
  city: CityState;
  house: House;
  onUpdateCity: (next: CityState) => void;
}

interface PendingAction { title: string; message: string; confirmLabel: string; run: () => void; }

export function HousingSimGodExtraPanel({ city, house, onUpdateCity }: HousingSimGodExtraPanelProps) {
  const alive = city.citizens.filter((c) => c.alive);
  const [raisePct, setRaisePct] = useState('25');
  const [shortCount, setShortCount] = useState('4');
  const [shortDays, setShortDays] = useState('10');
  const [roomA, setRoomA] = useState(alive[0]?.id ?? '');
  const [roomB, setRoomB] = useState(alive[1]?.id ?? '');
  const [pending, setPending] = useState<PendingAction | null>(null);

  return (
    <section className="bg-[#111827] border border-amber-500/25 rounded-lg p-4 space-y-3 text-xs">
      <h3 className="font-display text-sm font-semibold text-amber-300">SimGod Market & Behavioral Controls</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <input type="number" min={5} max={100} value={raisePct} onChange={(e) => setRaisePct(e.target.value)} className="w-20 bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" />
          <button type="button" onClick={() => {
            const pct = Math.max(5, Math.min(100, Number(raisePct) || 25));
            setPending({ title: 'Force Rent Raise', message: `Raise ${house.name} rent by +${pct}% and trigger tenant search?`, confirmLabel: 'Raise Rent', run: () => onUpdateCity(simGodRaiseHouseRent(city, house.id, pct)) });
          }} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 whitespace-nowrap cursor-pointer">
            Force +{raisePct}% Rent Hike
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPending({ title: 'District Rent Boom', message: `Trigger a +20% boom across all ${DISTRICTS[house.district].label} residences?`, confirmLabel: 'Boom (+20%)', run: () => onUpdateCity(simGodDistrictMarketShift(city, house.district, 'boom')) })} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer">
            {DISTRICTS[house.district].label} Boom (+20%)
          </button>
          <button type="button" onClick={() => setPending({ title: 'District Rent Bust', message: `Trigger a -20% bust across all ${DISTRICTS[house.district].label} residences?`, confirmLabel: 'Bust (-20%)', run: () => onUpdateCity(simGodDistrictMarketShift(city, house.district, 'bust')) })} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 cursor-pointer">
            Bust (-20%)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input type="number" min={1} max={20} value={shortCount} onChange={(e) => setShortCount(e.target.value)} className="w-16 bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" />
          <input type="number" min={1} max={60} value={shortDays} onChange={(e) => setShortDays(e.target.value)} className="w-16 bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" />
          <button type="button" onClick={() => {
            const cnt = Math.max(1, Number(shortCount) || 4);
            const days = Math.max(1, Number(shortDays) || 10);
            setPending({ title: 'Housing Shortage', message: `Close ${cnt} houses for ${days} days of urgent maintenance?`, confirmLabel: 'Close Houses', run: () => onUpdateCity(simGodHousingShortage(city, cnt, days)) });
          }} className="px-3 py-1.5 rounded bg-rose-950/70 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 whitespace-nowrap cursor-pointer">
            Shortage ({shortCount}h / {shortDays}d)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" disabled={house.ownerId === 'gov'} onClick={() => setPending({ title: 'Force Citizen Sell-Back', message: `Force owner of ${house.name} to sell back to Government at 85%?`, confirmLabel: 'Force Sell-Back', run: () => onUpdateCity(simGodForceSellBack(city, house.id)) })} className="px-3 py-1.5 rounded bg-rose-950/70 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 disabled:opacity-40 cursor-pointer">
            Force Owner Sell-Back (85%)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select value={roomA} onChange={(e) => setRoomA(e.target.value)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-200">
          {alive.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-slate-500">+</span>
        <select value={roomB} onChange={(e) => setRoomB(e.target.value)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-200">
          {alive.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" disabled={!roomA || !roomB || roomA === roomB || house.condemned} onClick={() => {
          const nA = alive.find((c) => c.id === roomA)?.name ?? 'A';
          const nB = alive.find((c) => c.id === roomB)?.name ?? 'B';
          setPending({ title: 'Force Roommates', message: `Move ${nA} and ${nB} together inside ${house.name}?`, confirmLabel: 'Force Roommates', run: () => onUpdateCity(simGodForceRoommates(city, roomA, roomB, house.id)) });
        }} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 disabled:opacity-40 cursor-pointer">
          Force Roommates Here
        </button>
      </div>

      {pending && <ConfirmModal title={pending.title} message={pending.message} confirmLabel={pending.confirmLabel} onConfirm={() => { pending.run(); setPending(null); }} onCancel={() => setPending(null)} />}
    </section>
  );
}
