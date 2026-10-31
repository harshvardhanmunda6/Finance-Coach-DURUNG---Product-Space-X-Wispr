import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Header } from './components/common/Header';
import { BottomNav, TabKey } from './components/common/BottomNav';
import { CommandBar } from './components/common/CommandBar';
import { UndoToast } from './components/common/UndoToast';
import { SettingsSheet } from './components/common/SettingsSheet';
import { HomeScreen } from './components/tabs/HomeScreen';
import { LedgerScreen } from './components/tabs/LedgerScreen';
import { PlanScreen } from './components/tabs/PlanScreen';
import { ReportScreen } from './components/tabs/ReportScreen';
import { OnboardingScreen } from './components/tabs/OnboardingScreen';

const MainShell: React.FC = () => {
  const { profile, isFirstRun, transactions } = useFinance();
  const [currentTab, setCurrentTab] = useState<TabKey>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const uncategorizedCount = transactions.filter((t) => t.isUncategorized).length;

  if (isFirstRun || !profile.hasCompletedOnboarding) {
    return (
      <div className="min-h-screen cream-canvas text-[var(--ink-primary)] flex justify-center">
        <div className="w-full max-w-[480px] min-h-screen cream-canvas relative sm:shadow-2xl sm:border-x sm:border-[var(--line-border)]">
          <OnboardingScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cream-canvas text-[var(--ink-primary)] flex justify-center selection:bg-[var(--accent-emerald-light)] selection:text-[var(--accent-emerald)]">
      {/* Centered 480px Column on Desktop / Full Width on Mobile */}
      <div className="w-full max-w-[480px] min-h-screen cream-canvas relative sm:shadow-2xl sm:border-x sm:border-[var(--line-border)] flex flex-col justify-between">
        {/* Undo Toast Notification */}
        <UndoToast />

        {/* Top Sticky Header */}
        <Header onOpenSettings={() => setIsSettingsOpen(true)} />

        {/* Tab Content */}
        <main className="flex-1 w-full">
          {currentTab === 'home' && (
            <HomeScreen onNavigateTab={(tab) => setCurrentTab(tab)} />
          )}
          {currentTab === 'ledger' && <LedgerScreen />}
          {currentTab === 'plan' && <PlanScreen />}
          {currentTab === 'report' && <ReportScreen />}
        </main>

        {/* Persistent Command Bar (sits above bottom tab bar) */}
        <CommandBar onNavigateTab={setCurrentTab} />

        {/* Fixed Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          uncategorizedCount={uncategorizedCount}
        />

        {/* Settings and Data Drawer */}
        <SettingsSheet
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <MainShell />
    </FinanceProvider>
  );
}
