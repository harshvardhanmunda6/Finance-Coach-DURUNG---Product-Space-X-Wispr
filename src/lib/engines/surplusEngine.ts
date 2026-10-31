/**
 * Durung Surplus & Goal ETA Engine
 * Plain TypeScript, zero LLM, strictly deterministic arithmetic.
 *
 * Formulas:
 * 1. Total Fixed Costs = sum of user profile fixed costs.
 * 2. 3-Month Average Variable Spend = variable expenses in the past 90 days divided by 3.
 * 3. Monthly Surplus = income - fixed costs - 3-month average variable spend.
 * 4. Goal ETA = months to reach target = (targetAmount - currentAmount) / monthlySurplus.
 * 5. Scenario Simulation: applies delta to category/fixed cost, recomputes surplus and ETA shift.
 */

import { Goal, Transaction, UserProfile, ScenarioImpact } from '../../types/finance';

export interface SurplusMetrics {
  monthlyIncome: number;
  totalFixedCosts: number;
  threeMonthVariableAverage: number;
  monthlySurplus: number;
  currentMonthSpent: number;
  currentMonthLeft: number;
  daysInMonth: number;
  daysElapsed: number;
  dailyIdealBurn: number;
  dailyActualBurn: number;
  spendPaceRatio: number; // e.g. 1.05 means spent 5% faster than month elapsed
  runwayMonths: number; // Emergency fund / total monthly burn
}

export function computeSurplusMetrics(
  profile: UserProfile,
  transactions: Transaction[],
  referenceDate: Date = new Date()
): SurplusMetrics {
  const monthlyIncome = profile.monthlyIncome || 0;
  const totalFixedCosts = (profile.fixedCosts || []).reduce((acc, curr) => acc + curr.amount, 0);

  // Filter variable expenses from past 90 days (excluding income and transfers)
  const refTime = referenceDate.getTime();
  const ninetyDaysAgo = refTime - 90 * 24 * 60 * 60 * 1000;

  // Identify fixed cost merchant keys to avoid double-counting in variable
  const fixedCostKeys = new Set(
    (profile.fixedCosts || [])
      .map((fc) => fc.merchantKey || fc.name.toLowerCase().trim())
  );

  const past90Expenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const tTime = new Date(t.date).getTime();
    if (tTime < ninetyDaysAgo || tTime > refTime) return false;
    // Don't count known fixed costs in variable average
    if (fixedCostKeys.has(t.merchantKey) || t.category === 'Rent & Housing') return false;
    return true;
  });

  const sumPast90Variable = past90Expenses.reduce((sum, t) => sum + t.amount, 0);
  const threeMonthVariableAverage = Math.round(sumPast90Variable / 3);

  // Monthly surplus
  const monthlySurplus = Math.max(0, monthlyIncome - totalFixedCosts - threeMonthVariableAverage);

  // Current month pace calculation
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysElapsed = Math.max(1, referenceDate.getDate());

  // Current month variable expenses so far
  const currentMonthExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const currentMonthSpent = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  
  // Total monthly budget is income minus fixed cost commitments or planned variable budget
  const monthlyVariableBudget = Math.max(0, monthlyIncome - totalFixedCosts);
  const currentMonthLeft = Math.max(0, monthlyVariableBudget - currentMonthSpent);

  const dailyIdealBurn = monthlyVariableBudget / daysInMonth;
  const dailyActualBurn = currentMonthSpent / daysElapsed;
  
  const monthPercentElapsed = (daysElapsed / daysInMonth);
  const budgetPercentSpent = monthlyVariableBudget > 0 ? (currentMonthSpent / monthlyVariableBudget) : 0;
  const spendPaceRatio = monthPercentElapsed > 0 ? budgetPercentSpent / monthPercentElapsed : 1;

  // Runway months (Emergency fund / monthly mandatory expenses)
  const monthlyBurn = totalFixedCosts + (threeMonthVariableAverage > 0 ? threeMonthVariableAverage * 0.7 : 20000);
  const runwayMonths = monthlyBurn > 0 ? Number(((profile.emergencyFundSaved || 0) / monthlyBurn).toFixed(1)) : 0;

  return {
    monthlyIncome,
    totalFixedCosts,
    threeMonthVariableAverage,
    monthlySurplus,
    currentMonthSpent,
    currentMonthLeft,
    daysInMonth,
    daysElapsed,
    dailyIdealBurn: Math.round(dailyIdealBurn),
    dailyActualBurn: Math.round(dailyActualBurn),
    spendPaceRatio: Number(spendPaceRatio.toFixed(2)),
    runwayMonths,
  };
}

/**
 * Calculates arrival date for a financial goal based on monthly surplus
 */
export function calculateGoalETA(
  goal: Goal,
  monthlySurplus: number,
  referenceDate: Date = new Date()
): { arrivalDate: string; monthsToGoal: number; onTrack: boolean } {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  if (remainingAmount <= 0) {
    return {
      arrivalDate: 'Completed',
      monthsToGoal: 0,
      onTrack: true,
    };
  }

  if (monthlySurplus <= 0) {
    return {
      arrivalDate: 'Surplus needed',
      monthsToGoal: 999,
      onTrack: false,
    };
  }

  const monthsToGoal = remainingAmount / monthlySurplus;
  const daysToGoal = Math.round(monthsToGoal * 30.4375);

  const targetDateObj = new Date(referenceDate.getTime() + daysToGoal * 24 * 60 * 60 * 1000);
  const arrivalDate = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(targetDateObj);

  // Check if arrival date is before or on the goal's target date
  const goalTargetTime = new Date(goal.targetDate).getTime();
  const onTrack = !isNaN(goalTargetTime) ? targetDateObj.getTime() <= goalTargetTime : true;

  return {
    arrivalDate,
    monthsToGoal: Number(monthsToGoal.toFixed(1)),
    onTrack,
  };
}

/**
 * Simulate scenario: applies delta (e.g. Dining -30%, Rent +₹4000)
 */
export function simulateScenario(
  profile: UserProfile,
  transactions: Transaction[],
  goal: Goal | undefined,
  type: 'category_cut' | 'rent_change' | 'income_boost' | 'subscription_drop' | 'custom',
  target: string, // e.g. "Food & Dining" or "Rent"
  delta: number, // percentage (e.g. -30) or absolute amount (e.g. 4000)
  isPercent: boolean = true,
  referenceDate: Date = new Date()
): ScenarioImpact {
  const baseMetrics = computeSurplusMetrics(profile, transactions, referenceDate);
  const baseSurplus = baseMetrics.monthlySurplus;
  const baseEta = goal ? calculateGoalETA(goal, baseSurplus, referenceDate) : { arrivalDate: 'N/A', monthsToGoal: 0, onTrack: true };

  let simulatedSurplus = baseSurplus;
  let summary = '';

  if (type === 'category_cut') {
    // Delta is percentage cut of category spend, e.g. -30 means save 30% of category spend
    const categoryExpenses = transactions.filter(
      (t) => t.type === 'expense' && t.category.toLowerCase().includes(target.toLowerCase())
    );
    const ninetyDaysAgo = referenceDate.getTime() - 90 * 24 * 60 * 60 * 1000;
    const cat90Spend = categoryExpenses
      .filter((t) => new Date(t.date).getTime() >= ninetyDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    const catMonthlyAvg = cat90Spend > 0 ? cat90Spend / 3 : 8000;

    const cutFactor = isPercent ? Math.abs(delta) / 100 : delta / catMonthlyAvg;
    const monthlySavings = Math.round(catMonthlyAvg * cutFactor);
    simulatedSurplus = baseSurplus + monthlySavings;
    summary = `Cutting ${target} by ${Math.abs(delta)}% saves ₹${monthlySavings.toLocaleString('en-IN')}/mo`;
  } else if (type === 'rent_change') {
    // Delta is positive or negative change in rent (absolute)
    const rentChange = delta;
    simulatedSurplus = Math.max(0, baseSurplus - rentChange);
    summary = `Rent ${rentChange > 0 ? '+' : ''}₹${rentChange.toLocaleString('en-IN')}/mo shifts surplus by -₹${rentChange.toLocaleString('en-IN')}`;
  } else if (type === 'income_boost') {
    const boost = delta;
    simulatedSurplus = baseSurplus + boost;
    summary = `Income +₹${boost.toLocaleString('en-IN')}/mo boosts surplus directly`;
  } else if (type === 'subscription_drop') {
    const dropAmount = delta;
    simulatedSurplus = baseSurplus + dropAmount;
    summary = `Cancelling ${target} frees up ₹${dropAmount.toLocaleString('en-IN')}/mo`;
  } else {
    // custom delta directly on surplus
    simulatedSurplus = Math.max(0, baseSurplus + delta);
    summary = `Scenario shift of ₹${delta.toLocaleString('en-IN')}/mo`;
  }

  const newEta = goal ? calculateGoalETA(goal, simulatedSurplus, referenceDate) : { arrivalDate: 'N/A', monthsToGoal: 0, onTrack: true };
  const monthsDelta = Number((baseEta.monthsToGoal - newEta.monthsToGoal).toFixed(1));

  return {
    type,
    target,
    delta,
    isPercent,
    beforeSurplus: baseSurplus,
    afterSurplus: simulatedSurplus,
    surplusDelta: simulatedSurplus - baseSurplus,
    goalEtaBefore: baseEta.arrivalDate,
    goalEtaAfter: newEta.arrivalDate,
    monthsDelta,
    summary,
  };
}
