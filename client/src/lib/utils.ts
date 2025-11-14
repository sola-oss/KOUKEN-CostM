import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats an ISO date string (with timezone) to Japanese date format (YYYY/MM/DD)
 * Extracts YYYY-MM-DD directly from the string to avoid timezone conversion issues
 * 
 * @example
 * formatDate('2025-12-31T00:00:00+09:00') // => '2025/12/31'
 * formatDate(null) // => '-'
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  // Extract YYYY-MM-DD from ISO string to avoid timezone issues
  // Input: '2025-12-31T00:00:00+09:00' -> Output: '2025/12/31'
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '-';
  const [, year, month, day] = match;
  return `${year}/${month}/${day}`;
}
