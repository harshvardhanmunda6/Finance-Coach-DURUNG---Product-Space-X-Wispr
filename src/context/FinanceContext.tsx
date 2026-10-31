import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  Goal,
  Transaction,
  Subscription,
  ActionPreview,
  ScenarioImpact,
} from '../types/finance';
import { generateSeedData } from '../lib/seedData';
import { detectRecurringSubscriptions } from '../lib/engines/recurringEngine';
import { MERCHANT_MAP } from '../lib/merchants';

interface UndoToastState {
  id: string;
  message: string;
  onUndo: () => void;
  secondsRemaining: number;
}

interface FinanceContextType {
  profile: UserProfile;
  goals: Goal[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  merchantRules: Record<string, string>;
  customBudgets: Record<string, number>;
  activeScenario: ScenarioImpact | null;
  undoToast: UndoToastState | null;
  isFirstRun: boolean;
  addTransactions: (txs: Transaction[]) => void;
  recategorizeMerchant: (merchantKey: string, category: string, applyToPast: boolean) => void;
  toggleSubscriptionInactive: (subId: string) => void;
  updateProfile: (profile: UserProfile) => void;
  updateGoal: (goal: Goal) => void;
  setActiveScenario: (scenario: ScenarioImpact | null) => void;
  executeAction: (action: ActionPreview) => void;
  dismissUndo: () => void;
  loadSampleData: () => void;
  resetAllData: () => void;
  completeOnboarding: (newProfile: UserProfile, newGoal?: Goal) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILE: 'durung_profile_v2',
  GOALS: 'durung_goals_v2',
  TRANSACTIONS: 'durung_transactions_v2',
  SUBSCRIPTIONS: 'durung_subscriptions_v2',
  RULES: 'durung_rules_v2',
  BUDGETS: 'durung_budgets_v2',
  FIRST_RUN: 'durung_first_run_v2',
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return generateSeedData().profile;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return generateSeedData().goals;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return generateSeedData().transactions;
  });

  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return generateSeedData().subscriptions;
  });

  const [merchantRules, setMerchantRules] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RULES);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {};
  });

  const [customBudgets, setCustomBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {};
  });

  const [isFirstRun, setIsFirstRun] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.FIRST_RUN) === 'false' ? false : false;
  });

  const [activeScenario, setActiveScenario] = useState<ScenarioImpact | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
  }, [subscriptions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(merchantRules));
  }, [merchantRules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(customBudgets));
  }, [customBudgets]);

  // Recalculate subscriptions dynamically when transactions or rules change
  useEffect(() => {
    const detected = detectRecurringSubscriptions(transactions, subscriptions);
    if (detected.length > 0) {
      setSubscriptions((prev) => {
        // preserve flags from prev
        const prevMap = new Map(prev.map((s) => [s.merchantKey, s.flaggedInactive]));
        return detected.map((s) => ({
          ...s,
          flaggedInactive: prevMap.has(s.merchantKey) ? prevMap.get(s.merchantKey)! : s.flaggedInactive,
        }));
      });
    }
  }, [transactions.length]);

  // 8-second countdown timer for Undo Toast
  useEffect(() => {
    if (!undoToast) return;
    const interval = setInterval(() => {
      setUndoToast((prev) => {
        if (!prev) return null;
        if (prev.secondsRemaining <= 1) {
          return null;
        }
        return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [undoToast?.id]);

  const showUndoToast = useCallback((message: string, onUndo: () => void) => {
    setUndoToast({
      id: `undo_${Date.now()}`,
      message,
      onUndo,
      secondsRemaining: 8,
    });
  }, []);

  const dismissUndo = useCallback(() => {
    setUndoToast(null);
  }, []);

  // Add transactions with 8s undo
  const addTransactions = useCallback((newTxs: Transaction[]) => {
    const prevTxs = [...transactions];
    
    // Apply learned rules automatically if exists
    const processed = newTxs.map((t) => {
      if (merchantRules[t.merchantKey]) {
        return {
          ...t,
          category: merchantRules[t.merchantKey],
          isUncategorized: false,
          confidence: 1.0,
        };
      }
      return t;
    });

    setTransactions((prev) => [...processed, ...prev]);

    showUndoToast(
      newTxs.length === 1 ? `Added ${newTxs[0].merchantClean} (₹${newTxs[0].amount.toLocaleString('en-IN')})` : `Added ${newTxs.length} transactions`,
      () => {
        setTransactions(prevTxs);
      }
    );
  }, [transactions, merchantRules, showUndoToast]);

  // Recategorize merchant and apply to past
  const recategorizeMerchant = useCallback((merchantKey: string, category: string, applyToPast: boolean) => {
    const prevTxs = [...transactions];
    const prevRules = { ...merchantRules };

    // Update rule
    setMerchantRules((prev) => ({
      ...prev,
      [merchantKey]: category,
    }));

    let affectedCount = 0;
    if (applyToPast) {
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.merchantKey === merchantKey) {
            affectedCount++;
            return {
              ...t,
              category,
              isUncategorized: false,
              confidence: 1.0,
            };
          }
          return t;
        })
      );
    }

    const merchantLabel = MERCHANT_MAP[merchantKey]?.name || merchantKey.toUpperCase();
    const toastMsg = applyToPast && affectedCount > 0
      ? `Learned: ${merchantLabel} -> ${category}. Applied to ${affectedCount} past`
      : `Learned: ${merchantLabel} -> ${category}`;

    showUndoToast(toastMsg, () => {
      setTransactions(prevTxs);
      setMerchantRules(prevRules);
    });
  }, [transactions, merchantRules, showUndoToast]);

  // Toggle subscription inactive ("I don't use this")
  const toggleSubscriptionInactive = useCallback((subId: string) => {
    const prevSubs = [...subscriptions];
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, flaggedInactive: !s.flaggedInactive } : s))
    );
    const sub = subscriptions.find((s) => s.id === subId);
    if (sub) {
      showUndoToast(
        sub.flaggedInactive ? `Re-activated ${sub.name}` : `Flagged ${sub.name} as unused`,
        () => setSubscriptions(prevSubs)
      );
    }
  }, [subscriptions, showUndoToast]);

  const updateProfile = useCallback((newProfile: UserProfile) => {
    setProfile(newProfile);
  }, []);

  const updateGoal = useCallback((newGoal: Goal) => {
    setGoals((prev) => prev.map((g) => (g.id === newGoal.id ? newGoal : g)));
  }, []);

  // Action execution engine
  const executeAction = useCallback((action: ActionPreview) => {
    if (action.actionType === 'add_transactions' || action.actionType === 'parse_sms_batch') {
      const txs = action.data?.transactions || [];
      if (txs.length > 0) {
        addTransactions(txs);
      }
    } else if (action.actionType === 'recategorize_merchant') {
      const { merchantKey, category, applyToPast = true } = action.data;
      if (merchantKey && category) {
        recategorizeMerchant(merchantKey, category, applyToPast);
      }
    } else if (action.actionType === 'simulate_scenario') {
      // Applied in plan view
      setActiveScenario(action.data);
    } else if (action.actionType === 'flag_subscription') {
      const { merchantKey, flaggedInactive } = action.data;
      const targetSub = subscriptions.find((s) => s.merchantKey === merchantKey);
      if (targetSub) {
        toggleSubscriptionInactive(targetSub.id);
      }
    } else if (action.actionType === 'set_goal') {
      const { name, targetAmount, targetDate, currentAmount = 0 } = action.data;
      const newGoal: Goal = {
        id: `goal_${Date.now()}`,
        name,
        targetAmount,
        targetDate: targetDate || '2027-06-30',
        currentAmount,
        color: '#1F6F5B',
      };
      setGoals((prev) => [newGoal, ...prev]);
      showUndoToast(`Created goal: ${name}`, () => {
        setGoals((prev) => prev.filter((g) => g.id !== newGoal.id));
      });
    }
  }, [addTransactions, recategorizeMerchant, subscriptions, toggleSubscriptionInactive, showUndoToast]);

  const loadSampleData = useCallback(() => {
    const seed = generateSeedData();
    setProfile(seed.profile);
    setGoals(seed.goals);
    setTransactions(seed.transactions);
    setSubscriptions(seed.subscriptions);
    setMerchantRules({});
    setActiveScenario(null);
    localStorage.setItem(STORAGE_KEYS.FIRST_RUN, 'false');
    setIsFirstRun(false);
  }, []);

  const resetAllData = useCallback(() => {
    localStorage.clear();
    const seed = generateSeedData();
    setProfile({
      name: 'Salaried Earner',
      monthlyIncome: 60000,
      fixedCosts: [],
      emergencyFundSaved: 0,
      hasCompletedOnboarding: false,
      createdAt: new Date().toISOString(),
    });
    setGoals([]);
    setTransactions([]);
    setSubscriptions([]);
    setMerchantRules({});
    setCustomBudgets({});
    setActiveScenario(null);
    setIsFirstRun(true);
  }, []);

  const completeOnboarding = useCallback((newProfile: UserProfile, newGoal?: Goal) => {
    setProfile(newProfile);
    if (newGoal) {
      setGoals([newGoal]);
    }
    localStorage.setItem(STORAGE_KEYS.FIRST_RUN, 'false');
    setIsFirstRun(false);
  }, []);

  return (
    <FinanceContext.Provider
      value={{
        profile,
        goals,
        transactions,
        subscriptions,
        merchantRules,
        customBudgets,
        activeScenario,
        undoToast,
        isFirstRun,
        addTransactions,
        recategorizeMerchant,
        toggleSubscriptionInactive,
        updateProfile,
        updateGoal,
        setActiveScenario,
        executeAction,
        dismissUndo,
        loadSampleData,
        resetAllData,
        completeOnboarding,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
