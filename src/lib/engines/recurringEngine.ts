/**
 * Durung Recurring Expenses & Subscription Detector Engine
 *
 * Algorithm:
 * - Groups expenses by normalized merchantKey.
 * - Checks for recurrence in 3+ consecutive calendar months (or 2+ recent recurring cycles)
 *   with an inter-transaction gap of 26-35 days and amount variance within ±10%.
 * - Flags price changes if latest amount differs by > 10% from previous cycle.
 */

import { Subscription, Transaction } from '../../types/finance';
import { MERCHANT_MAP } from '../merchants';

export interface DetectedSubscriptionCandidate {
  merchantKey: string;
  name: string;
  domain: string;
  currentAmount: number;
  previousAmount?: number;
  priceChanged: boolean;
  priceChangePercent?: number;
  category: string;
  lastChargeDate: string;
  occurrenceCount: number;
}

export function detectRecurringSubscriptions(
  transactions: Transaction[],
  existingSubscriptions: Subscription[] = []
): Subscription[] {
  // Map existing subscriptions by merchantKey to preserve inactive flags
  const existingMap = new Map<string, Subscription>();
  existingSubscriptions.forEach((sub) => existingMap.set(sub.merchantKey, sub));

  // Filter only debit expenses
  const expenses = transactions
    .filter((t) => t.type === 'expense' && t.amount > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group by merchantKey
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of expenses) {
    const key = t.merchantKey;
    if (!byMerchant.has(key)) {
      byMerchant.set(key, []);
    }
    byMerchant.get(key)!.push(t);
  }

  const results: Subscription[] = [];

  for (const [key, txList] of byMerchant.entries()) {
    // If user already registered this as a subscription or has 2+ occurrences
    if (txList.length < 2) continue;

    // Check consecutive gaps
    let recurringCount = 1;
    let priceChanged = false;
    let prevAmount: number | undefined;

    for (let i = 1; i < txList.length; i++) {
      const prev = txList[i - 1];
      const curr = txList[i];
      const prevDate = new Date(prev.date).getTime();
      const currDate = new Date(curr.date).getTime();
      const gapDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

      // Monthly recurring gap is typically 26-35 days
      if (gapDays >= 25 && gapDays <= 36) {
        recurringCount++;
        // Check amount difference
        const amountDiff = Math.abs(curr.amount - prev.amount);
        const diffRatio = amountDiff / prev.amount;
        if (diffRatio > 0.10) {
          priceChanged = true;
          prevAmount = prev.amount;
        }
      }
    }

    // Known subscription services (Netflix, Spotify, Cult.fit, Jio) or detected 2+ regular cycles
    const meta = MERCHANT_MAP[key];
    const isKnownService = !!meta && (
      meta.defaultCategory === 'Subscriptions' ||
      meta.defaultCategory === 'Utilities & Bills' ||
      meta.defaultCategory === 'Health & Fitness'
    );

    if (recurringCount >= 2 || (isKnownService && txList.length >= 2)) {
      const latestTx = txList[txList.length - 1];
      const priorTx = txList.length > 1 ? txList[txList.length - 2] : undefined;

      const currentAmount = latestTx.amount;
      const calculatedPrevAmount = prevAmount || (priorTx && Math.abs(currentAmount - priorTx.amount) / priorTx.amount > 0.10 ? priorTx.amount : undefined);

      const existing = existingMap.get(key);

      results.push({
        id: existing?.id || `sub_${key}`,
        name: meta?.name || latestTx.merchantClean || key.toUpperCase(),
        merchantKey: key,
        domain: meta?.domain || `${key}.com`,
        amount: currentAmount,
        previousAmount: calculatedPrevAmount,
        billingFrequency: 'monthly',
        category: meta?.defaultCategory || latestTx.category || 'Subscriptions',
        lastChargeDate: latestTx.date,
        flaggedInactive: existing ? existing.flaggedInactive : false,
      });
    }
  }

  return results;
}
