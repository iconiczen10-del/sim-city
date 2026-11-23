// CitizenEmotionChart.tsx — 60-day multi-series SVG emotion history chart

import { useState } from 'react';
import { EMOTION_META } from './citizenEmotions';
import type { EmotionId, EmotionSnapshot } from './citizenRealTypes';

interface CitizenEmotionChartProps {
  history: EmotionSnapshot[];
}

const DEFAULT_SELECTED: EmotionId[] = ['joy', 'sadness', 'anger', 'fear', 'hope'];

export function CitizenEmotionChart({ history }: CitizenEmotionChartProps) {
  const [selected, setSelected] = useState<EmotionId[]>(DEFAULT_SELECTED);

  function toggleEmotion(id: EmotionId) {
    setSelected((prev) => (prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]));
  }

  const width = 620;
  const height = 160;
  const padX = 24;
  const padY = 14;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;
  const zeroY = padY + plotH / 2;

  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-200">60-Day Emotion Trajectory (-100 to +100)</span>
        <div className="flex flex-wrap items-center gap-2">
          {EMOTION_META.map((em) => {
            const on = selected.includes(em.id);
            return (
              <button
                key={em.id}
                type="button"
                onClick={() => toggleEmotion(em.id)}
                className={`text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-opacity ${on ? 'text-slate-100 font-medium bg-slate-800/80' : 'text-slate-500 opacity-60 hover:opacity-100'}`}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: em.color }} />
                {em.label}
              </button>
            );
          })}
        </div>
      </div>

      {history.length < 2 ? (
        <div className="py-10 text-center text-slate-500">Advance 2+ days to plot emotion history.</div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 overflow-visible" role="img" aria-label="60-day citizen emotions chart">
          <line x1={padX} y1={zeroY} x2={width - padX} y2={zeroY} stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
          <text x={2} y={padY + 4} fill="#64748b" fontSize="9" fontFamily="monospace">+100</text>
          <text x={8} y={zeroY + 3} fill="#64748b" fontSize="9" fontFamily="monospace">0</text>
          <text x={2} y={height - padY + 3} fill="#64748b" fontSize="9" fontFamily="monospace">-100</text>

          {EMOTION_META.filter((em) => selected.includes(em.id)).map((em) => {
            const pts = history
              .map((snap, idx) => {
                const x = padX + (idx / Math.max(1, history.length - 1)) * plotW;
                const val = snap.values[em.id] ?? 0;
                const y = zeroY - (val / 100) * (plotH / 2);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');
            return <polyline key={em.id} fill="none" stroke={em.color} strokeWidth="1.8" strokeLinejoin="round" points={pts} />;
          })}
        </svg>
      )}
    </div>
  );
}
