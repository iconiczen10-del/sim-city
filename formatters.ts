// formatters.ts — Currency (∆), unit price, date, labels, mood colors, and tier tokens

import { MONTH_NAMES } from './constants';
import type { LivingStandard, MarginMood, ShoppingCategory } from './martTypes';
import type { DeathCause, EducationLevel, HomeType, TierId } from './types';

export function formatDelta(amount: number): string {
  const rounded = Math.round(amount);
  const absFormatted = Math.abs(rounded).toLocaleString('en-IN');
  return rounded < 0 ? `-∆${absFormatted}` : `∆${absFormatted}`;
}

export function formatPrice(amount: number): string {
  const clean = Math.round(amount * 100) / 100;
  const formatted = Number.isInteger(clean)
    ? Math.abs(clean).toLocaleString('en-IN')
    : Math.abs(clean).toFixed(2);
  return clean < 0 ? `-∆${formatted}` : `∆${formatted}`;
}

export function formatSignedDelta(amount: number): string {
  const rounded = Math.round(amount);
  const absFormatted = Math.abs(rounded).toLocaleString('en-IN');
  if (rounded > 0) return `+∆${absFormatted}`;
  if (rounded < 0) return `-∆${absFormatted}`;
  return '∆0';
}

export function formatSimDate(day: number, month: number, year: number): string {
  return `${day} ${MONTH_NAMES[(month - 1) % 12]}, Year ${year}`;
}

export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[(month - 1) % 12]} Y${year}`;
}

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  none: 'No Formal', school: 'School', diploma: 'Diploma',
  degree: 'Degree', masters: "Master's", professional: 'Professional',
};

export const HOME_LABELS: Record<HomeType, string> = {
  shared_room: 'Shared Room', small_flat: 'Small Flat',
  apartment: 'Apartment', villa: 'Villa', mansion: 'Mansion',
};

export const STANDARD_LABELS: Record<LivingStandard, string> = {
  1: 'Minimum', 2: 'Medium', 3: 'Good', 4: 'Comfortable Rich', 5: 'Luxury',
};

export const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  food: 'Food', water: 'Water', clothes: 'Clothes', household: 'Household',
};

export const DEATH_CAUSE_LABELS: Record<DeathCause, string> = {
  starvation: 'Starvation', dehydration: 'Dehydration', illness: 'Illness',
};

export const MOOD_META: Record<MarginMood, { label: string; color: string; textClass: string }> = {
  clearance: { label: 'Clearance', color: '#2dd4bf', textClass: 'text-teal-300' },
  generous: { label: 'Generous', color: '#34d399', textClass: 'text-emerald-300' },
  good: { label: 'Good', color: '#38bdf8', textClass: 'text-sky-300' },
  typical: { label: 'Typical', color: '#cbd5e1', textClass: 'text-slate-200' },
  greedy: { label: 'A Little Greedy', color: '#fbbf24', textClass: 'text-amber-300' },
  gouging: { label: 'Gouging', color: '#f87171', textClass: 'text-rose-400' },
};

export const TIER_STYLES: Record<
  TierId,
  { badge: string; bar: string; text: string; label: string }
> = {
  T1: { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40', bar: 'bg-amber-400', text: 'text-amber-300', label: 'T1 Elite (80+)' },
  T2: { badge: 'bg-purple-500/15 text-purple-300 border-purple-500/40', bar: 'bg-purple-400', text: 'text-purple-300', label: 'T2 Upper (60–79)' },
  T3: { badge: 'bg-sky-500/15 text-sky-300 border-sky-500/40', bar: 'bg-sky-400', text: 'text-sky-300', label: 'T3 Middle (40–59)' },
  T4: { badge: 'bg-teal-500/15 text-teal-300 border-teal-500/40', bar: 'bg-teal-400', text: 'text-teal-300', label: 'T4 Modest (20–39)' },
  T5: { badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40', bar: 'bg-slate-500', text: 'text-slate-300', label: 'T5 Struggling (<20)' },
};
