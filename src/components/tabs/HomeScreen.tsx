import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { computeSurplusMetrics, calculateGoalETA } from '../../lib/engines/surplusEngine';
import { analyzeCategoryDrifts, generateNudges } from '../../lib/engines/driftEngine';
import { formatINR, formatISTDate, formatINRShort } from '../../lib/formatters';
import { MerchantLogo } from '../common/MerchantLogo';
import {
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Target,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { TabKey } from '../common/BottomNav';

interface HomeScreenProps {
  onNavigateTab: (tab: TabKey) => void;
  onOpenScenarioModal?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateTab }) => {
  const { profile, transactions, goals, subscriptions, customBudgets } = useFinance();

  const metrics = computeSurplusMetrics(profile, transactions);
  const primaryGoal = goals[0];
  const goalEta = primaryGoal
    ? calculateGoalETA(primaryGoal, metrics.monthlySurplus)
    : { arrivalDate: 'N/A', monthsToGoal: 0, onTrack: true };

  // Drift and nudges
  const drifts = analyzeCategoryDrifts(transactions, customBudgets);
  const uncategorizedCount = transactions.filter((t) => t.isUncategorized).length;
  const nudges = generateNudges(drifts, subscriptions, uncategorizedCount);

  // Recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  // Month progress
  const monthElapsedPercent = Math.min(
    100,
    Math.round((metrics.daysElapsed / metrics.daysInMonth) * 100)
  );
  const totalVariableBudget = Math.max(1, profile.monthlyIncome - metrics.totalFixedCosts);
  const spentPercent = Math.min(100, Math.round((metrics.currentMonthSpent / totalVariableBudget) * 100));

  // Sparkline data points for daily burn this month
  const sparklineDays = Math.min(metrics.daysElapsed, 30);
  const sparkPoints: number[] = [];
  let cumSpend = 0;
  for (let i = 1; i <= sparklineDays; i++) {
    // approximate daily spread
    cumSpend += metrics.dailyActualBurn;
    sparkPoints.push(Math.min(100, (cumSpend / totalVariableBudget) * 100));
  }
  const sparklineSvgPath = sparkPoints
    .map((val, idx) => {
      const x = (idx / (sparklineDays - 1 || 1)) * 140;
      const y = 35 - (val / 100) * 30;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Goal ring percentage
  const goalPercent = primaryGoal
    ? Math.min(100, Math.round((primaryGoal.currentAmount / primaryGoal.targetAmount) * 100))
    : 0;

  return (
    <div className="space-y-6 px-5 pt-4 content-safe-bottom">
      {/* Hero: Left to spend */}
      <section className="card-durung p-6 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-[var(--ink-muted)] mb-1">
          <span className="font-semibold uppercase tracking-wider">Left to spend this month</span>
          <span className="tabular-nums">Day {metrics.daysElapsed} of {metrics.daysInMonth}</span>
        </div>

        {/* Big Numeral */}
        <div className="flex items-baseline justify-between mt-1 mb-4">
          <span className="text-[48px] sm:text-[54px] font-semibold tracking-[-0.03em] tabular-nums text-[var(--ink-primary)] leading-none">
            {formatINR(metrics.currentMonthLeft)}
          </span>
          {metrics.spendPaceRatio <= 1.05 ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)]">
              <span>On pace</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--caution-gold-light)] text-[var(--caution-gold)]">
              <span>Fast burn</span>
            </span>
          )}
        </div>

        {/* Pace Bar & Sparkline */}
        <div className="pt-2 border-t border-[var(--line-border)]/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[var(--ink-muted)]">
              Spent <strong className="text-[var(--ink-primary)] tabular-nums">{formatINR(metrics.currentMonthSpent)}</strong> ({spentPercent}%)
            </span>
            <span className="text-[var(--ink-muted)] tabular-nums">
              Month: {monthElapsedPercent}%
            </span>
          </div>

          {/* Double track pace bar */}
          <div className="relative h-2.5 w-full bg-[var(--surface-secondary)] rounded-full overflow-hidden">
            {/* Money spent fill */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                spentPercent > monthElapsedPercent ? 'bg-[var(--caution-gold)]' : 'bg-[var(--accent-emerald)]'
              }`}
              style={{ width: `${spentPercent}%` }}
            />
            {/* Target month timeline indicator pin */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-[var(--ink-primary)] shadow-xs"
              style={{ left: `${monthElapsedPercent}%` }}
              title="Current day in month"
            />
          </div>

          {/* Sparkline & burn rate note */}
          <div className="flex items-center justify-between mt-3 pt-2 text-[11px] text-[var(--ink-muted)]">
            <span>Burn: ~{formatINR(metrics.dailyActualBurn)}/day</span>
            <svg width="140" height="35" className="overflow-visible">
              <path
                d={sparklineSvgPath}
                fill="none"
                stroke="var(--accent-emerald)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Baseline ideal line */}
              <line
                x1="0"
                y1="35"
                x2="140"
                y2="5"
                stroke="var(--line-border)"
                strokeDasharray="2,2"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Primary Goal Ring Card */}
      {primaryGoal && (
        <section
          onClick={() => onNavigateTab('plan')}
          className="card-durung p-5 flex items-center justify-between cursor-pointer hover:border-[var(--ink-muted)] transition-all active:scale-99 shadow-xs"
        >
          <div className="flex items-center gap-4">
            {/* Goal Ring SVG */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[var(--surface-secondary)]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[var(--accent-emerald)] transition-all duration-700"
                  strokeDasharray={`${goalPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold text-[var(--ink-primary)] tabular-nums">
                {goalPercent}%
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <Target size={14} className="text-[var(--accent-emerald)]" />
                <h3 className="text-sm font-bold text-[var(--ink-primary)]">{primaryGoal.name}</h3>
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Saved {formatINR(primaryGoal.currentAmount)} of {formatINR(primaryGoal.targetAmount)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-semibold text-[var(--accent-emerald)]">
                  On track for {goalEta.arrivalDate}
                </span>
              </div>
            </div>
          </div>

          <ChevronRight size={18} className="text-[var(--ink-muted)] shrink-0" />
        </section>
      )}

      {/* At most 2 Nudge Cards */}
      {nudges.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] px-1">
            <span>Model Nudges</span>
            <span>{nudges.length} active</span>
          </div>

          <div className="space-y-2">
            {nudges.map((nudge) => (
              <div
                key={nudge.id}
                onClick={() => {
                  if (nudge.type === 'uncategorized') onNavigateTab('ledger');
                  else if (nudge.type === 'price_increase') onNavigateTab('report');
                  else onNavigateTab('plan');
                }}
                className={`p-4 rounded-[20px] border flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-99 ${
                  nudge.type === 'price_increase'
                    ? 'bg-[var(--alert-coral-light)]/60 border-[var(--alert-coral)]/30'
                    : nudge.type === 'drift'
                    ? 'bg-[var(--caution-gold-light)]/60 border-[var(--caution-gold)]/30'
                    : 'bg-[var(--surface-app)] border-[var(--line-border)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {nudge.type === 'price_increase' ? (
                      <AlertTriangle size={17} className="text-[var(--alert-coral)]" />
                    ) : (
                      <TrendingUp size={17} className="text-[var(--caution-gold)]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--ink-primary)]">{nudge.title}</h4>
                    <p className="text-[11px] text-[var(--ink-muted)] mt-0.5 line-clamp-2">
                      {nudge.subtitle}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[var(--ink-primary)]">
                  <span>{nudge.actionText}</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Last 5 Transactions */}
      <section className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Recent Movements
          </h3>
          <button
            onClick={() => onNavigateTab('ledger')}
            className="text-xs font-semibold text-[var(--accent-emerald)] hover:underline flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="card-durung divide-y divide-[var(--line-border)] overflow-hidden">
          {recentTransactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3.5 flex items-center justify-between hover:bg-[var(--surface-secondary)]/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MerchantLogo
                  merchantKey={tx.merchantKey}
                  domain={tx.domain}
                  merchantName={tx.merchantClean}
                  category={tx.category}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--ink-primary)] truncate">
                    {tx.merchantClean}
                  </p>
                  <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                    {tx.category} · {formatISTDate(tx.date)}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2">
                <p
                  className={`text-xs font-bold tabular-nums ${
                    tx.status === 'pending'
                      ? 'text-[var(--pending-amber)]'
                      : tx.type === 'income'
                      ? 'text-[var(--credit-green)]'
                      : 'text-[var(--debit-red)]'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'}
                  {formatINR(tx.amount)}
                </p>
                {tx.status === 'pending' ? (
                  <span className="text-[9px] font-bold text-[var(--pending-amber)] bg-[var(--pending-amber-light)] px-1.5 py-0.5 rounded-md inline-block uppercase tracking-wider mt-0.5">
                    Pending
                  </span>
                ) : tx.isUncategorized ? (
                  <span className="text-[10px] font-semibold text-[var(--caution-gold)] block">
                    Needs review
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
