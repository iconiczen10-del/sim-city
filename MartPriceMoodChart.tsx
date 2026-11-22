// MartPriceMoodChart.tsx — Price index history chart with segments colored by Mart mood

import { useState } from 'react';
import { MOOD_META } from './formatters';
import type { MarginMood, MartHistoryPoint } from './martTypes';

interface MartPriceMoodChartProps {
  history: MartHistoryPoint[];
}

const LEGEND_MOODS: MarginMood[] = ['clearance', 'generous', 'good', 'typical', 'greedy', 'gouging'];

export function MartPriceMoodChart({ history }: MartPriceMoodChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const w = 440;
  const h = 110;
  const padX = 10;
  const padY = 12;

  const vals = history.map((pt) => pt.avgPriceIndex);
  const minVal = Math.min(80, ...vals);
  const maxVal = Math.max(120, ...vals);
  const span = maxVal === minVal ? 1 : maxVal - minVal;

  const coords = history.map((pt, i) => {
    const x = history.length === 1 ? w / 2 : padX + (i / (history.length - 1)) * (w - padX * 2);
    const y = h - padY - ((pt.avgPriceIndex - minVal) / span) * (h - padY * 2);
    return { x, y, ...pt };
  });

  const active = hoverIdx !== null && coords[hoverIdx] ? coords[hoverIdx] : coords[coords.length - 1];

  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-medium text-slate-300">Price Index by Mart Mood (100 = Base)</span>
        {active && (
          <span className={`font-mono text-xs font-semibold ${MOOD_META[active.dominantMood].textClass}`}>
            {active.avgPriceIndex.toFixed(1)} · {MOOD_META[active.dominantMood].label} ({active.label})
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28 overflow-visible" onMouseLeave={() => setHoverIdx(null)}>
        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="#1e293b" strokeDasharray="2 3" />
        <line x1={padX} y1={h / 2} x2={w - padX} y2={h / 2} stroke="#1e293b" strokeDasharray="2 3" />
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#1e293b" />

        {coords.slice(1).map((pt, idx) => {
          const prev = coords[idx];
          return (
            <line
              key={`${pt.label}_${idx}`}
              x1={prev.x}
              y1={prev.y}
              x2={pt.x}
              y2={pt.y}
              stroke={MOOD_META[pt.dominantMood].color}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          );
        })}

        {coords.map((pt, idx) => (
          <g key={`dot_${idx}`}>
            <circle cx={pt.x} cy={pt.y} r={hoverIdx === idx ? 4 : 2.3} fill={MOOD_META[pt.dominantMood].color} />
            <rect x={pt.x - 6} y={0} width={12} height={h} fill="transparent" className="cursor-crosshair" onMouseEnter={() => setHoverIdx(idx)} />
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/60">
        <div className="flex flex-wrap items-center gap-3 text-[10px]">
          {LEGEND_MOODS.map((m) => (
            <span key={m} className="inline-flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-xs inline-block" style={{ backgroundColor: MOOD_META[m].color }} />
              {MOOD_META[m].label}
            </span>
          ))}
        </div>
        <span className="font-mono text-[10px] text-slate-500">
          {minVal.toFixed(0)}–{maxVal.toFixed(0)}
        </span>
      </div>
    </div>
  );
}
