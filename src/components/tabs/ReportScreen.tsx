import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { computeSurplusMetrics, calculateGoalETA } from '../../lib/engines/surplusEngine';
import { formatINR, formatINRShort } from '../../lib/formatters';
import { MerchantLogo } from '../common/MerchantLogo';
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  Check,
  Ban,
  Target,
} from 'lucide-react';

export const ReportScreen: React.FC = () => {
  const { profile, transactions, goals, subscriptions, toggleSubscriptionInactive } = useFinance();

  const metrics = computeSurplusMetrics(profile, transactions);
  const primaryGoal = goals[0];
  const goalEta = primaryGoal
    ? calculateGoalETA(primaryGoal, metrics.monthlySurplus)
    : { arrivalDate: '31 Mar', monthsToGoal: 0, onTrack: true };

  const [aiNarrative, setAiNarrative] = useState<string>('');
  const [isLoadingNarrative, setIsLoadingNarrative] = useState<boolean>(false);

  // Top categories
  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'expense' || t.category === 'Rent & Housing') continue;
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [transactions]);

  // Request 3-sentence grounded AI editorial review
  useEffect(() => {
    let isMounted = true;
    const fetchNarrative = async () => {
      setIsLoadingNarrative(true);
      try {
        const res = await fetch('/api/gemini/report-narrative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: {
              currentMonthSpent: metrics.currentMonthSpent,
              leftToSpend: metrics.currentMonthLeft,
              monthlySurplus: metrics.monthlySurplus,
              goalEta: goalEta.arrivalDate,
              topCategory: topCategories[0]?.name || 'Food & Dining',
            },
          }),
        });
        const data = await res.json();
        if (isMounted && data.narrative) {
          setAiNarrative(data.narrative);
        }
      } catch (e) {
        if (isMounted) {
          setAiNarrative(
            `You have ₹${metrics.currentMonthLeft.toLocaleString('en-IN')} remaining this month after commitments. Your monthly surplus is running at ₹${metrics.monthlySurplus.toLocaleString('en-IN')}, keeping your primary goal on track for ${goalEta.arrivalDate}. Watch your pace in ${topCategories[0]?.name || 'Food & Dining'} over the coming two weeks to stay ahead.`
          );
        }
      } finally {
        if (isMounted) setIsLoadingNarrative(false);
      }
    };

    fetchNarrative();
    return () => {
      isMounted = false;
    };
  }, [metrics.currentMonthSpent, metrics.monthlySurplus]);

  // Daily spend bars (last 14 days)
  const dailySpendBars = useMemo(() => {
    const days: { label: string; amount: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];

      const dayTotal = transactions
        .filter((t) => t.type === 'expense' && t.date === dStr && t.category !== 'Rent & Housing')
        .reduce((sum, t) => sum + t.amount, 0);

      days.push({
        label: `${d.getDate()}`,
        amount: dayTotal,
      });
    }
    return days;
  }, [transactions]);

  const maxDailyBar = Math.max(1, ...dailySpendBars.map((d) => d.amount));
  const dailyBudgetTarget = Math.round(metrics.dailyIdealBurn);

  return (
    <div className="space-y-6 px-5 pt-4 content-safe-bottom">
      {/* 3-Sentence AI Grounded Narrative */}
      <section className="card-durung p-5 relative overflow-hidden bg-[var(--surface-app)] border-[var(--line-border)]">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={15} className="text-[var(--accent-emerald)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Editorial Monthly Review
          </h3>
        </div>

        {isLoadingNarrative ? (
          <div className="space-y-2 py-2">
            <div className="h-4 bg-[var(--surface-secondary)] rounded-md animate-pulse w-full" />
            <div className="h-4 bg-[var(--surface-secondary)] rounded-md animate-pulse w-5/6" />
            <div className="h-4 bg-[var(--surface-secondary)] rounded-md animate-pulse w-4/6" />
          </div>
        ) : (
          <p className="text-sm font-medium leading-relaxed text-[var(--ink-primary)]">
            {aiNarrative ||
              `You have ₹${metrics.currentMonthLeft.toLocaleString('en-IN')} remaining this month after commitments. Your monthly surplus is running at ₹${metrics.monthlySurplus.toLocaleString('en-IN')}, keeping your primary goal on track for ${goalEta.arrivalDate}. Watch your pace in ${topCategories[0]?.name || 'Food & Dining'} over the coming two weeks to stay ahead.`}
          </p>
        )}
      </section>

      {/* Daily Spend Bars with Budget Line */}
      <section className="card-durung p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Daily Spend Pace (Last 14 Days)
          </h3>
          <span className="text-xs font-semibold text-[var(--ink-muted)] tabular-nums">
            Ideal: {formatINR(dailyBudgetTarget)}/day
          </span>
        </div>

        <div className="relative pt-6 pb-2">
          {/* Dashed budget target line */}
          <div
            className="absolute left-0 right-0 border-b border-dashed border-[var(--ink-muted)] z-10 pointer-events-none"
            style={{
              bottom: `${Math.min(90, (dailyBudgetTarget / maxDailyBar) * 80 + 20)}px`,
            }}
          >
            <span className="absolute right-0 -top-4 text-[9px] font-semibold text-[var(--ink-muted)] bg-[var(--surface-app)] px-1 rounded">
              Daily budget
            </span>
          </div>

          {/* Bars */}
          <div className="h-28 flex items-end justify-between gap-1">
            {dailySpendBars.map((bar, idx) => {
              const heightPct = Math.min(100, (bar.amount / maxDailyBar) * 100);
              const isOverBudget = bar.amount > dailyBudgetTarget * 1.25;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full h-24 flex items-end justify-center">
                    <div
                      className={`w-full max-w-[14px] rounded-t-sm transition-all duration-300 ${
                        isOverBudget
                          ? 'bg-[var(--caution-gold)]'
                          : bar.amount > 0
                          ? 'bg-[var(--accent-emerald)]'
                          : 'bg-[var(--surface-secondary)] h-1'
                      }`}
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                      title={`${bar.label}: ${formatINR(bar.amount)}`}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--ink-muted)] tabular-nums">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subscriptions with Price-Change Badge and "I don't use this" flag */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Active Subscriptions & Recurring
          </h3>
          <span className="text-xs text-[var(--ink-muted)]">
            {subscriptions.filter((s) => !s.flaggedInactive).length} active
          </span>
        </div>

        <div className="card-durung divide-y divide-[var(--line-border)] overflow-hidden shadow-xs">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className={`p-3.5 flex items-center justify-between transition-colors ${
                sub.flaggedInactive ? 'opacity-60 bg-[var(--surface-secondary)]/30' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MerchantLogo
                  merchantKey={sub.merchantKey}
                  domain={sub.domain}
                  merchantName={sub.name}
                  category={sub.category}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-[var(--ink-primary)] truncate">
                      {sub.name}
                    </p>
                    {/* Price-change badge (e.g. Netflix ₹499 -> ₹649) */}
                    {sub.previousAmount && sub.amount > sub.previousAmount && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[var(--alert-coral-light)] text-[var(--alert-coral)] font-bold text-[9px] uppercase tracking-wider shrink-0 border border-[var(--alert-coral)]/30">
                        ₹{sub.previousAmount} → ₹{sub.amount} (+₹{sub.amount - sub.previousAmount})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                    {formatINR(sub.amount)}/month · {sub.flaggedInactive ? 'Flagged unused' : 'Active'}
                  </p>
                </div>
              </div>

              {/* "I don't use this" Flag Button */}
              <button
                onClick={() => toggleSubscriptionInactive(sub.id)}
                className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-[10px] shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
                  sub.flaggedInactive
                    ? 'bg-[var(--surface-secondary)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                    : 'bg-[var(--alert-coral-light)] text-[var(--alert-coral)] hover:bg-[var(--alert-coral)] hover:text-white'
                }`}
                title="Toggle subscription activity"
              >
                {sub.flaggedInactive ? (
                  <>
                    <Check size={12} />
                    <span>Unused</span>
                  </>
                ) : (
                  <>
                    <Ban size={12} />
                    <span>I don&apos;t use this</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Top Categories with Sparklines */}
      <section className="card-durung p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
          Top Variable Spend Categories
        </h3>

        <div className="space-y-3">
          {topCategories.map((cat, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-emerald)]" />
                <span className="font-semibold text-[var(--ink-primary)]">{cat.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Mini SVG sparkline */}
                <svg width="60" height="16" className="overflow-visible">
                  <path
                    d={`M 0 14 Q 15 ${6 + (i * 2)} 30 10 T 60 ${4 + (i * 3)}`}
                    fill="none"
                    stroke="var(--accent-emerald)"
                    strokeWidth="1.5"
                  />
                </svg>
                <span className="font-bold text-[var(--ink-primary)] tabular-nums w-16 text-right">
                  {formatINR(cat.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Goal Progress Delta */}
      {primaryGoal && (
        <section className="card-durung p-4 flex items-center justify-between bg-[var(--accent-emerald-light)]/40 border-[var(--accent-emerald)]/30">
          <div className="flex items-center gap-3">
            <Target size={18} className="text-[var(--accent-emerald)]" />
            <div>
              <p className="text-xs font-bold text-[var(--ink-primary)]">Goal Progress Delta</p>
              <p className="text-[11px] text-[var(--accent-emerald)] font-semibold mt-0.5">
                +₹12,500 contribution paced this month toward {primaryGoal.name}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[var(--accent-emerald)] tabular-nums">
            {goalEta.arrivalDate}
          </span>
        </section>
      )}

      {/* Mandatory SEBI / Regulatory Guardrail Footer */}
      <footer className="pt-2 pb-6 text-center text-xs text-[var(--ink-muted)] flex flex-col items-center justify-center gap-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-[var(--accent-emerald)]" />
          <span className="font-semibold">Educational modeling, not investment advice.</span>
        </div>
        <p className="text-[10px] opacity-75">
          Durung helps salaried professionals visualize living money models.
        </p>
      </footer>
    </div>
  );
};
