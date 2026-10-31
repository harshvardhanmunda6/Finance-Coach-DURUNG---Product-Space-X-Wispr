import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Mic, ArrowRight, Sparkles, Check, RefreshCw } from 'lucide-react';
import { formatINR } from '../../lib/formatters';
import { UserProfile, Goal } from '../../types/finance';

export const OnboardingScreen: React.FC = () => {
  const { loadSampleData, completeOnboarding } = useFinance();
  const [speechInput, setSpeechInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{
    profile: UserProfile;
    goal: Goal;
  } | null>(null);

  const sampleVoiceIntroductions = [
    'I make 60k at a startup in Bangalore, pay 22k rent via UPI, and want to save 80k for a Goa trip by March.',
    'Earn 75k monthly, fixed rent + bills is 25k, currently have 1.2 Lakh saved, saving for a new laptop.',
    'Salary 55k, rent 18k, dining out around 10k, building a 3-month emergency reserve.',
  ];

  const handleParseSpeech = async (inputStr?: string) => {
    const text = (inputStr || speechInput).trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/parse-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speechText: text }),
      });
      const data = await res.json();

      const profile: UserProfile = {
        name: data.name || 'Friend',
        monthlyIncome: data.monthlyIncome || 60000,
        fixedCosts: (data.fixedCosts || []).map((fc: any, i: number) => ({
          id: `fc_${i}`,
          name: fc.name,
          amount: fc.amount,
          category: fc.category || 'Rent & Housing',
        })),
        emergencyFundSaved: data.emergencyFund || 50000,
        hasCompletedOnboarding: true,
        createdAt: new Date().toISOString(),
      };

      const goal: Goal = {
        id: `goal_${Date.now()}`,
        name: data.goal?.name || 'Primary Goal',
        targetAmount: data.goal?.targetAmount || 80000,
        currentAmount: Math.round((data.goal?.targetAmount || 80000) * 0.3),
        targetDate: data.goal?.targetDate || '2027-03-31',
        category: 'Savings',
        color: '#1F6F5B',
      };

      setParsedPreview({ profile, goal });
    } catch (e) {
      console.warn('Fallback to standard onboarding model:', e);
      // Fallback
      setParsedPreview({
        profile: {
          name: 'You',
          monthlyIncome: 60000,
          fixedCosts: [
            { id: 'fc_rent', name: 'Apartment Rent', amount: 22000, category: 'Rent & Housing' },
            { id: 'fc_bills', name: 'Utilities & Bills', amount: 2100, category: 'Utilities & Bills' },
          ],
          emergencyFundSaved: 60000,
          hasCompletedOnboarding: true,
          createdAt: new Date().toISOString(),
        },
        goal: {
          id: 'goal_trip',
          name: 'Goa Vacation',
          targetAmount: 80000,
          currentAmount: 25000,
          targetDate: '2027-03-31',
          color: '#1F6F5B',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOnboarding = () => {
    if (!parsedPreview) return;
    completeOnboarding(parsedPreview.profile, parsedPreview.goal);
  };

  return (
    <div className="min-h-screen p-6 flex flex-col justify-between max-w-[480px] mx-auto bg-[var(--bg-app)]">
      {/* Top Brand & Hook */}
      <div className="pt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#1A1A1D] border border-[var(--line-border)] p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <img
              src="/assets/aistudio/file_00000000712c8207a7cd8dc050f00162_2_568880dc.jpg"
              alt="Durung Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)] text-[11px] font-semibold">
              <Sparkles size={12} />
              <span>Durung Personal Finance</span>
            </span>
            <p className="text-xs text-[var(--ink-muted)] font-medium mt-0.5">Voice-first living money model</p>
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[var(--ink-primary)] leading-tight">
          Tell me about your money in your own words.
        </h1>
        <p className="text-sm text-[var(--ink-muted)] mt-2">
          No endless forms or categorizing receipts manually. Tell Durung your salary, rent, and goals.
        </p>
      </div>

      {/* Middle Interactive Input or Parsed Confirmation Card */}
      <div className="my-6">
        {!parsedPreview ? (
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={speechInput}
                onChange={(e) => setSpeechInput(e.target.value)}
                placeholder="e.g. &ldquo;I make ₹60,000/month, rent is ₹22,000 via UPI, and I'm saving for a Goa trip.&rdquo;"
                rows={3}
                className="w-full p-4 rounded-[20px] bg-[var(--surface-app)] border border-[var(--line-border)] text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] shadow-xs resize-none"
              />
              <button
                onClick={() => handleParseSpeech()}
                disabled={!speechInput.trim() || isLoading}
                className={`absolute bottom-3 right-3 p-2.5 rounded-[12px] transition-all ${
                  speechInput.trim()
                    ? 'bg-[var(--ink-primary)] text-white active:scale-95'
                    : 'bg-[var(--surface-secondary)] text-[var(--ink-muted)] opacity-50 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
              </button>
            </div>

            {/* Tap quick speech phrases */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                Or tap a spoken example:
              </p>
              <div className="space-y-2">
                {sampleVoiceIntroductions.map((phrase, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSpeechInput(phrase);
                      handleParseSpeech(phrase);
                    }}
                    className="w-full text-left text-xs p-3 rounded-[14px] bg-[var(--surface-app)] border border-[var(--line-border)] hover:border-[var(--ink-muted)] text-[var(--ink-primary)] active:scale-98 transition-all flex items-center justify-between"
                  >
                    <span className="line-clamp-2">&ldquo;{phrase}&rdquo;</span>
                    <Sparkles size={14} className="text-[var(--accent-emerald)] shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Confirmation card preview parsed from speech */
          <div className="p-5 rounded-[24px] bg-[var(--surface-app)] border border-[var(--line-border)] shadow-lg space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-emerald)]">
                AI Parsed Money Model
              </span>
              <button
                onClick={() => setParsedPreview(null)}
                className="text-xs text-[var(--ink-muted)] hover:underline"
              >
                Edit statement
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-[14px] bg-[var(--surface-secondary)]">
                <span className="text-[11px] text-[var(--ink-muted)] block">Monthly Income</span>
                <span className="text-base font-bold text-[var(--ink-primary)] tabular-nums">
                  {formatINR(parsedPreview.profile.monthlyIncome)}
                </span>
              </div>
              <div className="p-3 rounded-[14px] bg-[var(--surface-secondary)]">
                <span className="text-[11px] text-[var(--ink-muted)] block">Fixed Costs</span>
                <span className="text-base font-bold text-[var(--ink-primary)] tabular-nums">
                  {formatINR(
                    parsedPreview.profile.fixedCosts.reduce((acc, fc) => acc + fc.amount, 0)
                  )}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-[14px] bg-[var(--surface-secondary)]">
              <span className="text-[11px] text-[var(--ink-muted)] block">Target Goal</span>
              <div className="flex justify-between items-center mt-0.5">
                <span className="text-sm font-semibold text-[var(--ink-primary)]">
                  {parsedPreview.goal.name}
                </span>
                <span className="text-sm font-bold text-[var(--accent-emerald)] tabular-nums">
                  {formatINR(parsedPreview.goal.targetAmount)}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmOnboarding}
              className="w-full py-3.5 rounded-[16px] bg-[var(--accent-emerald)] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm"
            >
              <Check size={18} strokeWidth={2.2} />
              <span>Confirm & Launch Durung</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Try with Sample Data CTA */}
      <div className="pb-4 pt-2">
        <button
          onClick={loadSampleData}
          className="w-full py-4 px-6 rounded-[20px] bg-[var(--surface-app)] border border-[var(--line-border)] hover:bg-[var(--surface-secondary)] active:scale-98 transition-all flex items-center justify-center gap-3 text-sm font-bold text-[var(--ink-primary)] shadow-xs"
        >
          <RefreshCw size={17} className="text-[var(--accent-emerald)]" />
          <span>Try with 90-day realistic sample data</span>
        </button>
        <p className="text-center text-[11px] text-[var(--ink-muted)] mt-2.5">
          ₹60,000 salary, ₹22,000 rent, Netflix, Swiggy, and Goa goal ready to test.
        </p>
      </div>
    </div>
  );
};
