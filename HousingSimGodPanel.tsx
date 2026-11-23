// HousingSimGodPanel.tsx — All 8 SimGod Housing powers with explicit confirmation prompts

import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { formatDelta } from './formatters';
import {
  simGodChangeCondition, simGodChangeRent, simGodCondemnHouse, simGodEvictCitizen,
  simGodHomelessnessWave, simGodMoveCitizen, simGodTransferOwner, simGodVacateHouse,
} from './housingSimGod';
import type { House } from './housingTypes';
import type { CityState } from './types';

interface HousingSimGodPanelProps {
  city: CityState;
  house: House;
  onUpdateCity: (next: CityState) => void;
}

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  run: () => void;
}

export function HousingSimGodPanel({ city, house, onUpdateCity }: HousingSimGodPanelProps) {
  const alive = city.citizens.filter((c) => c.alive);
  const occupants = alive.filter((c) => house.occupantIds.includes(c.id));
  const candidates = alive.filter((c) => !house.occupantIds.includes(c.id));

  const [moveCitizenId, setMoveCitizenId] = useState(candidates[0]?.id ?? '');
  const [evictCitizenId, setEvictCitizenId] = useState(occupants[0]?.id ?? alive.find((c) => c.homeId)?.id ?? '');
  const [rentInput, setRentInput] = useState(String(house.rentPrice));
  const [condInput, setCondInput] = useState(String(house.condition));
  const [ownerInput, setOwnerInput] = useState<string>(house.ownerId);
  const [waveCount, setWaveCount] = useState('3');
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  return (
    <section className="bg-[#111827] border border-amber-500/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-amber-300">SimGod Housing Controls</h3>
        <span className="text-[11px] text-slate-400">All actions require confirmation</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <select value={moveCitizenId} onChange={(e) => setMoveCitizenId(e.target.value)} className="flex-1 min-w-0 bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-200">
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" disabled={!moveCitizenId || house.condemned} onClick={() => {
            const name = alive.find((c) => c.id === moveCitizenId)?.name ?? 'Citizen';
            setPending({ title: 'Move Citizen Here', message: `Relocate ${name} into ${house.name}?`, confirmLabel: 'Move Citizen', run: () => onUpdateCity(simGodMoveCitizen(city, moveCitizenId, house.id)) });
          }} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer">
            Move Citizen
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select value={evictCitizenId} onChange={(e) => setEvictCitizenId(e.target.value)} className="flex-1 min-w-0 bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-200">
            {(occupants.length > 0 ? occupants : alive.filter((c) => c.homeId)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" disabled={!evictCitizenId} onClick={() => {
            const name = alive.find((c) => c.id === evictCitizenId)?.name ?? 'Citizen';
            setPending({ title: 'Evict Citizen', message: `Immediately evict ${name} from their home (drops 40% household stock)?`, confirmLabel: 'Evict', run: () => onUpdateCity(simGodEvictCitizen(city, evictCitizenId)) });
          }} className="px-3 py-1.5 rounded bg-rose-950/70 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer">
            Evict Citizen
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input type="number" min={20} step={10} value={rentInput} onChange={(e) => setRentInput(e.target.value)} className="w-28 bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" />
          <button type="button" onClick={() => {
            const val = Math.max(20, Number(rentInput) || house.rentPrice);
            setPending({ title: 'Change Monthly Rent', message: `Set ${house.name} monthly rent to ${formatDelta(val)}?`, confirmLabel: 'Apply Rent', run: () => onUpdateCity(simGodChangeRent(city, house.id, val)) });
          }} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 whitespace-nowrap shrink-0 cursor-pointer">
            Change Rent
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input type="number" min={1} max={100} value={condInput} onChange={(e) => setCondInput(e.target.value)} className="w-28 bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" />
          <button type="button" onClick={() => {
            const val = Math.min(100, Math.max(1, Number(condInput) || house.condition));
            setPending({ title: 'Set House Condition', message: `Set ${house.name} condition to ${val}/100?`, confirmLabel: 'Update Condition', run: () => onUpdateCity(simGodChangeCondition(city, house.id, val)) });
          }} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 whitespace-nowrap shrink-0 cursor-pointer">
            Set Condition
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select value={ownerInput} onChange={(e) => setOwnerInput(e.target.value)} className="flex-1 min-w-0 bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-200">
            <option value="gov">Government</option>
            {alive.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" onClick={() => {
            const lbl = ownerInput === 'gov' ? 'Government' : alive.find((c) => c.id === ownerInput)?.name ?? ownerInput;
            setPending({ title: 'Transfer Ownership', message: `Transfer ${house.name} ownership to ${lbl}?`, confirmLabel: 'Transfer Owner', run: () => onUpdateCity(simGodTransferOwner(city, house.id, ownerInput)) });
          }} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 whitespace-nowrap shrink-0 cursor-pointer">
            Transfer Owner
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input type="number" min={1} max={15} value={waveCount} onChange={(e) => setWaveCount(e.target.value)} className="w-16 bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" />
          <button type="button" onClick={() => {
            const cnt = Math.max(1, Math.min(15, Number(waveCount) || 3));
            setPending({ title: 'Trigger Homelessness Wave', message: `Evict ${cnt} housed residents across Vij to simulate a displacement wave?`, confirmLabel: 'Trigger Wave', run: () => onUpdateCity(simGodHomelessnessWave(city, cnt)) });
          }} className="px-3 py-1.5 rounded bg-rose-950/70 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 whitespace-nowrap shrink-0 cursor-pointer">
            Homelessness Wave
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <button type="button" disabled={house.occupantIds.length === 0} onClick={() => setPending({ title: 'Vacate House', message: `Clear all ${house.occupantIds.length} occupant(s) from ${house.name}?`, confirmLabel: 'Vacate House', run: () => onUpdateCity(simGodVacateHouse(city, house.id)) })} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 cursor-pointer">
          Vacate House
        </button>
        <button type="button" disabled={house.condemned} onClick={() => setPending({ title: 'Condemn House', message: `Condemn ${house.name} (condition 0, evicts all occupants)?`, confirmLabel: 'Condemn House', run: () => onUpdateCity(simGodCondemnHouse(city, house.id)) })} className="px-3 py-1.5 rounded bg-rose-950/70 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 disabled:opacity-40 cursor-pointer">
          Condemn House
        </button>
      </div>

      {pending && (
        <ConfirmModal title={pending.title} message={pending.message} confirmLabel={pending.confirmLabel} onConfirm={() => { pending.run(); setPending(null); }} onCancel={() => setPending(null)} />
      )}
    </section>
  );
}
