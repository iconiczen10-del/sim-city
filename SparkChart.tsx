// SparkChart.tsx — Lightweight SVG time-series chart with baseline grid and latest readout

import { useState } from 'react';

export interface ChartPoint {
  label: string;
  value: number;
}

interface SparkChartProps {
  title: string;
  points: ChartPoint[];
  strokeColor: string;
  formatValue: (val: number) => string;
  fixedDomain?: [number, number];
}

export function SparkChart({
  title,
  points,
  strokeColor,
  formatValue,
  fixedDomain,
}: SparkChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const w = 300;
  const h = 92;
  const padX = 8;
  const padY = 10;

  const vals = points.map((p) => p.value);
  const rawMin = fixedDomain ? fixedDomain[0] : Math.min(...vals);
  const rawMax = fixedDomain ? fixedDomain[1] : Math.max(...vals);
  const minVal = rawMin;
  const maxVal = rawMax === rawMin ? rawMin + 1 : rawMax;

  const coords = points.map((p, idx) => {
    const x =
      points.length === 1
        ? w / 2
        : padX + (idx / (points.length - 1)) * (w - padX * 2);
    const ratio = (p.value - minVal) / (maxVal - minVal);
    const y = h - padY - ratio * (h - padY * 2);
    return { x, y, ...p };
  });

  const pathD = coords
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  const activePt = hoverIdx !== null && coords[hoverIdx] ? coords[hoverIdx] : coords[coords.length - 1];

  return (
    <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-medium text-slate-300">{title}</span>
        <span className="font-mono text-xs font-semibold text-slate-100">
          {activePt ? `${formatValue(activePt.value)} (${activePt.label})` : '—'}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-24 overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="#1e293b" strokeDasharray="2 3" />
        <line x1={padX} y1={h / 2} x2={w - padX} y2={h / 2} stroke="#1e293b" strokeDasharray="2 3" />
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#1e293b" />

        {coords.length > 1 && (
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
        )}

        {coords.map((pt, idx) => (
          <g key={`${pt.label}_${idx}`}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoverIdx === idx ? 4 : coords.length === 1 ? 4 : 2.2}
              fill={strokeColor}
            />
            <rect
              x={pt.x - 8}
              y={0}
              width={16}
              height={h}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIdx(idx)}
            />
          </g>
        ))}
      </svg>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
        <span>Min {formatValue(rawMin)}</span>
        <span>Max {formatValue(rawMax)}</span>
      </div>
    </div>
  );
}
