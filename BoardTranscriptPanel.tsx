// BoardTranscriptPanel.tsx — Streaming board transcript playback with 1x/5x/Instant, Hide thoughts, and Jump to vote

import { Eye, EyeOff, FastForward, Pause, Play } from 'lucide-react';
import { useMemo } from 'react';
import { renderTranscriptLine } from './boardTemplateRender';
import type { TranscriptLineRecord } from './boardTypes';

export type TranscriptSpeed = 0 | 1 | 5 | 'instant';

interface BoardTranscriptPanelProps {
  lines: TranscriptLineRecord[];
  visibleCount: number;
  speed: TranscriptSpeed;
  hideThoughts: boolean;
  onSpeedChange: (speed: TranscriptSpeed) => void;
  onToggleThoughts: () => void;
  onJumpToVote: () => void;
  onSelectCitizen: (citizenId: string) => void;
}

export function BoardTranscriptPanel({
  lines,
  visibleCount,
  speed,
  hideThoughts,
  onSpeedChange,
  onToggleThoughts,
  onJumpToVote,
  onSelectCitizen,
}: BoardTranscriptPanelProps) {
  const renderedLines = useMemo(() => {
    const slice = lines.slice(0, visibleCount);
    const filtered = hideThoughts ? slice.filter((l) => l.lineType !== 'thought') : slice;
    return filtered.map((line) => ({ line, text: renderTranscriptLine(line) }));
  }, [lines, visibleCount, hideThoughts]);

  const atEnd = visibleCount >= lines.length;

  return (
    <div className="bg-[#111827] border border-slate-800/90 rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSpeedChange(speed === 0 ? 1 : 0)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-100 cursor-pointer"
          >
            {speed === 0 ? <Play className="w-3 h-3" aria-hidden="true" /> : <Pause className="w-3 h-3" aria-hidden="true" />}
            <span>{speed === 0 ? 'Play' : 'Pause'}</span>
          </button>
          {([1, 5, 'instant'] as const).map((opt) => (
            <button
              key={String(opt)}
              type="button"
              onClick={() => onSpeedChange(opt)}
              className={`px-2.5 py-1 text-xs rounded cursor-pointer ${
                speed === opt ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-[#0c1220] text-slate-300 hover:bg-slate-800'
              }`}
            >
              {opt === 'instant' ? 'Instant' : `${opt}x`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleThoughts}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-[#0c1220] border border-slate-800 text-slate-300 hover:text-slate-100 cursor-pointer"
          >
            {hideThoughts ? <Eye className="w-3 h-3" aria-hidden="true" /> : <EyeOff className="w-3 h-3" aria-hidden="true" />}
            <span>{hideThoughts ? 'Show thoughts' : 'Hide thoughts'}</span>
          </button>
          <button
            type="button"
            onClick={onJumpToVote}
            disabled={atEnd}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 disabled:opacity-40 cursor-pointer"
          >
            <FastForward className="w-3 h-3" aria-hidden="true" />
            <span>Jump to vote</span>
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[430px] overflow-y-auto pr-1 text-xs">
        {renderedLines.map(({ line, text }) => {
          if (line.lineType === 'narration') {
            return (
              <div key={line.id} className="px-3 py-1.5 text-[11px] text-slate-400 italic bg-[#090d16]/70 rounded">
                {text}
              </div>
            );
          }
          const isThought = line.lineType === 'thought';
          return (
            <div
              key={line.id}
              className={`p-3 rounded-md border ${
                isThought
                  ? 'border-dashed border-slate-700/80 bg-[#0b101b] text-slate-300'
                  : 'border-slate-800/90 bg-[#0c1220] text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {line.speakerId ? (
                    <button
                      type="button"
                      onClick={() => onSelectCitizen(line.speakerId!)}
                      className="font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
                    >
                      {line.speakerName}
                    </button>
                  ) : (
                    <span className="font-semibold text-slate-200">{line.speakerName}</span>
                  )}
                  <span className="text-[11px] text-slate-400">{line.speakerRole}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 capitalize">
                  {isThought ? `Private thought · ${line.act}` : line.act.replace('_', ' ')}
                </span>
              </div>
              <p className={`leading-relaxed ${isThought ? 'italic text-slate-300' : 'text-slate-200'}`}>
                {isThought ? `(${text})` : text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
