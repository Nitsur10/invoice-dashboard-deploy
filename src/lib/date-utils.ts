/**
 * Safe date formatting utilities
 */

import { formatDistanceToNow } from 'date-fns';

/**
 * Safely format a date to relative time (e.g., "2 hours ago")
 * Returns null if the date is invalid
 */
export function safeFormatDistanceToNow(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return null;
  }
}

/**
 * Check if a value is a valid date
 */
export function isValidDate(date: any): boolean {
  if (!date) return false;
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return !isNaN(dateObj.getTime());
  } catch {
    return false;
  }
}

