// SharityCityPulsePanel.tsx — Network view City Pulse panel: overall sentiment, top concerns, and active reaction waves

import { computeSentimentBreakdown, computeTrendingHashtags } from './sharityTrending';
import type { CityState } from './types';

interface SharityCityPulsePanelProps {
  city: CityState;
}

export function SharityCityPulsePanel({ city }: SharityCityPulsePanelProps) {
  const sentiment = computeSentimentBreakdown(city.sharity);
  const topConcerns = computeTrendingHashtags(city.sharity.posts, city.totalDays, 6);
  const activeWaves = (city.sharity.cityWaves ?? []).filter((w) => w.endDay >= city.totalDays);
  const alive = city.citizens.filter((c) => c.alive);
  const avgRep = alive.length > 0
    ? (alive.reduce((s, c) => s + (c.socialReputation ?? 50), 0) / alive.length).toFixed(1)
    : '50.0';

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-100">City Pulse</h3>
          <div className="text-xs text-slate-400">Live social mood, trending hashtag concerns, and active multi-day reaction waves</div>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
          <span>Net Tone: <strong className={sentiment.netScore >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{sentiment.netScore >= 0 ? `+${sentiment.netScore}` : sentiment.netScore}</strong></span>
          <span>Avg Social Rep: <strong className="text-amber-300">{avgRep}/100</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1.5">
          <div className="font-medium text-slate-200">Active Reaction Waves ({activeWaves.length})</div>
          {activeWaves.length === 0 ? (
            <div className="text-slate-500 py-2">No city-wide reaction waves active right now.</div>
          ) : (
            <div className="space-y-1.5">
              {activeWaves.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-2 bg-[#0c1220] border border-slate-800/80 rounded px-3 py-2">
                  <div>
                    <div className="font-medium text-slate-100">{w.title}</div>
                    <div className="font-mono text-[11px] text-slate-400">Started {w.dateLabel} · {w.hashtag}</div>
                  </div>
                  <span className="font-mono text-[11px] text-amber-300 shrink-0">{Math.max(1, w.endDay - city.totalDays + 1)}d left</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="font-medium text-slate-200">Top Concerns (Last 7 Days)</div>
          {topConcerns.length === 0 ? (
            <div className="text-slate-500 py-2">No hashtags trending yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {topConcerns.map((t) => (
                <div key={t.tag} className="flex items-center justify-between bg-[#0c1220] border border-slate-800/80 rounded px-2.5 py-1.5 font-mono">
                  <span className="text-sky-300 truncate">{t.tag}</span>
                  <span className="text-slate-300 shrink-0">{t.count} {t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '·'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
