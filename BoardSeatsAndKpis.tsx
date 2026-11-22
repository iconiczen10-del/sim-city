// BoardSeatsAndKpis.tsx — Key metrics strip and 4-seat board member stance cards for Vij Industries

import type { BoardMetrics } from './boardSeats';
import type { BoardSeatInfo } from './boardTypes';
import type { Company } from './companyTypes';
import { formatDelta } from './formatters';

interface BoardSeatsAndKpisProps {
  comp: Company | undefined;
  liveMetrics: BoardMetrics | null;
  displaySeats: BoardSeatInfo[];
  onSelectCitizen: (citizenId: string) => void;
}

export function BoardSeatsAndKpis({
  comp,
  liveMetrics,
  displaySeats,
  onSelectCitizen,
}: BoardSeatsAndKpisProps) {
  const streak = comp ? (comp.positiveProfitStreak > 0 ? `+${comp.positiveProfitStreak}` : `-${comp.negativeProfitStreak}`) : '0';
  const kpis = [
    { label: 'Company Cash', val: formatDelta(comp?.cash ?? 0), cls: (comp?.cash ?? 0) < 0 ? 'text-rose-300' : 'text-amber-300' },
    { label: 'Runway', val: `${liveMetrics?.runwayMonths.toFixed(1) ?? '0.0'} mo`, cls: 'text-slate-100' },
    { label: 'Payroll Ratio', val: `${liveMetrics?.payrollRatio ?? 0}%`, cls: (liveMetrics?.payrollRatio ?? 0) > 95 ? 'text-rose-300' : 'text-slate-100' },
    { label: 'Profit Streak', val: `${streak} mo`, cls: (comp?.positiveProfitStreak ?? 0) > 0 ? 'text-emerald-300' : 'text-rose-300' },
    { label: 'Staff Mood', val: `${liveMetrics?.staffMood ?? 50}/100`, cls: 'text-slate-100' },
    { label: 'Reputation', val: `${comp?.reputation.toFixed(0) ?? 0}/100`, cls: 'text-slate-100' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-3 text-xs">
        {kpis.map((k) => (
          <div key={k.label} className="bg-[#111827] border border-slate-800/90 rounded-lg px-3 py-2.5">
            <div className="text-[11px] text-slate-400">{k.label}</div>
            <div className={`font-mono text-base font-semibold mt-0.5 tabular-nums ${k.cls}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {displaySeats.map((seat) => (
          <div key={`${seat.seatIndex}_${seat.citizenId ?? 'v'}`} className="bg-[#111827] border border-slate-800/90 rounded-lg p-3.5 text-xs space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono uppercase">{seat.seatRole}</span>
              <span className="font-mono tabular-nums">M {seat.mood} · S {seat.stress}</span>
            </div>
            {seat.citizenId ? (
              <button type="button" onClick={() => onSelectCitizen(seat.citizenId!)} className="font-semibold text-sm text-slate-100 hover:text-amber-300 text-left cursor-pointer">
                {seat.name}
              </button>
            ) : (
              <div className="font-semibold text-sm text-slate-500">{seat.name}</div>
            )}
            <div className="text-[11px] text-amber-300/90">{seat.stance}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
