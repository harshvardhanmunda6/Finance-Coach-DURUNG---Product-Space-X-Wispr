/**
 * Merchant to domain mapping, default category registry, and logo utilities.
 * Uses Google Favicons: https://www.google.com/s2/favicons?domain={domain}&sz=128
 */

export interface MerchantMetadata {
  domain: string;
  name: string;
  defaultCategory: string;
  avatarBg: string;
  avatarText: string;
}

export const MERCHANT_MAP: Record<string, MerchantMetadata> = {
  swiggy: {
    domain: 'swiggy.com',
    name: 'Swiggy',
    defaultCategory: 'Food & Dining',
    avatarBg: '#FC8019',
    avatarText: '#FFFFFF',
  },
  zomato: {
    domain: 'zomato.com',
    name: 'Zomato',
    defaultCategory: 'Food & Dining',
    avatarBg: '#E23744',
    avatarText: '#FFFFFF',
  },
  uber: {
    domain: 'uber.com',
    name: 'Uber',
    defaultCategory: 'Commute & Travel',
    avatarBg: '#000000',
    avatarText: '#FFFFFF',
  },
  ola: {
    domain: 'olacabs.com',
    name: 'Ola',
    defaultCategory: 'Commute & Travel',
    avatarBg: '#F3BE1A',
    avatarText: '#000000',
  },
  netflix: {
    domain: 'netflix.com',
    name: 'Netflix',
    defaultCategory: 'Subscriptions',
    avatarBg: '#E50914',
    avatarText: '#FFFFFF',
  },
  spotify: {
    domain: 'spotify.com',
    name: 'Spotify',
    defaultCategory: 'Subscriptions',
    avatarBg: '#1DB954',
    avatarText: '#FFFFFF',
  },
  amazon: {
    domain: 'amazon.in',
    name: 'Amazon',
    defaultCategory: 'Shopping',
    avatarBg: '#232F3E',
    avatarText: '#FF9900',
  },
  flipkart: {
    domain: 'flipkart.com',
    name: 'Flipkart',
    defaultCategory: 'Shopping',
    avatarBg: '#2874F0',
    avatarText: '#FFE500',
  },
  bigbasket: {
    domain: 'bigbasket.com',
    name: 'BigBasket',
    defaultCategory: 'Groceries',
    avatarBg: '#84C225',
    avatarText: '#FFFFFF',
  },
  blinkit: {
    domain: 'blinkit.com',
    name: 'Blinkit',
    defaultCategory: 'Groceries',
    avatarBg: '#F8CB46',
    avatarText: '#000000',
  },
  zepto: {
    domain: 'zepto.com',
    name: 'Zepto',
    defaultCategory: 'Groceries',
    avatarBg: '#E01F54',
    avatarText: '#FFFFFF',
  },
  jio: {
    domain: 'jio.com',
    name: 'Reliance Jio',
    defaultCategory: 'Utilities & Bills',
    avatarBg: '#0F3E99',
    avatarText: '#FFFFFF',
  },
  airtel: {
    domain: 'airtel.in',
    name: 'Airtel',
    defaultCategory: 'Utilities & Bills',
    avatarBg: '#EE0000',
    avatarText: '#FFFFFF',
  },
  cultfit: {
    domain: 'cult.fit',
    name: 'Cult.fit Gym',
    defaultCategory: 'Health & Fitness',
    avatarBg: '#FF3278',
    avatarText: '#FFFFFF',
  },
  curefit: {
    domain: 'cult.fit',
    name: 'Cult.fit Gym',
    defaultCategory: 'Health & Fitness',
    avatarBg: '#FF3278',
    avatarText: '#FFFFFF',
  },
  tatapower: {
    domain: 'tatapower.com',
    name: 'Tata Power Electricity',
    defaultCategory: 'Utilities & Bills',
    avatarBg: '#005088',
    avatarText: '#FFFFFF',
  },
  bescom: {
    domain: 'bescom.karnataka.gov.in',
    name: 'BESCOM Electricity',
    defaultCategory: 'Utilities & Bills',
    avatarBg: '#135398',
    avatarText: '#FFFFFF',
  },
  cred: {
    domain: 'cred.club',
    name: 'CRED',
    defaultCategory: 'Utilities & Bills',
    avatarBg: '#121212',
    avatarText: '#FFFFFF',
  },
  apple: {
    domain: 'apple.com',
    name: 'Apple Services',
    defaultCategory: 'Subscriptions',
    avatarBg: '#333333',
    avatarText: '#FFFFFF',
  },
  google: {
    domain: 'google.com',
    name: 'Google One / YouTube',
    defaultCategory: 'Subscriptions',
    avatarBg: '#4285F4',
    avatarText: '#FFFFFF',
  },
  bookmyshow: {
    domain: 'bookmyshow.com',
    name: 'BookMyShow',
    defaultCategory: 'Entertainment',
    avatarBg: '#C4242D',
    avatarText: '#FFFFFF',
  },
  myntra: {
    domain: 'myntra.com',
    name: 'Myntra',
    defaultCategory: 'Shopping',
    avatarBg: '#FF3F6C',
    avatarText: '#FFFFFF',
  },
  starbucks: {
    domain: 'starbucks.in',
    name: 'Starbucks India',
    defaultCategory: 'Food & Dining',
    avatarBg: '#006241',
    avatarText: '#FFFFFF',
  },
  bluetokai: {
    domain: 'bluetokaicoffee.com',
    name: 'Blue Tokai Coffee',
    defaultCategory: 'Food & Dining',
    avatarBg: '#1B365D',
    avatarText: '#FFFFFF',
  },
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Food & Dining': { bg: '#FDF0ED', text: '#9B391A', dot: '#E4572E' },
  'Groceries': { bg: '#EEF7F2', text: '#195B4A', dot: '#1F6F5B' },
  'Commute & Travel': { bg: '#F2F4F8', text: '#2C496A', dot: '#416B95' },
  'Subscriptions': { bg: '#F5EFFB', text: '#5D2E8C', dot: '#8442C2' },
  'Shopping': { bg: '#FEF8EA', text: '#8F6612', dot: '#D9A441' },
  'Utilities & Bills': { bg: '#F0F3F5', text: '#3E505B', dot: '#5E7482' },
  'Health & Fitness': { bg: '#FBEFF4', text: '#892353', dot: '#B93270' },
  'Entertainment': { bg: '#F8EEF8', text: '#76287A', dot: '#A33DA8' },
  'Rent & Housing': { bg: '#EBF4F6', text: '#1E5866', dot: '#2A788A' },
  'Salary & Income': { bg: '#E8F5EE', text: '#165F3A', dot: '#1E824C' },
  'Investment & Savings': { bg: '#E9F1F7', text: '#1F4F7A', dot: '#2C6FA8' },
  'Other / Uncategorized': { bg: '#EFEFEA', text: '#555550', dot: '#888882' },
};

export const ALL_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Commute & Travel',
  'Subscriptions',
  'Shopping',
  'Utilities & Bills',
  'Health & Fitness',
  'Entertainment',
  'Rent & Housing',
  'Other / Uncategorized',
];

/**
 * Normalizes any merchant string (e.g., "SWIGGY-BANGALORE-987" -> "swiggy")
 */
export function normalizeMerchantKey(raw: string): string {
  if (!raw) return 'unknown';
  const clean = raw.toLowerCase().trim();
  
  if (clean.includes('swiggy')) return 'swiggy';
  if (clean.includes('zomato')) return 'zomato';
  if (clean.includes('uber')) return 'uber';
  if (clean.includes('ola')) return 'ola';
  if (clean.includes('netflix')) return 'netflix';
  if (clean.includes('spotify')) return 'spotify';
  if (clean.includes('amazon') || clean.includes('amzn')) return 'amazon';
  if (clean.includes('flipkart')) return 'flipkart';
  if (clean.includes('bigbasket') || clean.includes('bbnow')) return 'bigbasket';
  if (clean.includes('blinkit') || clean.includes('grofers')) return 'blinkit';
  if (clean.includes('zepto')) return 'zepto';
  if (clean.includes('jio')) return 'jio';
  if (clean.includes('airtel')) return 'airtel';
  if (clean.includes('cult') || clean.includes('curefit')) return 'cultfit';
  if (clean.includes('tata power') || clean.includes('tatapower')) return 'tatapower';
  if (clean.includes('bescom')) return 'bescom';
  if (clean.includes('cred')) return 'cred';
  if (clean.includes('apple') || clean.includes('itunes')) return 'apple';
  if (clean.includes('google') || clean.includes('youtube')) return 'google';
  if (clean.includes('bookmyshow') || clean.includes('bms')) return 'bookmyshow';
  if (clean.includes('myntra')) return 'myntra';
  if (clean.includes('starbucks')) return 'starbucks';
  if (clean.includes('blue tokai') || clean.includes('bluetokai')) return 'bluetokai';
  if (clean.includes('rahul')) return 'rahul';
  if (clean.includes('rent')) return 'rent';

  // Fallback: strip punctuation and take first alphanumeric token
  return clean.replace(/[^a-z0-9]/g, ' ').split(/\s+/)[0] || clean;
}

export function getMerchantFaviconUrl(domain?: string): string | null {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
