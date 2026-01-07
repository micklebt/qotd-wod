/**
 * Utility functions for date/time formatting in EST/EDT timezone
 */

/**
 * Converts a UTC timestamp to EST/EDT timezone
 * EST is UTC-5, EDT is UTC-4 (daylight saving time)
 * Returns a Date object with the EST/EDT time components
 * Note: This creates a date in local timezone, but with EST time values
 * Use getDateStringEST() for date comparisons to avoid timezone issues
 */
export function toEST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Create a date formatter for EST/EDT timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Get parts and reconstruct date in EST
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
  
  // Create date in UTC to avoid local timezone interpretation
  // This represents the EST/EDT date/time but stored as UTC
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Formats a date to EST/EDT and returns as locale date string
 * If input is a date string (YYYY-MM-DD), format it directly without timezone conversion
 */
export function formatDateEST(date: Date | string): string {
  // If it's a date string in YYYY-MM-DD format, format it directly
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    // Format directly without timezone conversion since the string already represents the date
    // Match the format that Intl.DateTimeFormat produces (M/D/YYYY)
    return `${month}/${day}/${year}`;
  }
  
  // For Date objects or other string formats, use EST timezone
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  
  return formatter.format(d);
}

/**
 * Formats a date to EST/EDT and returns as locale date and time string
 */
export function formatDateTimeEST(date: Date | string): string {
  const estDate = toEST(date);
  return estDate.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

/**
 * Gets the date string (YYYY-MM-DD) in EST/EDT timezone
 * This is the preferred method for date comparisons to ensure EST timezone is used
 */
export function getDateStringEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Use Intl.DateTimeFormat directly to get EST date components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value || '0';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  
  return `${year}-${month}-${day}`;
}

/**
 * Gets the year from a date in EST/EDT timezone
 */
export function getYearEST(date: Date | string): number {
  const dateStr = getDateStringEST(date);
  return parseInt(dateStr.split('-')[0]);
}

/**
 * Gets the month from a date in EST/EDT timezone (0-11)
 */
export function getMonthEST(date: Date | string): number {
  const dateStr = getDateStringEST(date);
  const month = parseInt(dateStr.split('-')[1]);
  return month - 1; // Convert 1-12 to 0-11
}

/**
 * Gets the first day of a month as a date string (YYYY-MM-01) in EST/EDT timezone
 */
export function getMonthStartEST(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/**
 * Gets the first day of the current month in EST/EDT timezone
 */
export function getCurrentMonthStartEST(): string {
  const today = new Date();
  const todayEST = getDateStringEST(today);
  const [year, month] = todayEST.split('-').map(Number);
  return getMonthStartEST(year, month - 1); // month is 1-12, need 0-11
}

/**
 * Gets the first day of the previous month in EST/EDT timezone
 */
export function getPreviousMonthStartEST(): string {
  const today = new Date();
  const todayEST = getDateStringEST(today);
  const [year, month] = todayEST.split('-').map(Number);
  let prevMonth = month - 2; // month is 1-12, subtract 2 to get previous month (0-11)
  let prevYear = year;
  
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear = year - 1;
  }
  
  return getMonthStartEST(prevYear, prevMonth);
}

/**
 * Gets the previous day's date string in EST/EDT timezone
 * Input: date string in YYYY-MM-DD format (EST)
 * Output: previous day's date string in YYYY-MM-DD format (EST)
 */
export function getPreviousDayEST(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create a date at noon EST to avoid timezone edge cases
  // Use Date constructor with month-1 (since months are 0-indexed)
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() - 1);
  // Convert back to EST date string
  return getDateStringEST(date);
}

/**
 * Gets the next day's date string in EST/EDT timezone
 * Input: date string in YYYY-MM-DD format (EST)
 * Output: next day's date string in YYYY-MM-DD format (EST)
 */
export function getNextDayEST(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create a date at noon EST to avoid timezone edge cases
  // Use Date constructor with month-1 (since months are 0-indexed)
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + 1);
  // Convert back to EST date string
  return getDateStringEST(date);
}

