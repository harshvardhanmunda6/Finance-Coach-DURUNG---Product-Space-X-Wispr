import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, RefreshCw, Trash2, BookOpen, ShieldCheck, Database, Moon, Sun, Monitor } from 'lucide-react';
import { formatINR } from '../../lib/formatters';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({ isOpen, onClose }) => {
  const {
    profile,
    merchantRules,
    loadSampleData,
    resetAllData,
  } = useFinance();

  const [themeMode, setThemeMode] = useState<'system' | 'dark' | 'light'>(() => {
    return (localStorage.getItem('durung_theme') as any) || 'system';
  });

  const handleSetTheme = (mode: 'system' | 'dark' | 'light') => {
    setThemeMode(mode);
    localStorage.setItem('durung_theme', mode);
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'light') {
      root.classList.add('light');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('durung_theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else if (saved === 'light') document.documentElement.classList.add('light');
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-[480px] bg-[var(--surface-app)] border-t sm:border border-[var(--line-border)] rounded-t-[28px] sm:rounded-[24px] p-6 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--line-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-white dark:bg-[#1A1A1D] border border-[var(--line-border)] p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              <img
                src="/assets/aistudio/file_00000000712c8207a7cd8dc050f00162_2_568880dc.jpg"
                alt="Durung Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-base font-bold text-[var(--ink-primary)]">Settings & Data</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="py-5 space-y-6">
          {/* Profile overview */}
          <div className="bg-[var(--surface-secondary)]/50 p-4 rounded-[18px] border border-[var(--line-border)]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-[var(--ink-muted)] font-medium">Monthly Income</span>
              <span className="text-sm font-bold text-[var(--ink-primary)] tabular-nums">
                {formatINR(profile.monthlyIncome)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-[var(--ink-muted)] font-medium">Fixed Commitments</span>
              <span className="text-sm font-semibold text-[var(--ink-primary)] tabular-nums">
                {formatINR((profile.fixedCosts || []).reduce((acc, fc) => acc + fc.amount, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--ink-muted)] font-medium">Emergency Reserve</span>
              <span className="text-sm font-semibold text-[var(--accent-emerald)] tabular-nums">
                {formatINR(profile.emergencyFundSaved)}
              </span>
            </div>
          </div>

          {/* Theme & Appearance */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2 flex items-center gap-1.5">
              <Moon size={14} />
              <span>Theme & Appearance</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSetTheme('light')}
                className={`py-2.5 px-3 rounded-[12px] border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  themeMode === 'light'
                    ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)] font-bold'
                    : 'border-[var(--line-border)] bg-[var(--surface-secondary)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <Sun size={14} />
                <span>Light</span>
              </button>
              <button
                onClick={() => handleSetTheme('dark')}
                className={`py-2.5 px-3 rounded-[12px] border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  themeMode === 'dark'
                    ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)] font-bold'
                    : 'border-[var(--line-border)] bg-[var(--surface-secondary)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <Moon size={14} />
                <span>Dark</span>
              </button>
              <button
                onClick={() => handleSetTheme('system')}
                className={`py-2.5 px-3 rounded-[12px] border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  themeMode === 'system'
                    ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)] font-bold'
                    : 'border-[var(--line-border)] bg-[var(--surface-secondary)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <Monitor size={14} />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Learned Merchant Rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
                <BookOpen size={14} />
                <span>Learned Merchant Rules</span>
              </h3>
              <span className="text-xs text-[var(--ink-muted)]">
                {Object.keys(merchantRules).length} rules active
              </span>
            </div>

            {Object.keys(merchantRules).length === 0 ? (
              <div className="p-3.5 rounded-[14px] bg-[var(--surface-secondary)] text-center text-xs text-[var(--ink-muted)]">
                No custom rules yet. Recategorize any transaction in Ledger or say &ldquo;RAHUL is Rent&rdquo; to teach Durung.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(merchantRules).map(([key, cat]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-[14px] bg-[var(--surface-secondary)] text-xs border border-[var(--line-border)]"
                  >
                    <span className="font-semibold text-[var(--ink-primary)] uppercase">{key}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--surface-app)] text-[var(--ink-muted)] font-medium">
                      {cat}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-2.5 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
              <Database size={14} />
              <span>Data Controls</span>
            </h3>

            <button
              onClick={() => {
                loadSampleData();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[14px] bg-[var(--surface-secondary)] hover:bg-[var(--line-border)] text-xs font-semibold text-[var(--ink-primary)] active:scale-98 transition-all"
            >
              <RefreshCw size={15} />
              <span>Load 90-day Indian Salaried Sample Data</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset all transactions, goals, and profile back to initial empty state?')) {
                  resetAllData();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[14px] bg-[var(--alert-coral-light)] text-[var(--alert-coral)] hover:opacity-90 text-xs font-semibold active:scale-98 transition-all"
            >
              <Trash2 size={15} />
              <span>Reset All Applet Data</span>
            </button>
          </div>

          {/* Regulatory guardrail disclaimer */}
          <div className="pt-4 border-t border-[var(--line-border)] flex items-start gap-2.5 text-[11px] text-[var(--ink-muted)]">
            <ShieldCheck size={16} className="shrink-0 text-[var(--accent-emerald)] mt-0.5" />
            <p>
              Durung is designed for cashflow visualization and educational scenario modeling. Durung does not provide investment, tax, or legal advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
