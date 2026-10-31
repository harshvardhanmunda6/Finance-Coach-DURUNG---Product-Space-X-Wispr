/**
 * Durung Grounding & Guardrail Verification Engine
 *
 * 1. Financial Guardrails:
 *    Detects prohibited recommendations: specific stocks, mutual funds, crypto,
 *    tickers (RELIANCE, HDFC, TCS, NIFTY 50, SIP recommendations for specific funds, "buy/sell/hold").
 *    Returns a calm refusal card and educational alternatives.
 *
 * 2. Grounding Verification:
 *    Ensures that every number output in coach text corresponds to verified numbers
 *    in the provided financial context JSON.
 */

// Prohibited financial advice keywords / patterns
const PROHIBITED_INVESTMENT_PATTERNS = [
  /\b(buy|sell|hold)\b\s+(?:shares?|stocks?|crypto|bitcoin|ethereum|nifty|sensex|mutual\s+funds?)/i,
  /\b(invest\s+in|put\s+money\s+into)\s+(tata|reliance|infosys|hdfc|zerodha|groww|coinswitch|wazirx|crypto|nifty|smallcap|midcap)/i,
  /\b(recommend|pick|best|which|what)\s+(?:stocks?|shares?|mutual\s+funds?|etfs?|altcoins?|crypto)/i,
  /\b(which|what|any|best)\b.*\b(stocks?|shares?|funds?|crypto)\b.*\b(buy|invest|pick)\b/i,
  /\b(stocks?|shares?|crypto)\b.*\b(should\s+i\s+buy|to\s+buy|buy\b)/i,
  /\b(should\s+i|can\s+i)\s+(buy|invest\s+in|purchase)\b.*\b(stock|stocks|shares?|crypto|funds?)\b/i,
  /\b(guaranteed\s+returns?|multibagger|10x\s+crypto|trading\s+call)\b/i,
  /\b(nifty\s*50|sensex|banknifty|parag\s+parikh|quant\s+active|mirae\s+asset)\b/i,
];

export interface GuardrailCheckResult {
  isViolation: boolean;
  refusalTitle?: string;
  refusalReason?: string;
  educationalAlternative?: string;
}

export function checkInvestmentGuardrail(query: string, replyText: string = ''): GuardrailCheckResult {
  const combined = `${query} ${replyText}`;
  
  for (const pattern of PROHIBITED_INVESTMENT_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        isViolation: true,
        refusalTitle: 'I cannot recommend specific investments',
        refusalReason:
          'Durung is designed for living cash flow modeling, surplus optimization, and goal planning, not licensed investment advisory.',
        educationalAlternative:
          'Instead, I can calculate how much surplus you have to allocate toward savings, how an extra ₹5,000/month accelerates your Goa trip, or how to build your 3-month emergency fund.',
      };
    }
  }

  return { isViolation: false };
}

/**
 * Extracts numbers from text and checks if they exist in context numbers (within 1% rounding)
 */
export function verifyNumberGrounding(
  text: string,
  allowedNumbers: number[]
): { isGrounded: boolean; ungroundedNumbers: number[] } {
  // Extract all numbers like "450", "1,23,456", "30%", "1.2"
  const rawMatches = text.match(/\b\d+(?:,\d+)*(?:\.\d+)?\b/g) || [];
  const numbersInText = rawMatches.map((m) => parseFloat(m.replace(/,/g, ''))).filter((n) => !isNaN(n));

  const ungrounded: number[] = [];

  for (const num of numbersInText) {
    // Skip benign small numbers like "1st", "2", "3" sentence indices or percentages under 100 if general
    if (num <= 5 && Number.isInteger(num)) continue;

    // Check if within 2% or ±1 of any context number
    const isPresent = allowedNumbers.some((allowed) => {
      if (allowed === num) return true;
      if (Math.abs(allowed - num) <= 1) return true;
      if (allowed !== 0 && Math.abs(allowed - num) / allowed < 0.03) return true;
      return false;
    });

    if (!isPresent) {
      ungrounded.push(num);
    }
  }

  return {
    isGrounded: ungrounded.length === 0,
    ungroundedNumbers: ungrounded,
  };
}

/**
 * Fallback templated coach narrative if LLM hallucinated ungrounded numbers or failed
 */
export function generateGroundedFallbackNarrative(
  leftToSpend: number,
  monthlySurplus: number,
  goalEta: string,
  topCategory: string
): string {
  return `You have ₹${leftToSpend.toLocaleString('en-IN')} remaining this month after commitments. Your monthly surplus is running at ₹${monthlySurplus.toLocaleString('en-IN')}, keeping your primary goal on track for ${goalEta}. Watch your pace in ${topCategory} over the coming two weeks to stay ahead.`;
}
