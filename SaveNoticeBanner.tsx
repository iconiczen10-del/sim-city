// SaveNoticeBanner.tsx — Dismissible banner for export feedback, download errors, and copyable fallback link

import { Check, Copy, X } from 'lucide-react';
import { useState } from 'react';

export interface SaveNotice {
  kind: 'info' | 'warning' | 'error';
  message: string;
  link?: string;
}

interface SaveNoticeBannerProps {
  notice: SaveNotice;
  onDismiss: () => void;
}

export function SaveNoticeBanner({ notice, onDismiss }: SaveNoticeBannerProps) {
  const [copied, setCopied] = useState(false);

  const tone = notice.kind === 'error'
    ? 'bg-rose-950/85 border-rose-500/40 text-rose-100'
    : notice.kind === 'warning'
      ? 'bg-amber-950/80 border-amber-500/40 text-amber-100'
      : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-100';

  function handleCopy() {
    if (!notice.link) return;
    navigator.clipboard?.writeText(notice.link).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  return (
    <div className={`border-b px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs ${tone}`} role="status">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <span>{notice.message}</span>
        {notice.link && (
          <>
            <code className="select-all rounded bg-slate-950/70 border border-slate-700/80 px-2 py-0.5 font-mono text-[11px] text-amber-200 break-all">
              {notice.link}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900/90 px-2 py-0.5 text-[11px] text-slate-200 hover:text-white cursor-pointer"
            >
              {copied ? <Check className="size-3 text-emerald-300" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
              <span>{copied ? 'Copied' : 'Copy link'}</span>
            </button>
          </>
        )}
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="text-slate-300 hover:text-white cursor-pointer p-0.5">
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
