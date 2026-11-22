// SharityTrendingPanel.tsx — Last-7-day Top 10 hashtags panel with rising/falling indicators

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { TrendingHashtag } from './sharityTrending';

interface SharityTrendingPanelProps {
  items: TrendingHashtag[];
  activeHashtag: string | null;
  onSelectHashtag: (tag: string | null) => void;
}

export function SharityTrendingPanel({
  items,
  activeHashtag,
  onSelectHashtag,
}: SharityTrendingPanelProps) {
  return (
    <aside className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-3 h-fit">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-slate-100">Trending (Last 7 Days)</h3>
        {activeHashtag && (
          <button
            type="button"
            onClick={() => onSelectHashtag(null)}
            className="text-[11px] text-amber-300 hover:underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-slate-400 py-2">
          No hashtags trending yet. Tags appear as citizens react to city events.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/70">
          {items.map((item, idx) => {
            const active = activeHashtag === item.tag;
            return (
              <button
                key={item.tag}
                type="button"
                onClick={() => onSelectHashtag(active ? null : item.tag)}
                className={`w-full flex items-center justify-between gap-2 py-2 px-2 rounded text-left transition-colors cursor-pointer ${
                  active ? 'bg-amber-500/15 text-amber-200' : 'hover:bg-slate-800/50 text-slate-200'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500 font-mono">#{idx + 1} Trending</div>
                  <div className="font-mono text-xs font-medium truncate">{item.tag}</div>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs tabular-nums shrink-0">
                  <span className="text-slate-300">{item.count}</span>
                  {item.trend === 'up' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-label="Rising" />
                  ) : item.trend === 'down' ? (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" aria-label="Falling" />
                  ) : (
                    <Minus className="w-3.5 h-3.5 text-slate-500" aria-label="Steady" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}
