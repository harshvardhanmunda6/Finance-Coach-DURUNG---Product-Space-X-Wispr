import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { computeSurplusMetrics, calculateGoalETA, simulateScenario } from '../../lib/engines/surplusEngine';
import { formatINR, formatINRShort } from '../../lib/formatters';
import {
  Shield,
  Target,
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  Calendar,
} from 'lucide-react';
import { Goal } from '../../types/finance';

export const PlanScreen: React.FC = () => {
  const {
    profile,
    transactions,
    goals,
    updateGoal,
    updateProfile,
    activeScenario,
    setActiveScenario,
  } = useFinance();

  const metrics = computeSurplusMetrics(profile, transactions);
  const primaryGoal = goals[0];

  // Interactive slider scenario state
  const [diningCutPct, setDiningCutPct] = useState(
    activeScenario?.type === 'category_cut' ? Math.abs(activeScenario.delta) : 0
  );
  const [rentDelta, setRentDelta] = useState(
    activeScenario?.type === 'rent_change' ? activeScenario.delta : 0
  );
  const [incomeBoost, setIncomeBoost] = useState(
    activeScenario?.type === 'income_boost' ? activeScenario.delta : 0
  );

  // Sync external activeScenario (e.g. from command bar "what if rent goes up 3000")
  useEffect(() => {
    if (activeScenario) {
      if (activeScenario.type === 'category_cut') {
        setDiningCutPct(Math.abs(activeScenario.delta));
      } else if (activeScenario.type === 'rent_change') {
        setRentDelta(activeScenario.delta);
      } else if (activeScenario.type === 'income_boost') {
        setIncomeBoost(activeScenario.delta);
      }
    }
  }, [activeScenario]);

  // Calculate live scenario simulation
  const scenarioResult = useMemo(() => {
    let currentDelta = 0;

    // Dining cut
    if (diningCutPct > 0) {
      const foodSpend = transactions
        .filter((t) => t.type === 'expense' && t.category.includes('Food'))
        .slice(0, 30)
        .reduce((sum, t) => sum + t.amount, 0);
      const monthlyFood = foodSpend > 0 ? foodSpend : 8500;
      currentDelta += Math.round(monthlyFood * (diningCutPct / 100));
    }

    // Rent change
    currentDelta -= rentDelta;

    // Income boost
    currentDelta += incomeBoost;

    const baseSurplus = metrics.monthlySurplus;
    const simulatedSurplus = Math.max(0, baseSurplus + currentDelta);

    const baseEta = primaryGoal
      ? calculateGoalETA(primaryGoal, baseSurplus)
      : { arrivalDate: 'N/A', monthsToGoal: 0, onTrack: true };

    const newEta = primaryGoal
      ? calculateGoalETA(primaryGoal, simulatedSurplus)
      : { arrivalDate: 'N/A', monthsToGoal: 0, onTrack: true };

    const monthsDelta = Number((baseEta.monthsToGoal - newEta.monthsToGoal).toFixed(1));

    return {
      beforeSurplus: baseSurplus,
      afterSurplus: simulatedSurplus,
      surplusDelta: simulatedSurplus - baseSurplus,
      baseEta,
      newEta,
      monthsDelta,
      hasActiveScenario: diningCutPct > 0 || rentDelta !== 0 || incomeBoost > 0,
    };
  }, [profile, transactions, primaryGoal, metrics.monthlySurplus, diningCutPct, rentDelta, incomeBoost]);

  const handleResetSliders = () => {
    setDiningCutPct(0);
    setRentDelta(0);
    setIncomeBoost(0);
    setActiveScenario(null);
  };

  const handleSaveAsPlan = () => {
    if (!scenarioResult.hasActiveScenario) return;

    if (rentDelta !== 0) {
      const updatedFixed = (profile.fixedCosts || []).map((fc) =>
        fc.category === 'Rent & Housing' ? { ...fc, amount: Math.max(0, fc.amount + rentDelta) } : fc
      );
      updateProfile({ ...profile, fixedCosts: updatedFixed });
    }

    if (incomeBoost !== 0) {
      updateProfile({ ...profile, monthlyIncome: profile.monthlyIncome + incomeBoost });
    }

    handleResetSliders();
  };

  // Runway timeline calculations (Horizontal axis from 0 to 12 months)
  const baseMonths = Math.min(12, Math.max(0.5, scenarioResult.baseEta.monthsToGoal));
  const newMonths = Math.min(12, Math.max(0.5, scenarioResult.newEta.monthsToGoal));

  const basePercent = Math.min(100, (baseMonths / 12) * 100);
  const newPercent = Math.min(100, (newMonths / 12) * 100);

  return (
    <div className="space-y-6 px-5 pt-4 content-safe-bottom">
      {/* Overview Cards: Income, Fixed Costs, Emergency Runway */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="card-durung p-3.5">
          <span className="text-[10px] font-semibold text-[var(--ink-muted)] uppercase block">
            Income
          </span>
          <span className="text-sm font-bold text-[var(--ink-primary)] tabular-nums mt-0.5 block">
            {formatINRShort(profile.monthlyIncome)}
          </span>
          <span className="text-[9px] text-[var(--ink-muted)]">monthly</span>
        </div>

        <div className="card-durung p-3.5">
          <span className="text-[10px] font-semibold text-[var(--ink-muted)] uppercase block">
            Fixed Costs
          </span>
          <span className="text-sm font-bold text-[var(--ink-primary)] tabular-nums mt-0.5 block">
            {formatINRShort(metrics.totalFixedCosts)}
          </span>
          <span className="text-[9px] text-[var(--ink-muted)]">
            {profile.fixedCosts?.length || 0} bills
          </span>
        </div>

        <div className="card-durung p-3.5 bg-[var(--accent-emerald-light)]/40 border-[var(--accent-emerald)]/30">
          <span className="text-[10px] font-semibold text-[var(--accent-emerald)] uppercase block flex items-center gap-1">
            <Shield size={10} />
            <span>Runway</span>
          </span>
          <span className="text-sm font-bold text-[var(--accent-emerald)] tabular-nums mt-0.5 block">
            {metrics.runwayMonths} mos
          </span>
          <span className="text-[9px] text-[var(--accent-emerald)] font-medium">
            {formatINRShort(profile.emergencyFundSaved)} saved
          </span>
        </div>
      </div>

      {/* Signature Visual: "Runway" Horizontal Timeline */}
      <section className="card-durung p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-[var(--accent-emerald)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Runway to Goal ({primaryGoal?.name || 'Primary Goal'})
            </h3>
          </div>
          {scenarioResult.hasActiveScenario && (
            <span className="text-[11px] font-bold text-[var(--accent-emerald)] px-2 py-0.5 rounded-full bg-[var(--accent-emerald-light)]">
              {scenarioResult.monthsDelta > 0
                ? `${scenarioResult.monthsDelta} months earlier`
                : `${Math.abs(scenarioResult.monthsDelta)} months later`}
            </span>
          )}
        </div>

        {/* Timeline Visual Canvas */}
        <div className="py-6 px-2">
          <div className="relative h-2 w-full bg-[var(--surface-secondary)] rounded-full">
            {/* Today origin pin */}
            <div className="absolute -top-1.5 left-0 w-3 h-3 rounded-full bg-[var(--ink-primary)]" />
            <span className="absolute -bottom-5 left-0 text-[10px] font-semibold text-[var(--ink-muted)]">
              Today
            </span>

            {/* Target 12 Month mark */}
            <div className="absolute -top-1.5 right-0 w-3 h-3 rounded-full bg-[var(--line-border)]" />
            <span className="absolute -bottom-5 right-0 text-[10px] font-semibold text-[var(--ink-muted)]">
              12 Months
            </span>

            {/* Connector line between base and new ETA when scenario active */}
            {scenarioResult.hasActiveScenario && (
              <div
                className="absolute top-0 h-2 bg-[var(--accent-emerald)]/30 rounded-full transition-all duration-500"
                style={{
                  left: `${Math.min(basePercent, newPercent)}%`,
                  width: `${Math.abs(newPercent - basePercent)}%`,
                }}
              />
            )}

            {/* Base ETA arrival pin (Grey marker) */}
            <div
              className={`absolute -top-3 w-4 h-4 rounded-full border-2 border-[var(--surface-app)] bg-[var(--ink-muted)] shadow-sm transition-all duration-300 ${
                scenarioResult.hasActiveScenario ? 'opacity-50' : 'opacity-100'
              }`}
              style={{ left: `calc(${basePercent}% - 8px)` }}
              title={`Base ETA: ${scenarioResult.baseEta.arrivalDate}`}
            />
            {(!scenarioResult.hasActiveScenario || scenarioResult.baseEta.arrivalDate !== scenarioResult.newEta.arrivalDate) && (
              <span
                className="absolute -top-7 text-[10px] font-semibold text-[var(--ink-muted)] tabular-nums transition-all duration-300 whitespace-nowrap"
                style={{ left: `calc(${basePercent}% - 24px)` }}
              >
                {scenarioResult.baseEta.arrivalDate}
              </span>
            )}

            {/* Animated Scenario Arrival Pin (Accent Emerald Marker with Spring Easing) */}
            {scenarioResult.hasActiveScenario && (
              <div
                className="absolute -top-3.5 w-5 h-5 rounded-full border-2 border-[var(--surface-app)] bg-[var(--accent-emerald)] shadow-md animate-pulse z-10"
                style={{
                  left: `calc(${newPercent}% - 10px)`,
                  transition: 'left 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                title={`New ETA: ${scenarioResult.newEta.arrivalDate}`}
              />
            )}
            {scenarioResult.hasActiveScenario && (
              <span
                className="absolute -top-8 text-[11px] font-bold text-[var(--accent-emerald)] tabular-nums whitespace-nowrap bg-[var(--accent-emerald-light)] px-2 py-0.5 rounded-md border border-[var(--accent-emerald)]/30 shadow-xs z-10"
                style={{
                  left: `calc(${newPercent}% - 28px)`,
                  transition: 'left 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {scenarioResult.newEta.arrivalDate}
              </span>
            )}
          </div>
        </div>

        {/* Real-time Surplus & ETA Delta summary */}
        <div className="pt-4 border-t border-[var(--line-border)] flex items-center justify-between text-xs">
          <div>
            <span className="text-[var(--ink-muted)] block">Monthly Surplus</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-bold tabular-nums">
              <span className="text-[var(--ink-primary)]">
                {formatINR(scenarioResult.beforeSurplus)}
              </span>
              {scenarioResult.hasActiveScenario && (
                <>
                  <ArrowRight size={12} className="text-[var(--ink-muted)]" />
                  <span
                    className={
                      scenarioResult.surplusDelta >= 0
                        ? 'text-[var(--accent-emerald)]'
                        : 'text-[var(--alert-coral)]'
                    }
                  >
                    {formatINR(scenarioResult.afterSurplus)}
                    ({scenarioResult.surplusDelta >= 0 ? '+' : ''}
                    {formatINR(scenarioResult.surplusDelta)})
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[var(--ink-muted)] block">Arrival Date</span>
            <span className="font-bold text-[var(--ink-primary)] mt-0.5 block">
              {scenarioResult.newEta.arrivalDate}
            </span>
          </div>
        </div>
      </section>

      {/* Interactive What-If Scenarios Section */}
      <section className="card-durung p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-[var(--ink-primary)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-primary)]">
              Interactive What-If Modeling
            </h3>
          </div>
          {scenarioResult.hasActiveScenario && (
            <button
              onClick={handleResetSliders}
              className="text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink-primary)] flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Slider 1: Dining & Variable Cut */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-[var(--ink-primary)]">Cut Dining Out & Food</span>
            <span className="font-bold text-[var(--accent-emerald)] tabular-nums">
              -{diningCutPct}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={diningCutPct}
            onChange={(e) => setDiningCutPct(parseInt(e.target.value, 10))}
            className="w-full accent-[var(--accent-emerald)] h-2 bg-[var(--surface-secondary)] rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[var(--ink-muted)]">
            <span>Normal spend</span>
            <span>-50% discipline</span>
          </div>
        </div>

        {/* Slider 2: Rent Change */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-[var(--ink-primary)]">Rent Adjustment</span>
            <span
              className={`font-bold tabular-nums ${
                rentDelta > 0 ? 'text-[var(--alert-coral)]' : rentDelta < 0 ? 'text-[var(--accent-emerald)]' : 'text-[var(--ink-primary)]'
              }`}
            >
              {rentDelta > 0 ? '+' : ''}
              {formatINR(rentDelta)}/mo
            </span>
          </div>
          <input
            type="range"
            min="-5000"
            max="10000"
            step="1000"
            value={rentDelta}
            onChange={(e) => setRentDelta(parseInt(e.target.value, 10))}
            className="w-full accent-[var(--ink-primary)] h-2 bg-[var(--surface-secondary)] rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[var(--ink-muted)]">
            <span>-₹5k (cheaper)</span>
            <span>+₹10k (upgrade)</span>
          </div>
        </div>

        {/* Slider 3: Side Income Boost */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-[var(--ink-primary)]">Monthly Income Boost</span>
            <span className="font-bold text-[var(--accent-emerald)] tabular-nums">
              +{formatINR(incomeBoost)}/mo
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="30000"
            step="2500"
            value={incomeBoost}
            onChange={(e) => setIncomeBoost(parseInt(e.target.value, 10))}
            className="w-full accent-[var(--accent-emerald)] h-2 bg-[var(--surface-secondary)] rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[var(--ink-muted)]">
            <span>₹0</span>
            <span>+₹30,000/mo</span>
          </div>
        </div>

        {/* Save as Plan CTA */}
        {scenarioResult.hasActiveScenario && (
          <button
            onClick={handleSaveAsPlan}
            className="w-full py-3.5 rounded-[16px] bg-[var(--accent-emerald)] text-white font-semibold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs"
          >
            <Check size={16} strokeWidth={2.2} />
            <span>Save as Active Plan</span>
          </button>
        )}
      </section>

      {/* Goals List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Active Financial Targets
          </h3>
          <span className="text-xs text-[var(--ink-muted)]">{goals.length} target</span>
        </div>

        <div className="space-y-2.5">
          {goals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const eta = calculateGoalETA(goal, metrics.monthlySurplus);

            return (
              <div key={goal.id} className="card-durung p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-[var(--accent-emerald)]" />
                    <span className="text-sm font-bold text-[var(--ink-primary)]">{goal.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--accent-emerald)]">
                    {eta.arrivalDate}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-[var(--ink-muted)]">
                  <span>
                    Saved <strong className="text-[var(--ink-primary)]">{formatINR(goal.currentAmount)}</strong> of {formatINR(goal.targetAmount)}
                  </span>
                  <span className="font-bold tabular-nums text-[var(--ink-primary)]">{pct}%</span>
                </div>

                <div className="w-full h-2 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-emerald)] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
