/**
 * Durung Category Spend Drift & Nudge Engine
 *
 * Formulas:
 * 1. Default Budget = 3-month category average spend (unless customized).
 * 2. Projected Month-End = (Category spend so far / Days elapsed) * Days in month.
 * 3. Drift Alert triggered if Projected Month-End exceeds Budget by >= 10%.
 * 4. Produces at most 2 prioritized nudge cards for the Home screen.
 */

import { Nudge, Transaction, Subscription } from '../../types/finance';

export interface CategoryDriftAnalysis {
  category: string;
  spentSoFar: number;
  budget: number;
  projectedMonthEnd: number;
  driftPercent: number; // e.g. +18%
  isDrifting: boolean;
  excessAmount: number;
}

export function analyzeCategoryDrifts(
  transactions: Transaction[],
  customBudgets: Record<string, number> = {},
  referenceDate: Date = new Date()
): CategoryDriftAnalysis[] {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysElapsed = Math.max(1, referenceDate.getDate());

  const refTime = referenceDate.getTime();
  const ninetyDaysAgo = refTime - 90 * 24 * 60 * 60 * 1000;

  // 1. Calculate 3-month average per category
  const past90ByCat = new Map<string, number>();
  // 2. Current month spend per category
  const currentMonthByCat = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== 'expense' || t.amount <= 0) continue;
    if (t.category === 'Rent & Housing' || t.category === 'Salary & Income') continue;

    const tDate = new Date(t.date);
    const tTime = tDate.getTime();

    // 90 day history
    if (tTime >= ninetyDaysAgo && tTime <= refTime) {
      const sum = past90ByCat.get(t.category) || 0;
      past90ByCat.set(t.category, sum + t.amount);
    }

    // Current calendar month
    if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
      const sum = currentMonthByCat.get(t.category) || 0;
      currentMonthByCat.set(t.category, sum + t.amount);
    }
  }

  const allTrackedCategories = new Set([
    ...Array.from(past90ByCat.keys()),
    ...Array.from(currentMonthByCat.keys()),
    ...Object.keys(customBudgets),
  ]);

  const analyses: CategoryDriftAnalysis[] = [];

  for (const cat of allTrackedCategories) {
    const historical3Mo = past90ByCat.get(cat) || 0;
    const defaultBudget = Math.round(historical3Mo > 0 ? historical3Mo / 3 : 5000);
    const budget = customBudgets[cat] || defaultBudget;

    const spentSoFar = currentMonthByCat.get(cat) || 0;
    const dailyRate = spentSoFar / daysElapsed;
    const projectedMonthEnd = Math.round(dailyRate * daysInMonth);

    const excessAmount = Math.max(0, projectedMonthEnd - budget);
    const driftRatio = budget > 0 ? (projectedMonthEnd - budget) / budget : 0;
    const driftPercent = Math.round(driftRatio * 100);

    const isDrifting = driftRatio >= 0.10 && spentSoFar > 1000;

    analyses.push({
      category: cat,
      spentSoFar,
      budget,
      projectedMonthEnd,
      driftPercent,
      isDrifting,
      excessAmount,
    });
  }

  // Sort descending by excess amount
  return analyses.sort((a, b) => b.excessAmount - a.excessAmount);
}

/**
 * Produces at most 2 relevant, high-impact nudge cards
 */
export function generateNudges(
  drifts: CategoryDriftAnalysis[],
  subscriptions: Subscription[],
  uncategorizedCount: number
): Nudge[] {
  const nudges: Nudge[] = [];

  // 1. Check for subscription price increase (e.g., Netflix price hike)
  const hikedSub = subscriptions.find(
    (s) => s.previousAmount && s.amount > s.previousAmount && !s.flaggedInactive
  );
  if (hikedSub && hikedSub.previousAmount) {
    const delta = hikedSub.amount - hikedSub.previousAmount;
    nudges.push({
      id: `price_hike_${hikedSub.id}`,
      type: 'price_increase',
      title: `${hikedSub.name} price increased`,
      subtitle: `Now ₹${hikedSub.amount.toLocaleString('en-IN')}/mo (was ₹${hikedSub.previousAmount.toLocaleString('en-IN')}). +₹${delta}/mo impact.`,
      amount: delta,
      actionText: 'Review subscriptions',
    });
  }

  // 2. Check for highest category drift
  const topDrift = drifts.find((d) => d.isDrifting);
  if (topDrift && nudges.length < 2) {
    nudges.push({
      id: `drift_${topDrift.category}`,
      type: 'drift',
      title: `${topDrift.category} trending +${topDrift.driftPercent}% above pace`,
      subtitle: `Projected ₹${topDrift.projectedMonthEnd.toLocaleString('en-IN')} vs normal ₹${topDrift.budget.toLocaleString('en-IN')}.`,
      amount: topDrift.excessAmount,
      actionText: 'Simulate cut',
      actionPayload: { category: topDrift.category, suggestedCut: 20 },
    });
  }

  // 3. Fallback: Uncategorized transactions requiring 1-tap review
  if (uncategorizedCount > 0 && nudges.length < 2) {
    nudges.push({
      id: 'uncategorized_nudge',
      type: 'uncategorized',
      title: `${uncategorizedCount} transactions need learning`,
      subtitle: 'Teach Durung once, and past & future matches categorize automatically.',
      actionText: 'Review in Ledger',
    });
  }

  return nudges.slice(0, 2);
}
