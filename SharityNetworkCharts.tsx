// SharityNetworkCharts.tsx — Posts per day chart, topic mix bar, and city voice sentiment summary

import { computeSentimentBreakdown, computeTopicMix } from './sharityTrending';
import { SparkChart } from './SparkChart';
import type { CityState } from './types';

export function SharityNetworkCharts({ city }: { city: CityState }) {
  const stats = city.sharity.dailyStats ?? [];
  const postVolumePoints = stats.map((s) => ({ label: s.dateLabel, value: s.count }));
  const sentimentPoints = stats.map((s) => ({
    label: s.dateLabel,
    value: s.count > 0 ? Math.round(((s.pos - s.neg) / s.count) * 100) : 0,
  }));
  const mix = computeTopicMix(city.sharity.posts).slice(0, 8);
  const sent = computeSentimentBreakdown(city.sharity);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {postVolumePoints.length > 0 ? (
          <SparkChart title="Posts Per Day" points={postVolumePoints} strokeColor="#fbbf24" formatValue={(v) => `${Math.round(v)} posts`} />
        ) : (
          <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 text-xs text-slate-400">Posts Per Day chart populates once daily posts begin.</div>
        )}
        {sentimentPoints.length > 0 ? (
          <SparkChart title="Voice Sentiment Over Time (-100 to +100)" points={sentimentPoints} strokeColor="#34d399" formatValue={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}`} fixedDomain={[-100, 100]} />
        ) : (
          <div className="bg-[#0c1220] border border-slate-800/80 rounded-md p-4 text-xs text-slate-400">City sentiment trend populates once posts appear.</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-display font-semibold text-slate-100">City Sentiment Split</span>
            <span className="font-mono tabular-nums text-slate-400">{sent.total} posts · net {sent.netScore >= 0 ? `+${sent.netScore}` : sent.netScore}</span>
          </div>
          {sent.total > 0 ? (
            <>
              <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-800">
                <div className="bg-emerald-400 h-full" style={{ width: `${(sent.pos / sent.total) * 100}%` }} />
                <div className="bg-slate-400 h-full" style={{ width: `${(sent.neu / sent.total) * 100}%` }} />
                <div className="bg-rose-400 h-full" style={{ width: `${(sent.neg / sent.total) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300">
                <span className="text-emerald-300">Positive {sent.pos}</span>
                <span className="text-slate-300">Neutral {sent.neu}</span>
                <span className="text-rose-300">Negative {sent.neg}</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400">No voice sentiment recorded yet.</div>
          )}
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="font-display text-xs font-semibold text-slate-100">Topic Mix (Top Active Categories)</div>
          {mix.length === 0 ? (
            <div className="text-xs text-slate-400">No topic distribution yet.</div>
          ) : (
            <div className="space-y-1.5">
              {mix.map((m) => (
                <div key={m.topic} className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>{m.label}</span>
                    <span className="font-mono tabular-nums text-slate-400">{m.count} ({m.pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
