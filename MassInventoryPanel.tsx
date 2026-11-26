// MassInventoryPanel.tsx — Confirmed SimGod mass inventory action bar on the Citizens tab

import { useMemo, useState } from 'react';
import { LOSS_CAUSE_LABELS } from './citizenInspectorLabels';
import type { LossCause } from './citizenInspectorTypes';
import type { MassTargetScope } from './simgodTypes';
import { LIVING_STANDARDS, SHOPPING_CATEGORIES, TIER_ORDER } from './constants';
import { CATEGORY_LABELS, formatDelta, STANDARD_LABELS } from './formatters';
import type { LivingStandard, ShoppingCategory } from './martTypes';
import { executeMassInventoryAction, previewMassInventoryImpact } from './simgodInventoryActions';
import type { CityState, RoleLevel, TierId } from './types';

interface MassInventoryPanelProps {
  city: CityState;
  onUpdateCity: (next: CityState) => void;
}

const ROLES: RoleLevel[] = ['CEO', 'Executive', 'Manager', 'Team Lead', 'Staff', 'Entry', 'Unemployed', 'Retired'];

export function MassInventoryPanel({ city, onUpdateCity }: MassInventoryPanelProps) {
  const living = useMemo(() => city.citizens.filter((c) => c.alive), [city.citizens]);
  const [scope, setScope] = useState<MassTargetScope>('tier');
  const [citizenId, setCitizenId] = useState(() => living[0]?.id ?? '');
  const [tier, setTier] = useState<TierId>('T5');
  const [role, setRole] = useState<RoleLevel>('Entry');
  const [randomCount, setRandomCount] = useState(5);
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [cat, setCat] = useState<ShoppingCategory | 'all'>('food');
  const [std, setStd] = useState<LivingStandard>(2);
  const [qty, setQty] = useState(6);
  const [cause, setCause] = useState<LossCause>('flood');
  const [armed, setArmed] = useState(false);

  const preview = useMemo(
    () => previewMassInventoryImpact(city, { action, scope, citizenId, tier, role, randomCount, category: cat, standard: std, quantity: qty }),
    [city, action, scope, citizenId, tier, role, randomCount, cat, std, qty]
  );

  function handleConfirm() {
    onUpdateCity(executeMassInventoryAction(city, {
      action, targetIds: preview.targetIds, category: cat, standard: std, quantity: qty, removeAll: cat === 'all', cause,
    }));
    setArmed(false);
  }

  return (
    <div className="bg-[#111827] border border-amber-500/35 rounded-lg p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-sm font-semibold text-amber-300">SimGod Mass Inventory Actions</span>
        <span className="font-mono text-slate-300">
          Preview: affects <span className="text-slate-100 font-semibold">{preview.count}</span> citizen(s), total value{' '}
          <span className="text-amber-300 font-semibold">{formatDelta(preview.totalValue)}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <select value={scope} onChange={(e) => { setScope(e.target.value as MassTargetScope); setArmed(false); }} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
          <option value="single">One Citizen</option>
          <option value="tier">By Tier</option>
          <option value="role">By Role</option>
          <option value="all">All Living Citizens</option>
          <option value="random">Random N Citizens</option>
        </select>

        {scope === 'single' && (
          <select value={citizenId} onChange={(e) => setCitizenId(e.target.value)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
            {living.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {scope === 'tier' && (
          <select value={tier} onChange={(e) => setTier(e.target.value as TierId)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
            {TIER_ORDER.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {scope === 'role' && (
          <select value={role} onChange={(e) => setRole(e.target.value as RoleLevel)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {scope === 'random' && (
          <input type="number" min={1} max={50} value={randomCount} onChange={(e) => setRandomCount(Math.max(1, Number(e.target.value) || 1))} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" title="Random citizen count" />
        )}
        {scope === 'all' && <div className="bg-[#090d16] border border-slate-800/60 rounded px-2 py-1.5 text-slate-400">All {living.length} living</div>}

        <select value={action} onChange={(e) => { setAction(e.target.value as 'add' | 'remove'); if (e.target.value === 'add' && cat === 'all') setCat('food'); setArmed(false); }} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
          <option value="add">Add Items</option>
          <option value="remove">Destroy / Remove</option>
        </select>

        <select value={cat} onChange={(e) => setCat(e.target.value as ShoppingCategory | 'all')} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
          {SHOPPING_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          {action === 'remove' && <option value="all">All Categories</option>}
        </select>

        {action === 'add' ? (
          <select value={std} onChange={(e) => setStd(Number(e.target.value) as LivingStandard)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
            {LIVING_STANDARDS.map((l) => <option key={l} value={l}>L{l} · {STANDARD_LABELS[l]}</option>)}
          </select>
        ) : (
          <select value={cause} onChange={(e) => setCause(e.target.value as LossCause)} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 text-slate-100">
            {(Object.keys(LOSS_CAUSE_LABELS) as LossCause[]).map((k) => <option key={k} value={k}>{LOSS_CAUSE_LABELS[k]}</option>)}
          </select>
        )}

        <input type="number" min={1} max={100} value={qty} disabled={action === 'remove' && cat === 'all'} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="bg-[#090d16] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-100" />
      </div>

      {!armed ? (
        <button type="button" disabled={preview.count === 0} onClick={() => setArmed(true)} className="px-3.5 py-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 font-medium disabled:opacity-40 cursor-pointer">
          Review Mass Action ({preview.count} citizens · {formatDelta(preview.totalValue)})
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#090d16] border border-amber-500/40 rounded px-3 py-2">
          <span className="text-slate-200">
            Confirm: affects {preview.count} citizen(s), total value {formatDelta(preview.totalValue)}
            {action === 'remove' ? ` (perceived: ${LOSS_CAUSE_LABELS[cause]})` : ''}.
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setArmed(false)} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 cursor-pointer">Cancel</button>
            <button type="button" onClick={handleConfirm} className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-semibold cursor-pointer">Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}
