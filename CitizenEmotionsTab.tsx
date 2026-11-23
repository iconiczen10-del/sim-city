// CitizenEmotionsTab.tsx — Display 10 citizen emotions (-100..+100), decay rates, triggers, and 60-day chart

import { CitizenEmotionChart } from './CitizenEmotionChart';
import { EMOTION_META } from './citizenEmotions';
import type { Citizen } from './types';

interface CitizenEmotionsTabProps {
  citizen: Citizen;
}

export function CitizenEmotionsTab({ citizen }: CitizenEmotionsTabProps) {
  const emotions = citizen.emotions;

  return (
    <div className="space-y-4 text-xs">
      <CitizenEmotionChart history={citizen.emotionHistory ?? []} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EMOTION_META.map((meta) => {
          const em = emotions?.[meta.id];
          if (!em) return null;
          const val = Math.round(em.value * 10) / 10;
          const pct = Math.min(50, Math.abs(val) * 0.5);
          const pos = val >= 0;

          return (
            <div key={meta.id} className="bg-[#0c1220] border border-slate-800/80 rounded-md p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span className="font-semibold text-slate-100">{em.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  <span className="text-[11px] text-slate-500">decay {em.decayRate.toFixed(2)}x/d</span>
                  <span className={`font-semibold ${val > 0 ? 'text-emerald-300' : val < 0 ? 'text-rose-300' : 'text-slate-300'}`}>
                    {val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="relative h-2 bg-slate-900 rounded overflow-hidden border border-slate-800/70">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600/80 z-10" />
                <div
                  className="absolute top-0 bottom-0 transition-all"
                  style={{
                    left: pos ? '50%' : `${50 - pct}%`,
                    width: `${pct}%`,
                    backgroundColor: meta.color,
                  }}
                />
              </div>

              {em.triggers.length === 0 ? (
                <div className="text-[11px] text-slate-500">No recent triggers recorded.</div>
              ) : (
                <div className="space-y-1 pt-0.5">
                  {em.triggers.slice(0, 5).map((t, idx) => (
                    <div key={`${meta.id}_t_${idx}`} className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="truncate">{t.summary}</span>
                      <span className={`font-mono tabular-nums shrink-0 ${t.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {t.delta >= 0 ? `+${t.delta}` : t.delta} · {t.dateLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
