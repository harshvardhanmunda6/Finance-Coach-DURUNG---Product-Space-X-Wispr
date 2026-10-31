/**
 * Durung Deterministic Offline Parser
 * Used as an instant fallback (<50ms) if Gemini is slow (>6s) or offline.
 *
 * Handles:
 * - Filler words & self-corrections ("400 on Swiggy, no wait 450")
 * - Hinglish ("kal Zomato pe 380 gaye", "swiggy par 450 kharch hue")
 * - Relative dates ("today", "yesterday", "kal", "parso")
 * - Amounts like "1.2k", "450", "22000"
 * - Multiple transactions in one utterance ("Swiggy 450 and Uber 320")
 * - Scenarios ("what if I cut dining by 30%", "what if rent goes up by 4000")
 * - Bank SMS formats (HDFC, ICICI, SBI)
 */

import { ActionPreview, Transaction } from '../types/finance';
import { MERCHANT_MAP, normalizeMerchantKey } from './merchants';
import { getTodayIST } from './formatters';
import { checkInvestmentGuardrail } from './engines/groundingEngine';

export function parseOfflineUtterance(text: string, customMerchantRules: Record<string, string> = {}): ActionPreview {
  const cleanInput = text.trim();
  const lower = cleanInput.toLowerCase();

  // 0. Guardrail Check (e.g. "which stock should I buy?")
  const guardrail = checkInvestmentGuardrail(cleanInput);
  if (guardrail.isViolation) {
    return {
      id: `action_${Date.now()}`,
      actionType: 'refusal',
      title: guardrail.refusalTitle || 'I cannot recommend specific investments',
      description: guardrail.refusalReason || 'Durung is designed for living cashflow modeling, not investment advisory.',
      data: {},
      requiresConfirmation: false,
      isRefusal: true,
      refusalAlternative: guardrail.educationalAlternative,
      isOfflineFallback: true,
    };
  }

  // 1. Check for What-if scenario
  if (lower.includes('what if') || lower.includes('what-if') || lower.includes('simulate') || lower.includes('cut') || lower.includes('if i spend less') || lower.includes('rent goes up')) {
    // Check for category cut percentage
    const percentMatch = lower.match(/(?:cut|reduce|lower)\s+(?:my\s+)?([a-z\s&]+?)\s+(?:by\s+)?(\d+)%/i) ||
                         lower.match(/(\d+)%\s+(?:cut|reduction)\s+(?:on|in)\s+([a-z\s&]+)/i);
    if (percentMatch) {
      const targetCat = percentMatch[1].trim();
      const pct = parseInt(percentMatch[2], 10);
      return {
        id: `action_${Date.now()}`,
        actionType: 'simulate_scenario',
        title: `Simulate ${pct}% cut on ${targetCat}`,
        description: `Model surplus increase and accelerated goal completion with a ${pct}% reduction in ${targetCat}.`,
        data: {
          type: 'category_cut',
          target: targetCat,
          delta: -pct,
          isPercent: true,
        },
        requiresConfirmation: true,
        isOfflineFallback: true,
      };
    }

    // Check for rent change: "what if rent goes up 3000", "what if rent increases by 4k"
    const rentMatch = lower.match(/rent\s+(?:goes\s+up|increases?|\+)\s*(?:by\s+)?(?:₹|rs\.?)?\s*(\d+(?:,\d+)*(?:\.\d+)?k?)/i);
    if (rentMatch) {
      let amount = parseAmountString(rentMatch[1]);
      return {
        id: `action_${Date.now()}`,
        actionType: 'simulate_scenario',
        title: `Simulate Rent +₹${amount.toLocaleString('en-IN')}`,
        description: `Model impact of higher rent on your monthly surplus and runway.`,
        data: {
          type: 'rent_change',
          target: 'Rent & Housing',
          delta: amount,
          isPercent: false,
        },
        requiresConfirmation: true,
        isOfflineFallback: true,
      };
    }
  }

  // 2. Check for Bank SMS string
  if (lower.includes('debited') || lower.includes('credited') || lower.includes('vpa') || lower.includes('a/c') || lower.includes('txn') || lower.includes('spent rs')) {
    const smsTransactions = parseBankSms(cleanInput);
    if (smsTransactions.length > 0) {
      return {
        id: `action_${Date.now()}`,
        actionType: 'parse_sms_batch',
        title: `Parsed ${smsTransactions.length} transaction${smsTransactions.length > 1 ? 's' : ''} from SMS`,
        description: `Verified bank alert from ${smsTransactions[0].merchantClean}.`,
        data: {
          transactions: smsTransactions,
        },
        requiresConfirmation: true,
        isOfflineFallback: true,
      };
    }
  }

  // 3. Regular expense utterance parser with self-correction and Hinglish
  const parsedTxList = extractExpensesFromText(cleanInput);

  if (parsedTxList.length > 0) {
    const total = parsedTxList.reduce((acc, t) => acc + t.amount, 0);
    const merchantNames = parsedTxList.map((t) => t.merchantClean).join(', ');

    return {
      id: `action_${Date.now()}`,
      actionType: 'add_transactions',
      title: `Add ${parsedTxList.length > 1 ? `₹${total.toLocaleString('en-IN')} across ${parsedTxList.length} items` : `₹${total.toLocaleString('en-IN')} · ${merchantNames}`}`,
      description: `Parsed from: "${cleanInput}"`,
      data: {
        transactions: parsedTxList,
      },
      requiresConfirmation: true,
      isOfflineFallback: true,
    };
  }

  // Fallback to simple question or instruction
  return {
    id: `action_${Date.now()}`,
    actionType: 'answer_from_data',
    title: 'Financial Analysis',
    description: `I analyzed your inquiry: "${cleanInput}".`,
    data: {
      answer: `I noted your note: "${cleanInput}". You can record transactions like "Swiggy 450 yesterday", paste bank SMS, or ask "What if I cut dining by 20%?".`,
    },
    requiresConfirmation: false,
    isOfflineFallback: true,
  };
}

/**
 * Parses numeric strings like "450", "1.2k", "22,000", "500rs"
 */
export function parseAmountString(str: string): number {
  if (!str) return 0;
  let s = str.toLowerCase().replace(/,/g, '').replace(/₹|rs\.?|inr/g, '').trim();
  if (s.endsWith('k')) {
    const num = parseFloat(s.slice(0, -1));
    return Math.round(num * 1000);
  }
  if (s.endsWith('l') || s.endsWith('lac') || s.endsWith('lakh')) {
    const num = parseFloat(s.replace(/(lac|lakh|l)$/, ''));
    return Math.round(num * 100000);
  }
  return Math.round(parseFloat(s) || 0);
}

/**
 * Handles self-corrections like "400 on swiggy no wait 450 yesterday"
 */
function resolveSelfCorrections(text: string): string {
  // Strip leading conversational fillers: "uh", "um", "er", "like", "actually", "so"
  let clean = text.replace(/^(?:uh|um|er|like|actually|so|well)\s+/i, '');

  // Pattern 1: "400 on swiggy, no wait 450 yesterday"
  const pattern1 = /(\d+(?:\.\d+)?k?)\s*(?:on|for|at|pe)?\s*([a-z\s]+?)\s*[,]?\s*(?:no\s+wait|wait\s+no|actually|sorry|no\s+make\s+that|rather)\s*[,]?\s*(\d+(?:\.\d+)?k?)(.*)/i;
  const match1 = clean.match(pattern1);
  if (match1) {
    const merchant = match1[2].trim();
    const correctedAmount = match1[3].trim();
    const trailing = match1[4] ? match1[4].trim() : '';
    return `${merchant} ${correctedAmount} ${trailing}`.trim();
  }

  // Pattern 2: "swiggy 400, no wait 450 yesterday"
  const pattern2 = /([a-z\s]+?)\s*(\d+(?:\.\d+)?k?)\s*[,]?\s*(?:no\s+wait|wait\s+no|actually|sorry|no\s+make\s+that|rather)\s*[,]?\s*(\d+(?:\.\d+)?k?)(.*)/i;
  const match2 = clean.match(pattern2);
  if (match2) {
    const merchant = match2[1].trim();
    const correctedAmount = match2[3].trim();
    const trailing = match2[4] ? match2[4].trim() : '';
    return `${merchant} ${correctedAmount} ${trailing}`.trim();
  }

  return clean;
}

export function extractExpensesFromText(input: string, customRules: Record<string, string> = {}): Transaction[] {
  const corrected = resolveSelfCorrections(input);
  const segments = corrected.split(/\band\b|\bplus\b|,/i);
  const transactions: Transaction[] = [];

  for (const seg of segments) {
    const tx = parseSingleExpenseSegment(seg.trim(), customRules);
    if (tx) transactions.push(tx);
  }

  return transactions;
}

function parseSingleExpenseSegment(text: string, customRules: Record<string, string> = {}): Transaction | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Determine date
  let date = getTodayIST();
  if (lower.includes('yesterday') || lower.includes('kal') || lower.includes('yday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  } else if (lower.includes('parso') || lower.includes('day before')) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    date = d.toISOString().split('T')[0];
  }

  // Look for amount tokens (e.g. 450, ₹1,200, 1.2k, 380)
  const amountMatch = lower.match(/(?:₹|rs\.?|inr\s*)?(\d+(?:,\d+)*(?:\.\d+)?k?)(?:\s*(?:rs|rupees|inr|bucks))?/i);
  if (!amountMatch) return null;

  const amount = parseAmountString(amountMatch[1]);
  if (amount <= 0) return null;

  // Extract merchant name from remainder of text
  let rawMerchant = lower
    .replace(amountMatch[0], '')
    .replace(/\b(spent|pay|paid|kharch|pe|par|gaye|on|for|at|yesterday|today|kal|parso|rupees|rs|inr|via|upi)\b/gi, ' ')
    .trim();

  // Clean extra spaces
  rawMerchant = rawMerchant.replace(/\s+/g, ' ').trim();
  if (!rawMerchant) {
    rawMerchant = 'General Expense';
  }

  const merchantKey = normalizeMerchantKey(rawMerchant);
  const meta = MERCHANT_MAP[merchantKey];

  const merchantClean = meta?.name || capitalize(rawMerchant);
  const domain = meta?.domain;
  const learnedCat = customRules[merchantKey];
  const category = learnedCat || meta?.defaultCategory || 'Other / Uncategorized';
  const confidence = learnedCat ? 1.0 : meta ? 0.95 : 0.65;
  const isUncategorized = confidence < 0.70;

  return {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    date,
    amount,
    type: 'expense',
    merchantRaw: rawMerchant,
    merchantClean,
    merchantKey,
    domain,
    category,
    confidence,
    isUncategorized,
  };
}

/**
 * Deterministic Bank SMS parser for Indian formats (HDFC, ICICI, SBI, Axis)
 */
export function parseBankSms(sms: string, customRules: Record<string, string> = {}): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = sms.split(/\n+/).filter((l) => l.trim().length > 0);

  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Check if debit SMS
    const isDebit = lower.includes('debited') || lower.includes('spent') || lower.includes('paid') || lower.includes('withdrawn');
    const isCredit = lower.includes('credited') || lower.includes('salary');

    // Amount extraction: e.g. "Rs. 450.00", "INR 1,250.00", "Rs 380"
    const amtMatch = line.match(/(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (!amtMatch) continue;

    const amount = parseFloat(amtMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) continue;

    // Merchant extraction
    let merchantRaw = 'Bank Transaction';
    
    // Pattern 1: "at <Merchant>" or "to <Merchant>" or "info: <Merchant>"
    const merchantMatch = line.match(/(?:at|to|info:?|vpa)\s+([A-Za-z0-9\s@\-\.\*]+?)(?:\s+(?:on|avail|ref|bal|avl|upi|imps|neft)|\.|$)/i);
    if (merchantMatch) {
      merchantRaw = merchantMatch[1].trim();
    }

    const merchantKey = normalizeMerchantKey(merchantRaw);
    const meta = MERCHANT_MAP[merchantKey];

    const merchantClean = meta?.name || cleanMerchantLabel(merchantRaw);
    const domain = meta?.domain;

    const learnedCategory = customRules[merchantKey];
    const category = isCredit
      ? 'Salary & Income'
      : learnedCategory || meta?.defaultCategory || 'Other / Uncategorized';

    // If it's a messy UPI reference like "UPI-RAHUL KUMAR-9876@ybl", confidence is initially lower so user can experience correction loop
    const isMessyUpi = !learnedCategory && (merchantRaw.toLowerCase().includes('rahul') || merchantRaw.toLowerCase().includes('vpa'));
    const confidence = learnedCategory ? 1.0 : isMessyUpi ? 0.60 : meta ? 0.95 : 0.65;

    transactions.push({
      id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: getTodayIST(),
      amount,
      type: isCredit ? 'income' : 'expense',
      merchantRaw,
      merchantClean,
      merchantKey,
      domain,
      category,
      confidence,
      isUncategorized: confidence < 0.70,
      smsRef: line.slice(0, 100),
    });
  }

  return transactions;
}

function cleanMerchantLabel(raw: string): string {
  // Strip UPI IDs like -9876@ybl or VPA-
  let clean = raw.replace(/^UPI-?/i, '').replace(/@[a-z0-9]+$/i, '').trim();
  return capitalize(clean);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
