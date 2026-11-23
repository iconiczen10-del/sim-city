// HousingMarketDynamicsPanel.tsx — District vacancy/rent trends and multi-type buying price trend chart

import { formatDelta } from './formatters';
import { DISTRICTS, DISTRICT_ORDER, HOUSE_SPECS } from './housingCatalog';
import type { HomeType } from './cityBaseTypes';
import type { CityState } from './types';

interface HousingMarketDynamicsPanelProps {
  city: CityState;
}

const SERIES: { type: HomeType; color: string; label: string }[] = [
  { type: 'mansion', color: '#fbbf24', label: HOUSE_SPECS.mansion.label },
  { type: 'villa', color: '#34d399', label: HOUSE_SPECS.villa.label },
  { type: 'apartment', color: '#38bdf8', label: HOUSE_SPECS.apartment.label },
  { type: 'small_flat', color: '#a78bfa', label: HOUSE_SPECS.small_flat.label },
  { type: 'shared_room', color: '#fb7185', label: 'Boarding (100x)' },
];

export function HousingMarketDynamicsPanel({ city }: HousingMarketDynamicsPanelProps) {
  const metrics = city.housing.districtMetrics;
  const pts = city.housing.typePriceHistory ?? [];
  const allVals = pts.flatMap((p) => SERIES.map((s) => p[s.type]));
  const maxVal = Math.max(1000, ...allVals);
  const w = 640;
  const h = 150;

  const polylineFor = (t: HomeType) => {
    if (pts.length === 0) return '';
    return pts
      .map((p, idx) => {
        const x = pts.length === 1 ? w / 2 : 12 + (idx / (pts.length - 1)) * (w - 24);
        const y = h - 14 - (p[t] / maxVal) * (h - 28);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="space-y-5">
      <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-slate-100">District Vacancy & Monthly Rent Dynamics</h2>
          <span className="text-xs text-slate-400">Low vacancy (&lt;10%) pushes rents up +2–5%/mo · High vacancy (&gt;30%) cools rents</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {DISTRICT_ORDER.map((dist) => {
            const m = metrics?.[dist];
            const trendArrow = m?.rentTrend === 'up' ? '↑' : m?.rentTrend === 'down' ? '↓' : '→';
            const trendColor = m?.rentTrend === 'up' ? 'text-rose-400' : m?.rentTrend === 'down' ? 'text-emerald-300' : 'text-slate-400';
            return (
              <div key={dist} className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3 space-y-1.5 text-xs">
                <div className="font-medium text-slate-100">{DISTRICTS[dist].label}</div>
                <div className="text-[11px] text-slate-500">{DISTRICTS[dist].summary}</div>
                <div className="flex items-baseline justify-between pt-1 font-mono tabular-nums">
                  <span className="text-slate-400">Vacancy</span>
                  <span className={m && m.vacancyRate < 10 ? 'text-rose-300' : 'text-slate-100'}>{m?.vacancyRate ?? 0}%</span>
                </div>
                <div className="flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-slate-400">Avg Rent</span>
                  <span className="text-amber-300">{formatDelta(m?.avgRent ?? 0)}/mo</span>
                </div>
                <div className={`flex items-baseline justify-between font-mono tabular-nums ${trendColor}`}>
                  <span>Trend</span>
                  <span>{trendArrow} {m ? `${m.lastDriftPct > 0 ? '+' : ''}${m.lastDriftPct}%` : '0%'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-slate-100">Property Buy-Price Trends by Type ({pts.length} mo)</h2>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
            {SERIES.map((s) => (
              <span key={s.type} className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 inline-block" style={{ backgroundColor: s.color }} />
                <span>{s.label}: <strong className="font-mono">{formatDelta(pts[pts.length - 1]?.[s.type] ?? 0)}</strong></span>
              </span>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40 bg-[#0c1220] border border-slate-800/80 rounded-md" role="img" aria-label="Property buying prices over time">
          {SERIES.map((s) => (
            <polyline key={s.type} fill="none" stroke={s.color} strokeWidth={2} points={polylineFor(s.type)} />
          ))}
        </svg>
      </section>
    </div>
  );
}
