// BoardTabView.tsx — Vij Industries boardroom status, transcript playback, probabilities, and history

import { useEffect, useMemo, useState } from 'react';
import { BoardHistoryPanel, type MeetingFilter } from './BoardHistoryPanel';
import { BoardProbabilityPanel } from './BoardProbabilityPanel';
import { BoardSeatsAndKpis } from './BoardSeatsAndKpis';
import { computeBoardMetrics, resolveBoardMembers } from './boardSeats';
import { BoardTranscriptPanel, type TranscriptSpeed } from './BoardTranscriptPanel';
import type { BoardMeeting } from './boardTypes';
import { formatDelta } from './formatters';
import type { CityState } from './types';

interface BoardTabViewProps {
  city: CityState;
  meetings: BoardMeeting[];
  onMarkMeetingRead: (meetingId: string) => void;
  onSelectCitizen: (citizenId: string) => void;
}

export function BoardTabView({ city, meetings, onMarkMeetingRead, onSelectCitizen }: BoardTabViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(meetings[0]?.id ?? null);
  const [filter, setFilter] = useState<MeetingFilter>('all');
  const [speed, setSpeed] = useState<TranscriptSpeed>(1);
  const [hideThoughts, setHideThoughts] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(3);

  const selected = useMemo(
    () => meetings.find((m) => m.id === selectedId) ?? meetings[0] ?? null,
    [meetings, selectedId]
  );

  useEffect(() => {
    if (!selected && meetings[0]) setSelectedId(meetings[0].id);
  }, [meetings, selected]);

  useEffect(() => {
    if (!selected) return;
    if (!selected.read) onMarkMeetingRead(selected.id);
    setVisibleCount(selected.transcript.length > 0 ? Math.min(3, selected.transcript.length) : 0);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected || speed === 0) return;
    if (speed === 'instant') { setVisibleCount(selected.transcript.length); return; }
    if (visibleCount >= selected.transcript.length) return;
    const timer = window.setInterval(() => {
      setVisibleCount((v) => Math.min(selected.transcript.length, v + 1));
    }, speed === 5 ? 240 : 900);
    return () => window.clearInterval(timer);
  }, [selected, speed, visibleCount]);

  const comp = city.companies.find((c) => c.id === 'vijindustries');
  const liveMetrics = comp ? computeBoardMetrics(comp, city.citizens) : null;
  const liveSeats = useMemo(() => resolveBoardMembers(city.citizens).seats, [city.citizens]);
  const investorOwed = city.boardState.employeeInvestments
    .filter((i) => i.status === 'active')
    .reduce((s, i) => s + Math.max(0, i.principal - i.repaid), 0);

  const daysUntilNext = Math.max(0, city.boardState.nextMeetingDay - city.totalDays);
  const cooldownLeft = Math.max(0, 60 - (city.totalDays - city.boardState.lastSevereActionDay));
  const voteRevealed = Boolean(selected && visibleCount >= selected.transcript.length);
  const displaySeats = selected ? selected.seats : liveSeats;

  return (
    <div className="space-y-5">
      <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-base font-semibold text-slate-50">Vij Industries Boardroom</h2>
            {selected ? (
              <span className={`font-mono text-[11px] uppercase ${selected.kind === 'emergency' ? 'text-rose-300' : 'text-amber-300'}`}>
                {selected.kind} session · {selected.dateLabel}
              </span>
            ) : (
              <span className="font-mono text-[11px] text-slate-400">Awaiting first Day 30 session</span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
            Next scheduled meeting: {daysUntilNext === 0 ? 'Due today' : `in ${daysUntilNext}d`} · Severe action cooldown: {cooldownLeft > 0 ? `${cooldownLeft}d active` : 'Clear'}
          </div>
        </div>
        <div className="flex items-center gap-5 text-xs font-mono tabular-nums">
          <div><span className="text-slate-400">Director Capital: </span><span className="text-amber-300">{formatDelta(city.boardState.totalBoardContributions)}</span></div>
          <div><span className="text-slate-400">Staff Owed: </span><span className="text-sky-300">{formatDelta(investorOwed)}</span></div>
        </div>
      </div>

      <BoardSeatsAndKpis comp={comp} liveMetrics={liveMetrics} displaySeats={displaySeats} onSelectCitizen={onSelectCitizen} />

      {selected ? (
        <div className="grid grid-cols-12 gap-5 items-start">
          <div className="col-span-7">
            <BoardTranscriptPanel
              lines={selected.transcript}
              visibleCount={visibleCount}
              speed={speed}
              hideThoughts={hideThoughts}
              onSpeedChange={setSpeed}
              onToggleThoughts={() => setHideThoughts((v) => !v)}
              onJumpToVote={() => setVisibleCount(selected.transcript.length)}
              onSelectCitizen={onSelectCitizen}
            />
          </div>
          <div className="col-span-5">
            <BoardProbabilityPanel meeting={selected} voteRevealed={voteRevealed} onSelectCitizen={onSelectCitizen} />
          </div>
        </div>
      ) : (
        <div className="bg-[#111827] border border-dashed border-slate-800 rounded-lg py-12 text-center text-xs text-slate-400">
          No Vij Industries board meeting has convened yet. Advance to Day 30 (or trigger an emergency cash shortfall) to observe the first boardroom session.
        </div>
      )}

      <BoardHistoryPanel
        meetings={meetings}
        selectedId={selected?.id ?? null}
        filter={filter}
        onFilterChange={setFilter}
        onSelectMeeting={(m) => { setSelectedId(m.id); onMarkMeetingRead(m.id); }}
      />
    </div>
  );
}
