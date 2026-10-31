import React, { useState } from 'react';
import { MERCHANT_MAP } from '../../lib/merchants';
import {
  Utensils,
  ShoppingBag,
  Car,
  Tv,
  Zap,
  Dumbbell,
  Film,
  Home,
  IndianRupee,
  HelpCircle,
} from 'lucide-react';

interface MerchantLogoProps {
  merchantKey: string;
  domain?: string;
  merchantName: string;
  category: string;
  size?: number; // default 40
}

export const MerchantLogo: React.FC<MerchantLogoProps> = ({
  merchantKey,
  domain,
  merchantName,
  category,
  size = 40,
}) => {
  const [imgError, setImgError] = useState(false);
  const meta = MERCHANT_MAP[merchantKey];
  const targetDomain = domain || meta?.domain;

  const faviconUrl = targetDomain && !imgError
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(targetDomain)}&sz=128`
    : null;

  const getCategoryIcon = (cat: string) => {
    const strokeWidth = 1.5;
    const iconSize = Math.max(16, Math.round(size * 0.45));
    switch (cat) {
      case 'Food & Dining':
        return <Utensils size={iconSize} strokeWidth={strokeWidth} />;
      case 'Groceries':
      case 'Shopping':
        return <ShoppingBag size={iconSize} strokeWidth={strokeWidth} />;
      case 'Commute & Travel':
        return <Car size={iconSize} strokeWidth={strokeWidth} />;
      case 'Subscriptions':
        return <Tv size={iconSize} strokeWidth={strokeWidth} />;
      case 'Utilities & Bills':
        return <Zap size={iconSize} strokeWidth={strokeWidth} />;
      case 'Health & Fitness':
        return <Dumbbell size={iconSize} strokeWidth={strokeWidth} />;
      case 'Entertainment':
        return <Film size={iconSize} strokeWidth={strokeWidth} />;
      case 'Rent & Housing':
        return <Home size={iconSize} strokeWidth={strokeWidth} />;
      case 'Salary & Income':
        return <IndianRupee size={iconSize} strokeWidth={strokeWidth} />;
      default:
        return <HelpCircle size={iconSize} strokeWidth={strokeWidth} />;
    }
  };

  const initial = (merchantName || merchantKey || 'M').charAt(0).toUpperCase();

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      className="rounded-[12px] flex items-center justify-center shrink-0 bg-white dark:bg-[#1A1A1D] border border-[var(--line-border)]/80 p-1.5 shadow-xs overflow-hidden"
    >
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt={merchantName}
          className="w-full h-full object-contain filter drop-shadow-xs"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full rounded-[8px] bg-[var(--surface-secondary)]/70 flex items-center justify-center text-[var(--ink-primary)] font-bold text-xs">
          {meta ? initial : getCategoryIcon(category)}
        </div>
      )}
    </div>
  );
};
