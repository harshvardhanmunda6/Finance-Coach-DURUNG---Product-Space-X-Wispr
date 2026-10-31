/**
 * Formatters for Indian Rupee (₹1,23,456), IST relative dates, and math helpers
 */

export function formatINR(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '₹0';
  const isNegative = val < 0;
  const absVal = Math.round(Math.abs(val));
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(absVal);

  return isNegative ? `-${formatted}` : formatted;
}

export function formatINRShort(val: number): string {
  if (isNaN(val)) return '₹0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return formatINR(val);
}

/**
 * Returns formatted relative or clean IST date
 */
export function formatISTDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  
  // Normalize both to IST calendar date
  const dYear = date.getFullYear();
  const dMonth = date.getMonth();
  const dDay = date.getDate();

  const tYear = today.getFullYear();
  const tMonth = today.getMonth();
  const tDay = today.getDate();

  const diffDays = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (dYear === tYear && dMonth === tMonth && dDay === tDay) {
    return 'Today';
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dYear === yesterday.getFullYear() && dMonth === yesterday.getMonth() && dDay === yesterday.getDate()) {
    return 'Yesterday';
  }

  // Format as "14 Mar" or "14 Mar 2026"
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    ...(dYear !== tYear ? { year: 'numeric' } : {}),
  };
  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

export function formatGoalDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getTodayIST(): string {
  const now = new Date();
  // IST offset is UTC + 5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().split('T')[0];
}
