/**
 * Realistic 90-day seed data for a 24-year-old salaried professional in India earning ₹60,000/month.
 * Includes:
 * - Salary credits on 1st of each month
 * - Rent ₹22,000
 * - Uncategorized messy UPI references (e.g. "UPI-RAHUL KUMAR-9876@ybl") to test the learning loop
 * - Netflix subscription that increased from ₹499 to ₹649
 * - Spotify, Cult.fit gym, Electricity, Jio recharge
 * - Swiggy, Zomato, Uber, Amazon, BigBasket
 * - 15 realistic messy bank SMS strings
 * - Goal: Goa trip ₹80,000 by 31 Mar (with ₹34,000 saved)
 */

import { Goal, Transaction, UserProfile, Subscription } from '../types/finance';
import { MERCHANT_MAP, normalizeMerchantKey } from './merchants';

export const SAMPLE_SMS_STRINGS: string[] = [
  'HDFC Bank: Rs 450.00 debited from a/c **4921 on 28-OCT-26 to SWIGGY-BANGALORE. Avl bal: Rs 18,430.00.',
  'ICICI Bank Alert: Paid INR 380.00 using UPI to ZOMATO FOOD via UPI txn 918237192. Avl Bal: INR 18,050.',
  'SBI Alert: Dear Customer, your A/C 3819 debited by INR 320 on 27-OCT-26 at UBER TRIP BLR. Bal: INR 17,730.',
  'HDFC Bank: Rs 1,499.00 debited from card ending 4921 for CULT.FIT FITNESS on 24-OCT-26.',
  'ICICI Bank: INR 649.00 debited for NETFLIX RECURRING via card 8812 on 22-OCT-26.',
  'HDFC Bank: INR 22,000.00 debited via UPI to UPI-RAHUL KUMAR-9876@ybl ref 88291039 on 03-OCT-26.',
  'SBI Alert: INR 850 debited to UPI-AMIT-STORE-4819@paytm on 25-OCT-26. Bal: INR 16,880.',
  'HDFC Bank: Rs 1,280.00 debited for BIGBASKET GROCERIES ref BB98219.',
  'ICICI Bank: INR 749.00 debited for JIO PREPAID RECHARGE on 18-OCT-26.',
  'HDFC Bank: Rs 1,320.00 debited towards BESCOM ELECTRICITY on 10-OCT-26.',
  'SBI Alert: INR 119 debited for SPOTIFY INDIA via e-mandate on 15-OCT-26.',
  'HDFC Bank: Rs 2,499.00 debited at AMAZON RETAIL BLR on 12-OCT-26.',
  'ICICI Bank: INR 280.00 debited at BLUE TOKAI COFFEE via UPI.',
  'HDFC Bank: Salary of INR 60,000.00 credited to A/C **4921 by TECH LABS INDIA PVT LTD on 01-OCT-26.',
  'HDFC Bank: Rs 520.00 debited at ZOMATO BANGALORE on 29-OCT-26.',
];

export function generateSeedData(): {
  profile: UserProfile;
  goals: Goal[];
  transactions: Transaction[];
  subscriptions: Subscription[];
} {
  const today = new Date();
  
  // Helper to format ISO date offset by days
  const getDateOffset = (daysAgo: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const profile: UserProfile = {
    name: 'Aakash',
    monthlyIncome: 60000,
    fixedCosts: [
      { id: 'fc_rent', name: 'Apartment Rent', amount: 22000, category: 'Rent & Housing', dueDate: 5, merchantKey: 'rahul' },
      { id: 'fc_bescom', name: 'Electricity Bill', amount: 1350, category: 'Utilities & Bills', dueDate: 10, merchantKey: 'bescom' },
      { id: 'fc_jio', name: 'Wifi & Mobile (Jio)', amount: 749, category: 'Utilities & Bills', dueDate: 18, merchantKey: 'jio' },
    ],
    emergencyFundSaved: 85000,
    hasCompletedOnboarding: true,
    createdAt: new Date().toISOString(),
  };

  const goals: Goal[] = [
    {
      id: 'goal_goa',
      name: 'Goa Trip',
      targetAmount: 80000,
      currentAmount: 34000,
      targetDate: '2027-03-31',
      category: 'Travel',
      color: '#1F6F5B',
    },
    {
      id: 'goal_emergency',
      name: 'Emergency Fund',
      targetAmount: 150000,
      currentAmount: 85000,
      targetDate: '2027-08-31',
      category: 'Savings',
      color: '#416B95',
    },
  ];

  const transactions: Transaction[] = [];

  // Salary credits 1st of Aug, Sep, Oct
  transactions.push(
    {
      id: 'tx_sal_3',
      date: getDateOffset(61),
      amount: 60000,
      type: 'income',
      merchantRaw: 'Tech Labs India - Salary Credit',
      merchantClean: 'Tech Labs India',
      merchantKey: 'salary',
      category: 'Salary & Income',
      confidence: 1.0,
      isUncategorized: false,
    },
    {
      id: 'tx_sal_2',
      date: getDateOffset(31),
      amount: 60000,
      type: 'income',
      merchantRaw: 'Tech Labs India - Salary Credit',
      merchantClean: 'Tech Labs India',
      merchantKey: 'salary',
      category: 'Salary & Income',
      confidence: 1.0,
      isUncategorized: false,
    },
    {
      id: 'tx_sal_1',
      date: getDateOffset(1),
      amount: 60000,
      type: 'income',
      merchantRaw: 'Tech Labs India - Salary Credit',
      merchantClean: 'Tech Labs India',
      merchantKey: 'salary',
      category: 'Salary & Income',
      confidence: 1.0,
      isUncategorized: false,
    }
  );

  // Rent payments - 2 past and 1 recent.
  // CRITICAL REQUIREMENT: "2 messy UPI refs (e.g. 'UPI-RAHUL KUMAR-9876@ybl') that start uncategorized so the correction loop demos well."
  transactions.push(
    {
      id: 'tx_rent_past_2',
      date: getDateOffset(60),
      amount: 22000,
      type: 'expense',
      merchantRaw: 'UPI-RAHUL KUMAR-9876@ybl',
      merchantClean: 'Rahul Kumar',
      merchantKey: 'rahul',
      category: 'Other / Uncategorized',
      confidence: 0.5,
      isUncategorized: true,
      notes: 'Monthly landlord transfer',
    },
    {
      id: 'tx_rent_past_1',
      date: getDateOffset(30),
      amount: 22000,
      type: 'expense',
      merchantRaw: 'UPI-RAHUL KUMAR-9876@ybl',
      merchantClean: 'Rahul Kumar',
      merchantKey: 'rahul',
      category: 'Other / Uncategorized',
      confidence: 0.5,
      isUncategorized: true,
      notes: 'Monthly landlord transfer',
    },
    {
      id: 'tx_rent_current',
      date: getDateOffset(2),
      amount: 22000,
      type: 'expense',
      merchantRaw: 'UPI-RAHUL KUMAR-9876@ybl',
      merchantClean: 'Rahul Kumar',
      merchantKey: 'rahul',
      category: 'Other / Uncategorized',
      confidence: 0.5,
      isUncategorized: true,
      notes: 'Monthly landlord transfer',
    },
    {
      id: 'tx_messy_store',
      date: getDateOffset(1),
      amount: 850,
      type: 'expense',
      merchantRaw: 'UPI-AMIT-STORE-4819@paytm',
      merchantClean: 'Amit Store',
      merchantKey: 'amitstore',
      category: 'Other / Uncategorized',
      confidence: 0.55,
      isUncategorized: true,
      status: 'pending',
    },
    {
      id: 'tx_pending_bescom',
      date: getDateOffset(0),
      amount: 1350,
      type: 'expense',
      merchantRaw: 'BESCOM Electricity Bill Auto-Debit',
      merchantClean: 'BESCOM Electricity',
      merchantKey: 'bescom',
      domain: 'bescom.karnataka.gov.in',
      category: 'Utilities & Bills',
      confidence: 0.95,
      isUncategorized: false,
      status: 'pending',
    }
  );

  // Netflix subscription: price change from ₹499 to ₹649
  transactions.push(
    {
      id: 'tx_netflix_aug',
      date: getDateOffset(68),
      amount: 499,
      type: 'expense',
      merchantRaw: 'Netflix India',
      merchantClean: 'Netflix',
      merchantKey: 'netflix',
      domain: 'netflix.com',
      category: 'Subscriptions',
      confidence: 0.98,
      isUncategorized: false,
    },
    {
      id: 'tx_netflix_sep',
      date: getDateOffset(38),
      amount: 499,
      type: 'expense',
      merchantRaw: 'Netflix India',
      merchantClean: 'Netflix',
      merchantKey: 'netflix',
      domain: 'netflix.com',
      category: 'Subscriptions',
      confidence: 0.98,
      isUncategorized: false,
    },
    {
      id: 'tx_netflix_oct',
      date: getDateOffset(8),
      amount: 649, // PRICE INCREASE FLAGGED!
      type: 'expense',
      merchantRaw: 'Netflix India Premium',
      merchantClean: 'Netflix',
      merchantKey: 'netflix',
      domain: 'netflix.com',
      category: 'Subscriptions',
      confidence: 0.98,
      isUncategorized: false,
    }
  );

  // Spotify ₹119 monthly
  transactions.push(
    {
      id: 'tx_spot_3',
      date: getDateOffset(65),
      amount: 119,
      type: 'expense',
      merchantRaw: 'Spotify India',
      merchantClean: 'Spotify',
      merchantKey: 'spotify',
      domain: 'spotify.com',
      category: 'Subscriptions',
      confidence: 0.98,
      isUncategorized: false,
    },
    {
      id: 'tx_spot_2',
      date: getDateOffset(35),
      amount: 119,
      type: 'expense',
      merchantRaw: 'Spotify India',
      merchantClean: 'Spotify',
      merchantKey: 'spotify',
      domain: 'spotify.com',
      category: 'Subscriptions',
      confidence: 0.98,
      isUncategorized: false,
    },
    {
      id: 'tx_spot_1',
      date: getDateOffset(5),
      amount: 119,
      type: 'expense',
      merchantRaw: 'Spotify India',
      merchantClean: 'Spotify',
      merchantKey: 'spotify',
      domain: 'spotify.com',
      category: 'Subscriptions',
      confidence: 0.98,
      isUncategorized: false,
    }
  );

  // Cult.fit Gym ₹1,499
  transactions.push(
    {
      id: 'tx_cult_3',
      date: getDateOffset(70),
      amount: 1499,
      type: 'expense',
      merchantRaw: 'Cult.fit Fitness Membership',
      merchantClean: 'Cult.fit Gym',
      merchantKey: 'cultfit',
      domain: 'cult.fit',
      category: 'Health & Fitness',
      confidence: 0.95,
      isUncategorized: false,
    },
    {
      id: 'tx_cult_2',
      date: getDateOffset(40),
      amount: 1499,
      type: 'expense',
      merchantRaw: 'Cult.fit Fitness Membership',
      merchantClean: 'Cult.fit Gym',
      merchantKey: 'cultfit',
      domain: 'cult.fit',
      category: 'Health & Fitness',
      confidence: 0.95,
      isUncategorized: false,
    },
    {
      id: 'tx_cult_1',
      date: getDateOffset(10),
      amount: 1499,
      type: 'expense',
      merchantRaw: 'Cult.fit Fitness Membership',
      merchantClean: 'Cult.fit Gym',
      merchantKey: 'cultfit',
      domain: 'cult.fit',
      category: 'Health & Fitness',
      confidence: 0.95,
      isUncategorized: false,
    }
  );

  // Electricity (BESCOM) and Jio recharge
  transactions.push(
    {
      id: 'tx_elec_2',
      date: getDateOffset(42),
      amount: 1240,
      type: 'expense',
      merchantRaw: 'BESCOM Electricity Bangalore',
      merchantClean: 'BESCOM Electricity',
      merchantKey: 'bescom',
      domain: 'bescom.karnataka.gov.in',
      category: 'Utilities & Bills',
      confidence: 0.95,
      isUncategorized: false,
    },
    {
      id: 'tx_elec_1',
      date: getDateOffset(12),
      amount: 1350,
      type: 'expense',
      merchantRaw: 'BESCOM Electricity Bangalore',
      merchantClean: 'BESCOM Electricity',
      merchantKey: 'bescom',
      domain: 'bescom.karnataka.gov.in',
      category: 'Utilities & Bills',
      confidence: 0.95,
      isUncategorized: false,
    },
    {
      id: 'tx_jio_2',
      date: getDateOffset(45),
      amount: 749,
      type: 'expense',
      merchantRaw: 'Reliance Jio Fiber & Mobile',
      merchantClean: 'Reliance Jio',
      merchantKey: 'jio',
      domain: 'jio.com',
      category: 'Utilities & Bills',
      confidence: 0.95,
      isUncategorized: false,
    },
    {
      id: 'tx_jio_1',
      date: getDateOffset(15),
      amount: 749,
      type: 'expense',
      merchantRaw: 'Reliance Jio Fiber & Mobile',
      merchantClean: 'Reliance Jio',
      merchantKey: 'jio',
      domain: 'jio.com',
      category: 'Utilities & Bills',
      confidence: 0.95,
      isUncategorized: false,
    }
  );

  // Realistic daily variable spend across Swiggy, Zomato, Uber, BigBasket, Amazon, Blue Tokai
  const variableMerchants = [
    { key: 'swiggy', name: 'Swiggy', domain: 'swiggy.com', cat: 'Food & Dining', amounts: [280, 450, 520, 340, 680, 220, 490] },
    { key: 'zomato', name: 'Zomato', domain: 'zomato.com', cat: 'Food & Dining', amounts: [380, 540, 310, 420, 750, 290] },
    { key: 'uber', name: 'Uber', domain: 'uber.com', cat: 'Commute & Travel', amounts: [240, 320, 410, 190, 280, 350] },
    { key: 'bigbasket', name: 'BigBasket', domain: 'bigbasket.com', cat: 'Groceries', amounts: [1180, 1450, 920, 1680, 840] },
    { key: 'amazon', name: 'Amazon', domain: 'amazon.in', cat: 'Shopping', amounts: [1299, 899, 2499, 649, 1499] },
    { key: 'bluetokai', name: 'Blue Tokai Coffee', domain: 'bluetokaicoffee.com', cat: 'Food & Dining', amounts: [260, 310, 280, 340] },
    { key: 'zepto', name: 'Zepto', domain: 'zepto.com', cat: 'Groceries', amounts: [240, 410, 360, 190] },
  ];

  let txIdCounter = 100;
  for (let daysAgo = 1; daysAgo <= 85; daysAgo += 2) {
    const merchant = variableMerchants[daysAgo % variableMerchants.length];
    const amount = merchant.amounts[daysAgo % merchant.amounts.length];

    transactions.push({
      id: `tx_${txIdCounter++}`,
      date: getDateOffset(daysAgo),
      amount,
      type: 'expense',
      merchantRaw: `${merchant.name} Order`,
      merchantClean: merchant.name,
      merchantKey: merchant.key,
      domain: merchant.domain,
      category: merchant.cat,
      confidence: 0.95,
      isUncategorized: false,
    });
  }

  // Pre-configured subscriptions
  const subscriptions: Subscription[] = [
    {
      id: 'sub_netflix',
      name: 'Netflix',
      merchantKey: 'netflix',
      domain: 'netflix.com',
      amount: 649,
      previousAmount: 499,
      billingFrequency: 'monthly',
      category: 'Subscriptions',
      lastChargeDate: getDateOffset(8),
      flaggedInactive: false,
    },
    {
      id: 'sub_spotify',
      name: 'Spotify',
      merchantKey: 'spotify',
      domain: 'spotify.com',
      amount: 119,
      billingFrequency: 'monthly',
      category: 'Subscriptions',
      lastChargeDate: getDateOffset(5),
      flaggedInactive: false,
    },
    {
      id: 'sub_cultfit',
      name: 'Cult.fit Gym',
      merchantKey: 'cultfit',
      domain: 'cult.fit',
      amount: 1499,
      billingFrequency: 'monthly',
      category: 'Health & Fitness',
      lastChargeDate: getDateOffset(10),
      flaggedInactive: false,
    },
    {
      id: 'sub_jio',
      name: 'Reliance Jio Fiber',
      merchantKey: 'jio',
      domain: 'jio.com',
      amount: 749,
      billingFrequency: 'monthly',
      category: 'Utilities & Bills',
      lastChargeDate: getDateOffset(15),
      flaggedInactive: false,
    },
  ];

  return { profile, goals, transactions, subscriptions };
}
