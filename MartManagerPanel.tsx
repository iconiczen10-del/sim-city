// MartManagerPanel.tsx — Manager card, reputation meter, category moods, and price/decision details

import { useState } from 'react';
import { SHOPPING_CATEGORIES } from './constants';
import { CATEGORY_LABELS, MOOD_META } from './formatters';
import { MartDecisionLogPanel } from './MartDecisionLogPanel';
import { MartManagerCard } from './MartManagerCard';
import type { MartState, ShoppingCategory } from './martTypes';
import type { Citizen } from './types';

interface MartManagerPanelProps {
  mart: MartState;
  manager: Citizen | null;
  onSelectCitizen: (citizenId: string) => void;
  onFireManager: () => void;
}

export function MartManagerPanel({ mart, manager, onSelectCitizen, onFireManager }: MartManagerPanelProps) {
  const [selectedCat, setSelectedCat] = useState<ShoppingCategory>('food');
  const repColor = mart.reputation >= 65 ? 'bg-emerald-400' : mart.reputation >= 40 ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className="space-y-4">
      <MartManagerCard
        manager={manager}
        performance={mart.managerPerformance}
        lowPerfMonths={mart.managerLowPerfMonths}
        panicFreezeDays={mart.panicFreezeDaysLeft}
        onSelectCitizen={onSelectCitizen}
        onFireManager={onFireManager}
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">Store Reputation &amp; AI</h3>
            <span className="font-mono text-sm font-semibold text-slate-100">{mart.reputation.toFixed(1)} / 100</span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-sm overflow-hidden">
            <div className={`h-full ${repColor} transition-all`} style={{ width: `${mart.reputation}%` }} />
          </div>
          <div className="text-xs text-slate-400 space-y-1 pt-1">
            <div className="flex justify-between">
              <span>CEO Direction Style</span>
              <span className="font-mono capitalize text-slate-200">{mart.personality.style}</span>
            </div>
            <div className="flex justify-between">
              <span>Profit Lean</span>
              <span className="font-mono text-slate-200">
                {mart.personality.greedyLean > 0 ? `+${mart.personality.greedyLean} Greedy` : mart.personality.greedyLean < 0 ? `${mart.personality.greedyLean} Generous` : 'Neutral (0)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Late Supplier Rate</span>
              <span className="font-mono text-slate-200">
                {mart.totalDeliveryCount > 0 ? `${Math.round((mart.lateDeliveryCount / mart.totalDeliveryCount) * 100)}%` : '0%'} ({mart.lateDeliveryCount} late)
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-8 bg-[#111827] border border-slate-800/90 rounded-lg p-4">
          <h3 className="font-display text-sm font-semibold text-slate-100 mb-3">Category Moods &amp; Margins</h3>
          <div className="grid grid-cols-2 gap-3">
            {SHOPPING_CATEGORIES.map((cat) => {
              const cm = mart.categoryMoods[cat];
              const meta = MOOD_META[cm.mood];
              const active = selectedCat === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`text-left p-3 rounded-md border transition-colors cursor-pointer ${
                    active ? 'bg-[#0c1220] border-amber-500/60' : 'bg-[#0c1220] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100">{CATEGORY_LABELS[cat]}</span>
                    <span className={`font-mono text-xs font-semibold ${meta.textClass}`}>
                      {meta.label} ({cm.marginPct >= 0 ? `+${cm.marginPct}%` : `${cm.marginPct}%`})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 truncate">
                    {cm.reason} · {cm.daysRemaining}d sticky
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <MartDecisionLogPanel mart={mart} selectedCat={selectedCat} />
    </div>
  );
}
