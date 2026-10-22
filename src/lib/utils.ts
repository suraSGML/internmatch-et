import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS class names, handling conflicts correctly.
 * Standard shadcn/ui utility.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as ETB currency (Ethiopian Birr).
 */
export function formatETB(amount: number): string {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a date for display (Gregorian calendar).
 * Database always stores Gregorian dates; Ethiopian calendar is display-only.
 */
export function formatDate(date: string | Date, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'am' ? 'am-ET' : 'en-ET', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function daysUntilDate(date: string, now = new Date()): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return Number.NaN;
  const [, year, month, day] = match;
  const targetDay = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const todayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const todayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayParts);
  if (!todayMatch) return Number.NaN;
  const [, todayYear, todayMonth, todayDay] = todayMatch;
  const today = Date.UTC(Number(todayYear), Number(todayMonth) - 1, Number(todayDay));
  return Math.round((targetDay - today) / (24 * 60 * 60 * 1000));
}

/**
 * Returns initials from a full name for avatar fallbacks.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Truncates text to a given length with ellipsis.
 */
export function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}...` : text;
}
