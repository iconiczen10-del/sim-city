// BoardProbabilityPanel.tsx — Vote option probabilities, cooldown status, post-vote breakdown, and contributions

import type { BoardMeeting } from './boardTypes';
import { formatDelta } from './formatters';

interface BoardProbabilityPanelProps {
  meeting: BoardMeeting;
  voteRevealed: boolean;
  onSelectCitizen: (citizenId: string) => void;
}

export function BoardProbabilityPanel({
  meeting,
  voteRevealed,
  onSelectCitizen,
}: BoardProbabilityPanelProps) {
  return (
    <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-100">Board Option Probabilities</h3>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {voteRevealed ? 'Final roll & seat breakdown revealed' : 'Live odds before final board roll'}
          </div>
        </div>
        {voteRevealed && meeting.tieBrokenByCeo && (
          <span className="font-mono text-[11px] text-amber-300">2-2 Tie · CEO Decided</span>
        )}
      </div>

      <div className="space-y-2.5">
        {meeting.options.map((opt) => {
          const isWinner = voteRevealed && opt.optionId === meeting.chosenOptionId;
          return (
            <div
              key={opt.optionId}
              className={`rounded-md border p-2.5 space-y-1.5 ${
                isWinner
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : opt.cooldownBlocked
                    ? 'border-slate-800/70 bg-[#090d16]/70 opacity-65'
                    : 'border-slate-800/80 bg-[#0c1220]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`font-medium ${isWinner ? 'text-amber-300' : 'text-slate-100'}`}>
                  {opt.label}
                  {opt.cooldownBlocked && <span className="text-[10px] text-rose-300 ml-1.5">(60d cooldown)</span>}
                </span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {opt.probability}%
                  {voteRevealed && <span className="text-slate-400 ml-1.5">· {opt.voters.length} vote{opt.voters.length === 1 ? '' : 's'}</span>}
                </span>
              </div>

              <div className="h-1.5 bg-slate-900 rounded-sm overflow-hidden">
                <div
                  className={isWinner ? 'h-full bg-amber-400' : 'h-full bg-sky-400/70'}
                  style={{ width: `${Math.max(2, opt.probability)}%` }}
                />
              </div>

              {voteRevealed && opt.voters.length > 0 && (
                <div className="pt-1 space-y-1">
                  {opt.voters.map((v) => (
                    <div key={v.citizenId} className="text-[11px] text-slate-300 flex items-baseline justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectCitizen(v.citizenId)}
                        className="font-medium text-sky-300 hover:text-sky-200 cursor-pointer shrink-0"
                      >
                        {v.name}
                      </button>
                      <span className="text-slate-400 truncate">{v.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {voteRevealed && (
        <div className="border-t border-slate-800 pt-3 space-y-2">
          <div className="text-[11px] font-semibold text-slate-200">
            Resolution: <span className="text-amber-300">{meeting.chosenLabel}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">{meeting.outcomeSummary}</p>

          {meeting.contributionSummary && (
            <div className="bg-[#0c1220] border border-slate-800 rounded p-2.5 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-300 font-mono">
                <span>Capital Raised: {formatDelta(meeting.contributionSummary.totalContributed)}</span>
                <span>Defaulted: {formatDelta(meeting.contributionSummary.totalDefaulted)}</span>
              </div>
              {meeting.contributionSummary.memberPayments.map((mp) => (
                <div key={mp.citizenId} className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{mp.name}</span>
                  <span className="font-mono">
                    Paid {formatDelta(mp.paid)}
                    {mp.defaulted > 0 ? ` · Short ${formatDelta(mp.defaulted)}` : ''} · {mp.reaction}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
