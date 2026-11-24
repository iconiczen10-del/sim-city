// ExportMenu.tsx — Export dropdown offering Download to PC and Upload to SimCity Saves with Escape/outside-click close

import { ChevronDown, Download, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ExportMenuProps {
  onDownload: () => void;
  onUpload: () => void;
  mobile?: boolean;
}

export function ExportMenu({ onDownload, onUpload, mobile = false }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Export city data"
        className="w-full flex items-center justify-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:text-slate-50 cursor-pointer"
      >
        <Download className="size-3 shrink-0" aria-hidden="true" />
        <span>Export</span>
        <ChevronDown className={`size-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Export save options"
          className={`absolute bottom-full mb-2 z-50 w-64 rounded-lg border border-slate-700 bg-[#111827] p-1.5 shadow-xl ${
            mobile ? 'left-1/2 -translate-x-1/2' : 'left-0'
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDownload();
            }}
            className="w-full text-left rounded-md px-2.5 py-2 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-slate-100">
              <Download className="size-3.5 text-amber-300 shrink-0" aria-hidden="true" />
              <span>Download to PC</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 pl-5.5 leading-snug">
              Saves a local .json file directly to your device.
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onUpload();
            }}
            className="w-full text-left rounded-md px-2.5 py-2 hover:bg-slate-800/80 transition-colors cursor-pointer mt-0.5"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-slate-100">
              <ExternalLink className="size-3.5 text-amber-300 shrink-0" aria-hidden="true" />
              <span>Upload to SimCity Saves</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 pl-5.5 leading-snug">
              Downloads a local copy and opens the save site in a new tab.
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
