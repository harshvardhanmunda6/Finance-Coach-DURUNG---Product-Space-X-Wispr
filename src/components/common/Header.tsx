import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { computeSurplusMetrics } from '../../lib/engines/surplusEngine';
import { formatINRShort } from '../../lib/formatters';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { profile, transactions } = useFinance();
  const metrics = computeSurplusMetrics(profile, transactions);

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  return (
    <header className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[var(--line-border)]/70 bg-[var(--bg-app)]/85 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
        {/* Product Logo */}
        <div className="w-10 h-10 rounded-[12px] bg-white dark:bg-[#1A1A1D] border border-[var(--line-border)] p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
          <img
            src="/assets/aistudio/file_00000000712c8207a7cd8dc050f00162_2_568880dc.jpg"
            alt="Durung Logo"
            className="w-full h-full object-contain"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-[var(--ink-primary)]">Durung</h1>
            <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)] border border-[var(--accent-emerald)]/20">
              Living Model
            </span>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)] font-medium">{todayStr}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider font-semibold leading-none">
            Surplus
          </p>
          <p className="text-xs font-bold text-[var(--credit-green)] tabular-nums mt-0.5">
            {formatINRShort(metrics.monthlySurplus)}/mo
          </p>
        </div>

        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-[14px] bg-[var(--surface-app)] border border-[var(--line-border)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] active:scale-95 transition-all shadow-xs"
          aria-label="Open Settings"
        >
          <SlidersHorizontal size={17} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};
