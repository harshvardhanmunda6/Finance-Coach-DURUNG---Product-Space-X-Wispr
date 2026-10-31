import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Mic, ArrowUp, Sparkles, AlertCircle, Check, X, ShieldAlert, WifiOff } from 'lucide-react';
import { ActionPreview } from '../../types/finance';
import { parseOfflineUtterance } from '../../lib/offlineParser';
import { computeSurplusMetrics } from '../../lib/engines/surplusEngine';

const PLACEHOLDERS = [
  "Say: 'Uber 340 yesterday'...",
  "Paste: 'HDFC: debited INR 540 at Swiggy'...",
  "Say: 'What if rent goes up by 4k?'...",
  "Say: '400 on Swiggy, no wait 450'...",
  "Say: 'Kal Zomato pe 380 gaye'...",
];

import { TabKey } from './BottomNav';

interface CommandBarProps {
  onNavigateTab?: (tab: TabKey) => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({ onNavigateTab }) => {
  const { profile, transactions, goals, merchantRules, executeAction } = useFinance();
  const [input, setInput] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionPreview | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDataJson, setEditDataJson] = useState('');
  const [showSpeechSheet, setShowSpeechSheet] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Rotating placeholder
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Web Speech API initialization
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setShowSpeechSheet(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.warn('Speech recognition start error:', e);
        }
      }
    }
  };

  const handleProcessInput = async (textToProcess?: string) => {
    const query = (textToProcess || input).trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    setInput('');
    setShowSpeechSheet(false);

    // Compute live financial context to ground the LLM
    const metrics = computeSurplusMetrics(profile, transactions);
    const context = {
      profile: {
        monthlyIncome: profile.monthlyIncome,
        fixedCosts: profile.fixedCosts,
        emergencyFundSaved: profile.emergencyFundSaved,
      },
      metrics: {
        monthlySurplus: metrics.monthlySurplus,
        currentMonthLeft: metrics.currentMonthLeft,
        currentMonthSpent: metrics.currentMonthSpent,
        runwayMonths: metrics.runwayMonths,
      },
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate,
      })),
    };

    try {
      const res = await fetch('/api/gemini/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: query, context }),
      });

      if (!res.ok) throw new Error('API request failed');

      const action: ActionPreview = await res.json();
      setPendingAction(action);
      setEditDataJson(JSON.stringify(action.data || {}, null, 2));
    } catch (err) {
      console.warn('Server error, falling back to deterministic parser:', err);
      const fallbackAction = parseOfflineUtterance(query, merchantRules);
      setPendingAction(fallbackAction);
      setEditDataJson(JSON.stringify(fallbackAction.data || {}, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessInput();
    }
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;

    let finalAction = pendingAction;
    if (isEditing) {
      try {
        const parsed = JSON.parse(editDataJson);
        finalAction = { ...pendingAction, data: parsed };
      } catch (e) {
        alert('Invalid JSON in edit mode. Please fix or cancel edit.');
        return;
      }
    }

    executeAction(finalAction);
    if (finalAction.actionType === 'simulate_scenario') {
      onNavigateTab?.('plan');
    }
    setPendingAction(null);
    setIsEditing(false);
  };

  const sampleVoicePrompts = [
    'uh 400 on Swiggy, no wait 450 yesterday',
    'what if rent goes up 3000',
    'which stock should I buy?',
    'kal Zomato pe 380 gaye',
    'HDFC Bank: INR 22,000.00 debited via UPI to UPI-RAHUL KUMAR-9876@ybl',
  ];

  return (
    <>
      {/* Persistent Command Bar Container (sits above bottom tab bar) */}
      <div className="fixed bottom-[68px] left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <div className="w-full max-w-[448px] pointer-events-auto">
          <div className="bg-[var(--surface-app)] border border-[var(--line-border)] shadow-lg rounded-[18px] p-1.5 flex items-center gap-1.5 transition-all focus-within:border-[var(--ink-primary)]">
            {/* Mic button */}
            <button
              onClick={toggleMic}
              className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-all ${
                isListening
                  ? 'bg-[var(--alert-coral)] text-white animate-pulse'
                  : 'bg-[var(--surface-secondary)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] active:scale-95'
              }`}
              title="Speak or dictation"
              aria-label="Voice input"
            >
              <Mic size={19} strokeWidth={isListening ? 2.2 : 1.7} />
            </button>

            {/* Input field */}
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={PLACEHOLDERS[placeholderIndex]}
                className="w-full bg-transparent px-2.5 py-2 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)]/70 focus:outline-none"
              />
            </div>

            {/* Send / Action Trigger */}
            <button
              onClick={() => handleProcessInput()}
              disabled={isLoading || (!input.trim() && !isListening)}
              className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-all ${
                input.trim()
                  ? 'bg-[var(--ink-primary)] text-[var(--bg-app)] active:scale-95 shadow-xs'
                  : 'bg-[var(--surface-secondary)] text-[var(--ink-muted)] opacity-50 cursor-not-allowed'
              }`}
              title="Process input"
              aria-label="Submit command"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-[var(--bg-app)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUp size={18} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Voice Dictation & Quick Test Prompts Modal */}
      {showSpeechSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-[480px] bg-[var(--surface-app)] border-t sm:border border-[var(--line-border)] rounded-t-[28px] sm:rounded-[24px] p-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line-border)]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
                <h3 className="text-base font-bold text-[var(--ink-primary)]">Voice & Dictation</h3>
              </div>
              <button
                onClick={() => {
                  recognitionRef.current?.stop();
                  setIsListening(false);
                  setShowSpeechSheet(false);
                }}
                className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)] flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Mic size={28} className={isListening ? 'animate-bounce' : ''} />
                </div>
                <p className="text-sm font-semibold text-[var(--ink-primary)]">
                  {isListening ? 'Listening in IST...' : 'Tap below or speak into microphone'}
                </p>
                <p className="text-xs text-[var(--ink-muted)] mt-1">
                  Say messy transactions, self-corrections, or what-if scenarios.
                </p>
              </div>

              {/* Sample Quick Voice Prompts */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                  Tap to test voice prompts:
                </p>
                <div className="flex flex-col gap-2">
                  {sampleVoicePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleProcessInput(prompt)}
                      className="text-left text-xs font-medium p-2.5 rounded-[12px] bg-[var(--surface-secondary)] hover:bg-[var(--line-border)] text-[var(--ink-primary)] active:scale-98 transition-all flex items-center justify-between"
                    >
                      <span>&ldquo;{prompt}&rdquo;</span>
                      <Sparkles size={13} className="text-[var(--accent-emerald)] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Card Modal (Previewing the result before confirming) */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-[480px] bg-[var(--surface-app)] border-t sm:border border-[var(--line-border)] rounded-t-[28px] sm:rounded-[24px] p-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line-border)]">
              <div className="flex items-center gap-2">
                {pendingAction.isRefusal ? (
                  <ShieldAlert size={18} className="text-[var(--alert-coral)]" />
                ) : (
                  <div className="w-6 h-6 rounded-[8px] bg-white dark:bg-[#1A1A1D] border border-[var(--line-border)] p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    <img
                      src="/assets/aistudio/file_00000000712c8207a7cd8dc050f00162_2_568880dc.jpg"
                      alt="Durung"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <h3 className="text-base font-bold text-[var(--ink-primary)]">
                  {pendingAction.isRefusal ? 'Guardrail Triggered' : 'Action Card Preview'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {pendingAction.isOfflineFallback && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--caution-gold-light)] text-[var(--caution-gold)]">
                    <WifiOff size={10} />
                    <span>offline mode</span>
                  </span>
                )}
                <button
                  onClick={() => {
                    setPendingAction(null);
                    setIsEditing(false);
                  }}
                  className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="py-4 space-y-3">
              <div className="p-4 rounded-[18px] bg-[var(--surface-secondary)] border border-[var(--line-border)]">
                <h4 className="text-sm font-bold text-[var(--ink-primary)]">{pendingAction.title}</h4>
                <p className="text-xs text-[var(--ink-muted)] mt-1">{pendingAction.description}</p>

                {pendingAction.isRefusal && pendingAction.refusalAlternative && (
                  <div className="mt-3 pt-3 border-t border-[var(--line-border)] text-xs text-[var(--accent-emerald)] font-medium">
                    {pendingAction.refusalAlternative}
                  </div>
                )}
              </div>

              {/* Transactions details if add_transactions */}
              {pendingAction.data?.transactions && pendingAction.data.transactions.length > 0 && (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {pendingAction.data.transactions.map((tx: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-[12px] bg-[var(--surface-app)] border border-[var(--line-border)] text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[var(--ink-primary)]">{tx.merchant || tx.merchantClean}</p>
                        <p className="text-[11px] text-[var(--ink-muted)]">{tx.category} · {tx.date || 'Today'}</p>
                      </div>
                      <span className="font-bold text-[var(--ink-primary)] tabular-nums">
                        ₹{Number(tx.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* JSON Edit mode */}
              {isEditing && (
                <div>
                  <label className="text-[11px] font-semibold text-[var(--ink-muted)] uppercase block mb-1">
                    Edit Raw Action Payload:
                  </label>
                  <textarea
                    value={editDataJson}
                    onChange={(e) => setEditDataJson(e.target.value)}
                    rows={4}
                    className="w-full text-xs font-mono p-2.5 rounded-[12px] bg-[var(--surface-secondary)] border border-[var(--line-border)] text-[var(--ink-primary)] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Actions: Confirm / Edit / Cancel */}
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--line-border)]">
              {pendingAction.isRefusal ? (
                <button
                  onClick={() => setPendingAction(null)}
                  className="w-full py-3 rounded-[14px] bg-[var(--ink-primary)] text-[var(--bg-app)] font-semibold text-xs active:scale-98 transition-all"
                >
                  Understood
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-4 py-3 rounded-[14px] bg-[var(--surface-secondary)] hover:bg-[var(--line-border)] font-semibold text-xs text-[var(--ink-primary)] transition-all"
                  >
                    {isEditing ? 'View Preview' : 'Edit'}
                  </button>

                  <button
                    onClick={handleConfirmAction}
                    className="flex-1 py-3 rounded-[14px] bg-[var(--accent-emerald)] text-white hover:opacity-95 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-xs"
                  >
                    <Check size={16} strokeWidth={2} />
                    <span>Confirm Action</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
