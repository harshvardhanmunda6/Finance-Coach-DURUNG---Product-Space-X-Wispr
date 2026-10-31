/**
 * Durung Finance Domain Types
 */

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  amount: number;
  type: TransactionType;
  merchantRaw: string;
  merchantClean: string;
  merchantKey: string; // normalized lowercase key, e.g. "swiggy", "rahul"
  domain?: string;
  category: string;
  confidence: number; // 0.0 to 1.0. <0.7 is flagged uncategorized
  isUncategorized: boolean;
  notes?: string;
  smsRef?: string;
  status?: 'completed' | 'pending';
}

export interface FixedCost {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueDate?: number; // day of month (1-31)
  merchantKey?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category?: string;
  color?: string;
}

export interface UserProfile {
  name: string;
  monthlyIncome: number;
  fixedCosts: FixedCost[];
  emergencyFundSaved: number;
  hasCompletedOnboarding: boolean;
  createdAt: string;
}

export interface MerchantRule {
  merchantKey: string;
  category: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  merchantKey: string;
  domain: string;
  amount: number;
  previousAmount?: number;
  billingFrequency: 'monthly' | 'yearly';
  category: string;
  lastChargeDate: string;
  flaggedInactive: boolean; // "I don't use this"
}

export interface CategoryBudget {
  category: string;
  amount: number; // monthly budget in INR
  isCustom: boolean;
}

export interface ScenarioImpact {
  type: 'category_cut' | 'rent_change' | 'income_boost' | 'subscription_drop' | 'custom';
  target: string; // category or name
  delta: number; // e.g. -30 for percent cut, or -4000 for rent drop
  isPercent: boolean;
  beforeSurplus: number;
  afterSurplus: number;
  surplusDelta: number;
  goalEtaBefore: string;
  goalEtaAfter: string;
  monthsDelta: number;
  summary: string;
}

export interface Nudge {
  id: string;
  type: 'drift' | 'price_increase' | 'idle_sub' | 'uncategorized';
  title: string;
  subtitle: string;
  amount?: number;
  actionText?: string;
  actionPayload?: any;
}

export interface ActionPreview {
  id: string;
  actionType:
    | 'add_transactions'
    | 'parse_sms_batch'
    | 'recategorize_merchant'
    | 'update_profile'
    | 'set_goal'
    | 'simulate_scenario'
    | 'flag_subscription'
    | 'answer_from_data'
    | 'refusal';
  title: string;
  description: string;
  data: any;
  requiresConfirmation: boolean;
  isRefusal?: boolean;
  refusalAlternative?: string;
  isOfflineFallback?: boolean;
}

export interface ActionUndoHistory {
  id: string;
  description: string;
  timestamp: number;
  undoFn: () => void;
}
