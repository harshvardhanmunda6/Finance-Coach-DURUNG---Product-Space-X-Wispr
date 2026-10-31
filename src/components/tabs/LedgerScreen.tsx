import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { MerchantLogo } from '../common/MerchantLogo';
import { formatINR, formatISTDate } from '../../lib/formatters';
import { ALL_CATEGORIES, CATEGORY_COLORS } from '../../lib/merchants';
import { Transaction } from '../../types/finance';
import { parseBankSms } from '../../lib/offlineParser';
import {
  Search,
  Upload,
  FileText,
  X,
  Check,
  Filter,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const LedgerScreen: React.FC = () => {
  const { transactions, merchantRules, recategorizeMerchant, addTransactions } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Recategorization bottom sheet state
  const [activeTxForEdit, setActiveTxForEdit] = useState<Transaction | null>(null);
  const [applyToPast, setApplyToPast] = useState(true);

  // CSV / SMS Import sheet state
  const [showImportModal, setShowImportModal] = useState(false);
  const [smsPasteText, setSmsPasteText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Category breakdown for Donut Chart
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      const cat = t.category || 'Other / Uncategorized';
      map.set(cat, (map.get(cat) || 0) + t.amount);
    }
    const arr = Array.from(map.entries()).map(([cat, total]) => ({
      category: cat,
      total,
      color: CATEGORY_COLORS[cat]?.dot || '#888882',
    }));
    return arr.sort((a, b) => b.total - a.total);
  }, [transactions]);

  const totalExpenseSum = useMemo(() => {
    return categoryTotals.reduce((sum, c) => sum + c.total, 0);
  }, [categoryTotals]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Category filter
      if (selectedCategoryFilter && t.category !== selectedCategoryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMerchant = t.merchantClean.toLowerCase().includes(q) || t.merchantRaw.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        const matchAmt = t.amount.toString().includes(q);
        return matchMerchant || matchCat || matchAmt;
      }
      return true;
    });
  }, [transactions, selectedCategoryFilter, searchQuery]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: { date: string; displayDate: string; items: Transaction[] }[] = [];
    const dateMap = new Map<string, Transaction[]>();

    for (const t of filteredTransactions) {
      const d = t.date;
      if (!dateMap.has(d)) {
        dateMap.set(d, []);
      }
      dateMap.get(d)!.push(t);
    }

    // Sort dates descending
    const sortedDates = Array.from(dateMap.keys()).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    for (const d of sortedDates) {
      groups.push({
        date: d,
        displayDate: formatISTDate(d),
        items: dateMap.get(d)!,
      });
    }

    return groups;
  }, [filteredTransactions]);

  const handleSelectCategory = (cat: string) => {
    if (!activeTxForEdit) return;
    recategorizeMerchant(activeTxForEdit.merchantKey, cat, applyToPast);
    setActiveTxForEdit(null);
  };

  const handleImportSms = () => {
    if (!smsPasteText.trim()) return;
    const parsed = parseBankSms(smsPasteText, merchantRules);
    if (parsed.length > 0) {
      addTransactions(parsed);
      setImportStatus(`Imported ${parsed.length} transaction${parsed.length > 1 ? 's' : ''}`);
      setSmsPasteText('');
      setTimeout(() => {
        setShowImportModal(false);
        setImportStatus(null);
      }, 1200);
    } else {
      setImportStatus('No valid bank SMS format recognized.');
    }
  };

  // CSV file upload handler
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      // Extract rows
      const parsed: Transaction[] = [];
      const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));

      const dateIdx = headers.findIndex((h) => h.includes('date'));
      const amtIdx = headers.findIndex((h) => h.includes('amount') || h.includes('debit') || h.includes('inr'));
      const descIdx = headers.findIndex((h) => h.includes('narration') || h.includes('desc') || h.includes('merchant') || h.includes('particulars'));

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
        const rawAmt = parseFloat(cols[amtIdx >= 0 ? amtIdx : 1]?.replace(/[^0-9.]/g, '') || '0');
        const rawDesc = cols[descIdx >= 0 ? descIdx : 2] || 'Statement Entry';
        const rawDate = cols[dateIdx >= 0 ? dateIdx : 0] || new Date().toISOString().split('T')[0];

        if (rawAmt > 0) {
          parsed.push({
            id: `csv_${Date.now()}_${i}`,
            date: rawDate.includes('-') ? rawDate : new Date().toISOString().split('T')[0],
            amount: rawAmt,
            type: 'expense',
            merchantRaw: rawDesc,
            merchantClean: rawDesc.slice(0, 24),
            merchantKey: rawDesc.toLowerCase().slice(0, 10).replace(/[^a-z0-9]/g, ''),
            category: 'Other / Uncategorized',
            confidence: 0.6,
            isUncategorized: true,
          });
        }
      }

      if (parsed.length > 0) {
        addTransactions(parsed);
        setImportStatus(`Imported ${parsed.length} rows from CSV`);
        setTimeout(() => {
          setShowImportModal(false);
          setImportStatus(null);
        }, 1200);
      }
    };
    reader.readAsText(file);
  };

  // Donut SVG arc calculations
  let accumulatedAngle = 0;
  const donutArcs = categoryTotals.map((item) => {
    const pct = totalExpenseSum > 0 ? item.total / totalExpenseSum : 0;
    const startAngle = accumulatedAngle;
    const angle = pct * 360;
    accumulatedAngle += angle;

    // Convert polar to cartesian
    const radius = 42;
    const cx = 50;
    const cy = 50;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((startAngle + angle - 90) * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;
    const pathData = angle >= 359.9
      ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}`
      : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    return {
      category: item.category,
      pathData,
      color: item.color,
      pct: Math.round(pct * 100),
      total: item.total,
    };
  });

  return (
    <div className="space-y-5 px-5 pt-4 content-safe-bottom">
      {/* Top Controls: Search + Import button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-[var(--ink-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchant, amount, category..."
            className="w-full pl-9 pr-3 py-2 rounded-[14px] bg-[var(--surface-app)] border border-[var(--line-border)] text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)]"
          />
        </div>

        <button
          onClick={() => setShowImportModal(true)}
          className="p-2.5 rounded-[14px] bg-[var(--surface-app)] border border-[var(--line-border)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] active:scale-95 transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold shrink-0"
        >
          <Upload size={15} />
          <span className="hidden sm:inline">Import</span>
        </button>
      </div>

      {/* Category Donut Card */}
      <div className="card-durung p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Category Breakdown
          </span>
          {selectedCategoryFilter && (
            <button
              onClick={() => setSelectedCategoryFilter(null)}
              className="text-xs font-semibold text-[var(--accent-emerald)] hover:underline flex items-center gap-1"
            >
              <span>Clear Filter</span>
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* SVG Donut */}
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {donutArcs.map((arc, i) => (
                <path
                  key={i}
                  d={arc.pathData}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="12"
                  strokeLinecap="round"
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onClick={() =>
                    setSelectedCategoryFilter(
                      selectedCategoryFilter === arc.category ? null : arc.category
                    )
                  }
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-[var(--ink-muted)] leading-none">Total</span>
              <span className="text-xs font-bold text-[var(--ink-primary)] tabular-nums mt-0.5">
                {formatINR(totalExpenseSum).replace(/₹/, '₹')}
              </span>
            </div>
          </div>

          {/* Slices list / filter chips */}
          <div className="flex-1 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {categoryTotals.slice(0, 6).map((cat) => {
              const isSelected = selectedCategoryFilter === cat.category;
              return (
                <button
                  key={cat.category}
                  onClick={() =>
                    setSelectedCategoryFilter(isSelected ? null : cat.category)
                  }
                  className={`text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-[var(--ink-primary)] text-white border-[var(--ink-primary)] font-bold'
                      : 'bg-[var(--surface-secondary)] border-[var(--line-border)] text-[var(--ink-primary)]'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate max-w-[90px]">{cat.category}</span>
                  <span className="opacity-70 tabular-nums">
                    {Math.round((cat.total / (totalExpenseSum || 1)) * 100)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ledger Grouped by Day */}
      <div className="space-y-4">
        {groupedByDate.length === 0 ? (
          <div className="card-durung p-8 text-center text-xs text-[var(--ink-muted)]">
            No transactions found matching your criteria.
          </div>
        ) : (
          groupedByDate.map((group) => (
            <div key={group.date} className="space-y-1.5">
              <div className="flex items-center justify-between px-1 text-xs font-semibold text-[var(--ink-muted)]">
                <span>{group.displayDate}</span>
                <span className="tabular-nums">
                  {formatINR(
                    group.items
                      .filter((t) => t.type === 'expense')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </span>
              </div>

              <div className="card-durung divide-y divide-[var(--line-border)] overflow-hidden shadow-xs">
                {group.items.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setActiveTxForEdit(tx)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-secondary)]/50 transition-colors ${
                      tx.isUncategorized
                        ? 'bg-[var(--caution-gold-light)]/40 hover:bg-[var(--caution-gold-light)]/60'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MerchantLogo
                        merchantKey={tx.merchantKey}
                        domain={tx.domain}
                        merchantName={tx.merchantClean}
                        category={tx.category}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-[var(--ink-primary)] truncate">
                            {tx.merchantClean}
                          </p>
                          {tx.isUncategorized && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[var(--caution-gold-light)] text-[var(--caution-gold)] font-bold text-[9px] uppercase tracking-wider shrink-0 border border-[var(--caution-gold)]/30">
                              Teach Rule
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: CATEGORY_COLORS[tx.category]?.bg || '#EFEFEA',
                              color: CATEGORY_COLORS[tx.category]?.text || '#555550',
                            }}
                          >
                            {tx.category}
                          </span>
                          {tx.notes && (
                            <span className="text-[10px] text-[var(--ink-muted)] truncate">
                              · {tx.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <span
                        className={`text-xs font-bold tabular-nums block ${
                          tx.status === 'pending'
                            ? 'text-[var(--pending-amber)]'
                            : tx.type === 'income'
                            ? 'text-[var(--credit-green)]'
                            : 'text-[var(--debit-red)]'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatINR(tx.amount)}
                      </span>
                      {tx.status === 'pending' && (
                        <span className="text-[9px] font-bold text-[var(--pending-amber)] bg-[var(--pending-amber-light)] px-1.5 py-0.5 rounded-md inline-block uppercase tracking-wider mt-0.5">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recategorize Sheet (1-tap learning loop with 8-second undo) */}
      {activeTxForEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-[480px] bg-[var(--surface-app)] border-t sm:border border-[var(--line-border)] rounded-t-[28px] sm:rounded-[24px] p-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line-border)]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-emerald)]">
                  Teach Durung Categorization
                </span>
                <h3 className="text-base font-bold text-[var(--ink-primary)] mt-0.5">
                  {activeTxForEdit.merchantClean}
                </h3>
              </div>
              <button
                onClick={() => setActiveTxForEdit(null)}
                className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--surface-secondary)]">
                <div>
                  <span className="text-xs font-bold text-[var(--ink-primary)] block">
                    Apply to all past transactions
                  </span>
                  <span className="text-[11px] text-[var(--ink-muted)]">
                    Automatically updates all past {activeTxForEdit.merchantClean} entries and learns rule.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={applyToPast}
                  onChange={(e) => setApplyToPast(e.target.checked)}
                  className="w-5 h-5 accent-[var(--accent-emerald)] rounded"
                />
              </div>

              <div>
                <p className="text-xs font-bold text-[var(--ink-muted)] uppercase mb-2">
                  Select Category:
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto">
                  {ALL_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleSelectCategory(cat)}
                      className={`text-left p-3 rounded-[14px] border text-xs font-medium flex items-center justify-between transition-all active:scale-98 ${
                        activeTxForEdit.category === cat
                          ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)] font-bold'
                          : 'border-[var(--line-border)] bg-[var(--surface-app)] text-[var(--ink-primary)] hover:border-[var(--ink-muted)]'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {activeTxForEdit.category === cat && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV & SMS Batch Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-[480px] bg-[var(--surface-app)] border-t sm:border border-[var(--line-border)] rounded-t-[28px] sm:rounded-[24px] p-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line-border)]">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[var(--accent-emerald)]" />
                <h3 className="text-base font-bold text-[var(--ink-primary)]">Import Bank SMS / CSV</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Option 1: Paste SMS text */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                  Paste Bank SMS Alert(s)
                </label>
                <textarea
                  value={smsPasteText}
                  onChange={(e) => setSmsPasteText(e.target.value)}
                  placeholder="Paste bank alerts from HDFC, ICICI, SBI (e.g. 'HDFC Bank: Rs 450 debited at SWIGGY...')"
                  rows={3}
                  className="w-full p-3 rounded-[14px] bg-[var(--surface-secondary)] border border-[var(--line-border)] text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] resize-none"
                />
                <div className="flex items-center justify-between mt-1 mb-2">
                  <span className="text-[11px] text-[var(--ink-muted)]">Testing Indian SMS formats?</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSmsPasteText(
                        `HDFC Bank: Rs 450.00 debited from a/c **4921 on 28-OCT-26 to SWIGGY-BANGALORE. Avl bal: Rs 18,430.00.\nHDFC Bank: INR 22,000.00 debited via UPI to UPI-RAHUL KUMAR-9876@ybl ref 88291039 on 03-OCT-26.\nICICI Bank: INR 649.00 debited for NETFLIX RECURRING via card 8812 on 22-OCT-26.`
                      )
                    }
                    className="text-[11px] font-semibold text-[var(--accent-emerald)] hover:underline"
                  >
                    + Fill Sample SMS (incl. RAHUL)
                  </button>
                </div>
                <button
                  onClick={handleImportSms}
                  disabled={!smsPasteText.trim()}
                  className="mt-1 w-full py-2.5 rounded-[12px] bg-[var(--accent-emerald)] text-white text-xs font-semibold hover:opacity-95 disabled:opacity-50 transition-all"
                >
                  Parse Bank SMS Alerts
                </button>
              </div>

              {/* Option 2: Upload CSV */}
              <div className="pt-2 border-t border-[var(--line-border)]">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">
                  Or Upload Bank Statement CSV
                </label>
                <label className="w-full flex flex-col items-center justify-center p-4 rounded-[16px] border-2 border-dashed border-[var(--line-border)] hover:border-[var(--accent-emerald)] bg-[var(--surface-secondary)]/50 cursor-pointer transition-all">
                  <Upload size={20} className="text-[var(--ink-muted)] mb-1" />
                  <span className="text-xs font-semibold text-[var(--ink-primary)]">
                    Choose .csv file
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)] mt-0.5">
                    HDFC, ICICI, SBI statement formats supported
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {importStatus && (
                <div className="p-3 rounded-[12px] bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)] text-xs font-semibold text-center">
                  {importStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
