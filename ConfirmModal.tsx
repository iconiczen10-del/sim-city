// ConfirmModal.tsx — Confirmation dialog with optional custom city seed input

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  seedValue?: string;
  onSeedChange?: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  seedValue,
  onSeedChange,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-[#111827] border border-slate-700/80 rounded-lg p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-base font-semibold text-slate-50">
          {title}
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">{message}</p>

        {onSeedChange && (
          <div className="space-y-1.5">
            <label htmlFor="new-city-seed-input" className="block text-[11px] font-medium text-slate-400">
              Start with seed (optional integer — leave blank for random)
            </label>
            <input
              id="new-city-seed-input"
              type="number"
              inputMode="numeric"
              min={1}
              value={seedValue ?? ''}
              onChange={(e) => onSeedChange(e.target.value)}
              placeholder="Random seed (e.g. 48213)"
              className="w-full bg-[#090d16] border border-slate-700 rounded-md px-3 py-1.5 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
