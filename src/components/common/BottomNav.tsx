import React from 'react';
import { Home, ListOrdered, GitFork, BarChart3 } from 'lucide-react';

export type TabKey = 'home' | 'ledger' | 'plan' | 'report';

interface BottomNavProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  uncategorizedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  uncategorizedCount,
}) => {
  const tabs = [
    { key: 'home' as TabKey, label: 'Home', icon: Home },
    { key: 'ledger' as TabKey, label: 'Ledger', icon: ListOrdered, badge: uncategorizedCount > 0 ? uncategorizedCount : undefined },
    { key: 'plan' as TabKey, label: 'Plan', icon: GitFork },
    { key: 'report' as TabKey, label: 'Report', icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-center bg-[var(--surface-app)]/90 backdrop-blur-md border-t border-[var(--line-border)] py-1.5 px-3">
      <div className="w-full max-w-[480px] flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-[12px] min-w-[64px] min-h-[48px] relative transition-all active:scale-95 ${
                isActive ? 'text-[var(--accent-emerald)] font-bold' : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[var(--alert-coral)] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight mt-1">{tab.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[var(--accent-emerald)] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
