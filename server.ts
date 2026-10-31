import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { checkInvestmentGuardrail, verifyNumberGrounding, generateGroundedFallbackNarrative } from './src/lib/engines/groundingEngine.ts';
import { parseOfflineUtterance } from './src/lib/offlineParser.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Tool declarations for Durung
const addTransactionsTool: FunctionDeclaration = {
  name: 'add_transactions',
  description: 'Add one or more parsed user transactions (expenses, incomes, transfers).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      transactions: {
        type: Type.ARRAY,
        description: 'List of transactions to record.',
        items: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: 'Amount in INR' },
            merchant: { type: Type.STRING, description: 'Clean merchant name (e.g. Swiggy, Uber)' },
            category: { type: Type.STRING, description: 'Category (Food & Dining, Groceries, Commute & Travel, Subscriptions, Shopping, Utilities & Bills, Health & Fitness, Rent & Housing, Other / Uncategorized)' },
            date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format (IST)' },
            type: { type: Type.STRING, description: 'expense, income, or transfer' },
            notes: { type: Type.STRING, description: 'Optional user context or note' },
          },
          required: ['amount', 'merchant', 'category'],
        },
      },
    },
    required: ['transactions'],
  },
};

const parseSmsBatchTool: FunctionDeclaration = {
  name: 'parse_sms_batch',
  description: 'Parse pasted bank SMS alerts (HDFC, ICICI, SBI, Axis, etc.) into structured ledger transactions.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      transactions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: 'Amount in INR' },
            merchant: { type: Type.STRING, description: 'Clean merchant or sender name' },
            category: { type: Type.STRING, description: 'Category' },
            date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' },
            type: { type: Type.STRING, description: 'expense or income' },
            smsSnippet: { type: Type.STRING, description: 'Original SMS text fragment' },
          },
          required: ['amount', 'merchant', 'category'],
        },
      },
    },
    required: ['transactions'],
  },
};

const recategorizeMerchantTool: FunctionDeclaration = {
  name: 'recategorize_merchant',
  description: 'Teach a rule mapping a merchant key to a category, optionally applying to all past transactions.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      merchantKey: { type: Type.STRING, description: 'Normalized merchant key, e.g. "rahul", "swiggy"' },
      category: { type: Type.STRING, description: 'Target category' },
      applyToPast: { type: Type.BOOLEAN, description: 'Whether to update past uncategorized entries for this merchant' },
    },
    required: ['merchantKey', 'category', 'applyToPast'],
  },
};

const simulateScenarioTool: FunctionDeclaration = {
  name: 'simulate_scenario',
  description: 'Model a what-if scenario on expenses, income, rent, or dining cuts.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: 'Type of scenario: category_cut, rent_change, income_boost, subscription_drop, or custom',
      },
      target: { type: Type.STRING, description: 'Target category or item (e.g. Food & Dining, Rent)' },
      delta: { type: Type.NUMBER, description: 'Change amount (e.g. -30 for 30% cut, or 4000 for rent increase)' },
      isPercent: { type: Type.BOOLEAN, description: 'True if delta is percentage, false if absolute INR' },
    },
    required: ['type', 'target', 'delta'],
  },
};

const setGoalTool: FunctionDeclaration = {
  name: 'set_goal',
  description: 'Create or update a financial savings goal.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Goal name (e.g. Goa Trip, Mac Studio, Emergency Fund)' },
      targetAmount: { type: Type.NUMBER, description: 'Target amount in INR' },
      targetDate: { type: Type.STRING, description: 'Target completion date in YYYY-MM-DD' },
      currentAmount: { type: Type.NUMBER, description: 'Amount saved so far in INR' },
    },
    required: ['name', 'targetAmount'],
  },
};

const flagSubscriptionTool: FunctionDeclaration = {
  name: 'flag_subscription',
  description: 'Flag a recurring subscription as inactive ("I don\'t use this") or active.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      merchantKey: { type: Type.STRING, description: 'Merchant key of subscription, e.g. netflix, spotify, cultfit' },
      flaggedInactive: { type: Type.BOOLEAN, description: 'True to flag as unused, false to keep active' },
    },
    required: ['merchantKey', 'flaggedInactive'],
  },
};

const answerFromDataTool: FunctionDeclaration = {
  name: 'answer_from_data',
  description: 'Answer user financial questions strictly using computed context data without hallucinating arithmetic.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      answer: { type: Type.STRING, description: 'The clear, grounded answer to the user in 1-3 sentences' },
      numbersUsed: {
        type: Type.ARRAY,
        items: { type: Type.NUMBER },
        description: 'List of numbers used in answer to verify grounding',
      },
    },
    required: ['answer'],
  },
};

const allTools = [
  {
    functionDeclarations: [
      addTransactionsTool,
      parseSmsBatchTool,
      recategorizeMerchantTool,
      simulateScenarioTool,
      setGoalTool,
      flagSubscriptionTool,
      answerFromDataTool,
    ],
  },
];

// Endpoint: Main Command Bar AI Agent
app.post('/api/gemini/command', async (req: Request, res: Response) => {
  const { userInput, context } = req.body;

  if (!userInput || typeof userInput !== 'string') {
    return res.status(400).json({ error: 'Missing userInput' });
  }

  // 1. Guardrail Pre-Check
  const guardrail = checkInvestmentGuardrail(userInput);
  if (guardrail.isViolation) {
    return res.json({
      actionType: 'refusal',
      title: guardrail.refusalTitle,
      description: guardrail.refusalReason,
      requiresConfirmation: false,
      isRefusal: true,
      refusalAlternative: guardrail.educationalAlternative,
    });
  }

  // 2. Call Gemini Flash with 6s timeout fallback to deterministic regex engine
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 6000)
    );

    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = nowIST.toISOString().split('T')[0];
    const yesterdayDate = new Date(nowIST.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayIST = yesterdayDate.toISOString().split('T')[0];

    const geminiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are Durung, the voice-first money coach for salaried young Indians (22-30).
Today in IST is ${todayIST}, yesterday is ${yesterdayIST}.
CRITICAL RULES:
1. NEVER do mental math. All figures (surplus, runway, goal ETA) MUST come directly from this verified context JSON:
${JSON.stringify(context || {}, null, 2)}
2. Handle messy speech dictations, filler words ('uh', 'um', 'like'), Hinglish ('kal Zomato pe 380 gaye'), and self-corrections like 'uh 400 on Swiggy, no wait 450 yesterday' (you must record amount 450, merchant 'Swiggy', date '${yesterdayIST}', category 'Food & Dining').
3. If the user expresses a what-if query (e.g. 'what if I cut dining by 20%', 'what if rent goes up 3000'), call simulate_scenario. For 'rent goes up 3000', delta is 3000, type is 'rent_change', isPercent is false.
4. If the user dictates expenses, call add_transactions.
5. If the user pastes bank SMS, call parse_sms_batch.
6. If the user asks about investment advice or which stocks to buy, call refusal or return calm refusal.
User prompt: "${userInput}"`,
            },
          ],
        },
      ],
      config: {
        tools: allTools,
      },
    });

    const response: any = await Promise.race([geminiPromise, timeoutPromise]);
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const name = call.name;
      const args = call.args || {};

      if (name === 'add_transactions') {
        const txs = args.transactions || [];
        return res.json({
          actionType: 'add_transactions',
          title: txs.length === 1 ? `Add ₹${txs[0].amount.toLocaleString('en-IN')} · ${txs[0].merchant}` : `Add ${txs.length} Transactions`,
          description: `Category: ${txs[0]?.category || 'General'} · Date: ${txs[0]?.date || 'Today'}`,
          data: { transactions: txs },
          requiresConfirmation: true,
        });
      }

      if (name === 'parse_sms_batch') {
        const txs = args.transactions || [];
        return res.json({
          actionType: 'parse_sms_batch',
          title: `Parsed ${txs.length} Bank Alerts`,
          description: `Extracted from bank SMS alerts with high fidelity.`,
          data: { transactions: txs },
          requiresConfirmation: true,
        });
      }

      if (name === 'simulate_scenario') {
        return res.json({
          actionType: 'simulate_scenario',
          title: `Simulate: ${args.target} (${args.delta > 0 ? '+' : ''}${args.delta}${args.isPercent ? '%' : ' INR'})`,
          description: `Run dynamic what-if model on surplus and goal timelines.`,
          data: args,
          requiresConfirmation: true,
        });
      }

      if (name === 'recategorize_merchant') {
        return res.json({
          actionType: 'recategorize_merchant',
          title: `Rule: ${args.merchantKey} -> ${args.category}`,
          description: `Apply this category to ${args.applyToPast ? 'all past and future' : 'future'} transactions.`,
          data: args,
          requiresConfirmation: true,
        });
      }

      if (name === 'flag_subscription') {
        return res.json({
          actionType: 'flag_subscription',
          title: `${args.flaggedInactive ? 'Flagged Inactive' : 'Active Subscription'}: ${args.merchantKey}`,
          description: args.flaggedInactive ? 'Excluded from active subscription runway calculations.' : 'Restored to active subscriptions.',
          data: args,
          requiresConfirmation: true,
        });
      }

      if (name === 'set_goal') {
        return res.json({
          actionType: 'set_goal',
          title: `Set Goal: ${args.name}`,
          description: `Target ₹${args.targetAmount.toLocaleString('en-IN')} by ${args.targetDate || 'target date'}.`,
          data: args,
          requiresConfirmation: true,
        });
      }

      if (name === 'answer_from_data') {
        return res.json({
          actionType: 'answer_from_data',
          title: 'Durung Coach',
          description: args.answer,
          data: { answer: args.answer },
          requiresConfirmation: false,
        });
      }
    }

    // If Gemini replied with direct text instead of a tool call
    const textReply = response.text || '';
    return res.json({
      actionType: 'answer_from_data',
      title: 'Durung Coach',
      description: textReply,
      data: { answer: textReply },
      requiresConfirmation: false,
    });
  } catch (err: any) {
    // Graceful offline fallback triggered upon timeout or Gemini error
    const fallbackResult = parseOfflineUtterance(userInput, context?.merchantRules);
    return res.json(fallbackResult);
  }
});

// Endpoint: Onboarding Parser
app.post('/api/gemini/parse-onboarding', async (req: Request, res: Response) => {
  const { speechText } = req.body;

  if (!speechText) {
    return res.status(400).json({ error: 'Missing speechText' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Parse this conversational onboarding statement from a young Indian salaried worker into clean JSON.
Statement: "${speechText}"
Extract monthlyIncome (in INR), fixedCosts (array of { name, amount, category }), goal (name, targetAmount, targetDate in YYYY-MM-DD), and emergencyFund (saved in INR).
If any values are missing, supply realistic estimates for Bangalore/Mumbai:
income ~ 60000, rent ~ 20000, emergency fund ~ 60000.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            monthlyIncome: { type: Type.NUMBER },
            name: { type: Type.STRING },
            fixedCosts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                },
                required: ['name', 'amount'],
              },
            },
            emergencyFund: { type: Type.NUMBER },
            goal: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                targetAmount: { type: Type.NUMBER },
                targetDate: { type: Type.STRING },
              },
              required: ['name', 'targetAmount'],
            },
          },
          required: ['monthlyIncome'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err) {
    console.warn('Onboarding fallback parse:', err);
    // Deterministic fallback
    return res.json({
      name: 'Friend',
      monthlyIncome: 60000,
      fixedCosts: [
        { name: 'Rent', amount: 20000, category: 'Rent & Housing' },
        { name: 'Utilities & Wifi', amount: 2000, category: 'Utilities & Bills' },
      ],
      emergencyFund: 60000,
      goal: {
        name: 'Travel / Goa Trip',
        targetAmount: 80000,
        targetDate: '2027-03-31',
      },
    });
  }
});

// Endpoint: Monthly Report 3-Sentence Narrative
app.post('/api/gemini/report-narrative', async (req: Request, res: Response) => {
  const { metrics } = req.body;
  if (!metrics) {
    return res.status(400).json({ error: 'Missing metrics' });
  }

  const {
    currentMonthSpent = 0,
    leftToSpend = 0,
    monthlySurplus = 0,
    goalEta = '14 Mar',
    topCategory = 'Food & Dining',
  } = metrics;

  try {
    const prompt = `Write a 3-sentence editorial monthly review for a salaried Indian professional strictly using these verified figures:
- Spent so far: ₹${currentMonthSpent.toLocaleString('en-IN')}
- Left to spend: ₹${leftToSpend.toLocaleString('en-IN')}
- Monthly surplus: ₹${monthlySurplus.toLocaleString('en-IN')}
- Goal ETA: ${goalEta}
- Top variable category: ${topCategory}
Tone: Calm, spacious, editorial (like Cred / Copilot Money / Linear).
DO NOT invent or alter any number. Exactly 3 sentences.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const narrative = (response.text || '').trim();
    
    // Check number grounding
    const allowed = [currentMonthSpent, leftToSpend, monthlySurplus];
    const grounding = verifyNumberGrounding(narrative, allowed);

    if (!grounding.isGrounded) {
      console.warn('Regenerating ungrounded narrative...');
      const fallback = generateGroundedFallbackNarrative(leftToSpend, monthlySurplus, goalEta, topCategory);
      return res.json({ narrative: fallback, isFallback: true });
    }

    return res.json({ narrative, isFallback: false });
  } catch (err) {
    const fallback = generateGroundedFallbackNarrative(leftToSpend, monthlySurplus, goalEta, topCategory);
    return res.json({ narrative: fallback, isFallback: true });
  }
});

// Server frontend in dev or prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Durung personal finance server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
