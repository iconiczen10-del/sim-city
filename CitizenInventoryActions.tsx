// CitizenInventoryActions.tsx — Confirmed SimGod powers on a citizen's Inventory tab

import { useMemo, useState } from 'react';
import { LOSS_CAUSE_LABELS } from './citizenInspectorLabels';
import type { LossCause } from './citizenInspectorTypes';
import { LIVING_STANDARDS, SHOPPING_CATEGORIES } from './constants';
import { CATEGORY_LABELS, formatDelta, STANDARD_LABELS } from './formatters';
import type { LivingStandard, ShoppingCategory } from './martTypes';
import { getCitizenCategoryValue, getUnitValue } from './simgodInventory';
import { executeMassInventoryAction } from './simgodInventoryActions';
import { editCitizenInventoryDirect } from './simgodInventoryEdit';
import { applySimGodInventoryTransfer } from './simgodInventoryTransfer';
import type { Citizen, CityState } from './types';

interface CitizenInventoryActionsProps {
  citizen: Citizen;
  city: CityState;
  onUpdateCity: (next: CityState) => void;
}

type ActionMode = 'add' | 'remove' | 'transfer' | 'edit';

export function CitizenInventoryActions({ citizen, city, onUpdateCity }: CitizenInventoryActionsProps) {
  const [mode, setMode] = useState<ActionMode>('add');
  const [cat, setCat] = useState<ShoppingCategory | 'all'>('food');
  const [std, setStd] = useState<LivingStandard>(2);
  const [qty, setQty] = useState(5);
  const [cause, setCause] = useState<LossCause>('fire');
  const [removeAll, setRemoveAll] = useState(false);
  const [xferMode, setXferMode] = useState<'gift' | 'theft'>('gift');
  const [targetId, setTargetId] = useState(() => city.citizens.find((c) => c.alive && c.id !== citizen.id)?.id ?? '');
  const [editIdx, setEditIdx] = useState(0);
  const [editCond, setEditCond] = useState(80);
  const [armed, setArmed] = useState(false);

  const otherLiving = useMemo(() => city.citizens.filter((c) => c.alive && c.id !== citizen.id), [city.citizens, citizen.id]);
  const safeCat: ShoppingCategory = cat === 'all' ? 'food' : cat;

  const previewText = useMemo(() => {
    if (mode === 'add') return `Add ${qty}x L${std} ${CATEGORY_LABELS[safeCat]} (value ${formatDelta(qty * getUnitValue(safeCat, std))})`;
    if (mode === 'remove') {
      const owned = getCitizenCategoryValue(citizen, cat);
      const val = removeAll || cat === 'all' ? owned : Math.min(owned, qty * getUnitValue(safeCat, std));
      return `Remove ${removeAll ? 'ALL' : qty} ${cat === 'all' ? 'items' : CATEGORY_LABELS[cat]} · Perceived: ${LOSS_CAUSE_LABELS[cause]} · Value ${formatDelta(val)}`;
    }
    if (mode === 'transfer') {
      const rec = otherLiving.find((c) => c.id === targetId)?.name ?? 'Recipient';
      return `${xferMode === 'gift' ? 'Gift' : 'Steal'} up to ${qty}x ${CATEGORY_LABELS[safeCat]} from ${citizen.name} → ${rec}`;
    }
    return `Set ${CATEGORY_LABELS[safeCat]} item #${editIdx + 1} to qty/days=${qty}${safeCat === 'clothes' ? `, cond=${editCond}%` : ''}`;
  }, [mode, qty, std, safeCat, cat, removeAll, citizen, cause, otherLiving, targetId, xferMode, editIdx, editCond]);

  if (!citizen.alive) return null;

  function handleExecute() {
    if (mode === 'add') {
      onUpdateCity(executeMassInventoryAction(city, { action: 'add', targetIds: [citizen.id], category: safeCat, standard: std, quantity: qty, cause }));
    } else if (mode === 'remove') {
      onUpdateCity(executeMassInventoryAction(city, { action: 'remove', targetIds: [citizen.id], category: cat, standard: std, quantity: qty, removeAll, cause }));
    } else if (mode === 'transfer' && targetId) {
      onUpdateCity(applySimGodInventoryTransfer(city, citizen.id, targetId, safeCat, qty, xferMode, xferMode === 'theft' ? 'Unknown Pickpocket' : undefined));
    } else if (mode === 'edit') {
      onUpdateCity(editCitizenInventoryDirect(city, citizen.id, safeCat, editIdx, qty, editCond));
    }
    setArmed(false);
  }

  return (
    <div className="bg-[#0c1220] border border-amber-500/30 rounded-md p-4 space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-amber-300">SimGod Inventory Controls</div>
        <div className="flex gap-1 bg-[#090d16] p-0.5 rounded border border-slate-800">
          {([['add', 'Add'], ['remove', 'Destroy'], ['transfer', 'Steal / Gift'], ['edit', 'Edit Item']] as const).map(([id, lbl]) => (
            <button key={id} type="button" onClick={() => { setMode(id); setArmed(false); }} className={`px-2 py-1 rounded cursor-pointer ${mode === id ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <select value={cat} onChange={(e) => { setCat(e.target.value as ShoppingCategory | 'all'); setArmed(false); }} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
          {SHOPPING_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          {mode === 'remove' && <option value="all">All Categories</option>}
        </select>

        {mode === 'add' && (
          <select value={std} onChange={(e) => setStd(Number(e.target.value) as LivingStandard)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
            {LIVING_STANDARDS.map((l) => <option key={l} value={l}>L{l} · {STANDARD_LABELS[l]}</option>)}
          </select>
        )}

        {mode === 'remove' && (
          <select value={cause} onChange={(e) => setCause(e.target.value as LossCause)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
            {(Object.keys(LOSS_CAUSE_LABELS) as LossCause[]).map((k) => <option key={k} value={k}>{LOSS_CAUSE_LABELS[k]}</option>)}
          </select>
        )}

        {mode === 'transfer' && (
          <>
            <select value={xferMode} onChange={(e) => setXferMode(e.target.value as 'gift' | 'theft')} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
              <option value="gift">Gift to Citizen</option>
              <option value="theft">Steal &amp; Give</option>
            </select>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
              {otherLiving.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.tier})</option>)}
            </select>
          </>
        )}

        {mode === 'edit' && (
          <>
            <input type="number" min={0} max={20} value={editIdx} onChange={(e) => setEditIdx(Math.max(0, Number(e.target.value) || 0))} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" title="Batch / Outfit index (0 = first)" />
            {safeCat === 'clothes' && (
              <input type="number" min={0} max={100} value={editCond} onChange={(e) => setEditCond(Number(e.target.value) || 0)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" title="Condition %" />
            )}
          </>
        )}

        <div className="flex items-center gap-2">
          <input type="number" min={mode === 'edit' ? 0 : 1} max={100} value={qty} disabled={mode === 'remove' && removeAll} onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))} className="w-20 bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" />
          {mode === 'remove' && (
            <label className="flex items-center gap-1 text-slate-300 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={removeAll} onChange={(e) => setRemoveAll(e.target.checked)} className="accent-amber-500" />
              <span>All</span>
            </label>
          )}
        </div>
      </div>

      {!armed ? (
        <button type="button" onClick={() => setArmed(true)} className="px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 font-medium cursor-pointer">
          Preview &amp; Confirm Action
        </button>
      ) : (
        <div className="flex items-center justify-between gap-3 bg-[#090d16] border border-amber-500/40 rounded px-3 py-2">
          <span className="text-slate-200">{previewText}</span>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => setArmed(false)} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer">Cancel</button>
            <button type="button" onClick={handleExecute} className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 cursor-pointer">Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}
