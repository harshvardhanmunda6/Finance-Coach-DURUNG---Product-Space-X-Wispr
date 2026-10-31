import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { RotateCcw, X } from 'lucide-react';

export const UndoToast: React.FC = () => {
  const { undoToast, dismissUndo } = useFinance();

  if (!undoToast) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto bg-[var(--surface-app)] border border-[var(--line-border)] text-[var(--ink-primary)] shadow-lg rounded-[14px] px-4 py-2.5 flex items-center justify-between gap-3 max-w-[420px] w-full animate-in fade-in slide-in-from-top-3 duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-[var(--accent-emerald)] shrink-0 animate-pulse" />
          <p className="text-xs font-medium truncate">{undoToast.message}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              undoToast.onUndo();
              dismissUndo();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[var(--surface-secondary)] hover:bg-[var(--line-border)] active:scale-95 rounded-lg text-[var(--ink-primary)] transition-all"
          >
            <RotateCcw size={12} strokeWidth={2} />
            <span>Undo ({undoToast.secondsRemaining}s)</span>
          </button>
          <button
            onClick={dismissUndo}
            className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] p-1 rounded-md"
            aria-label="Dismiss toast"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
