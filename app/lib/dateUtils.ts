/**
 * Utility functions for date/time formatting in EST/EDT timezone
 */

/**
 * Converts a UTC timestamp to EST/EDT timezone
 * EST is UTC-5, EDT is UTC-4 (daylight saving time)
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
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Formats a date to EST/EDT and returns as locale date string
 */
export function formatDateEST(date: Date | string): string {
  const estDate = toEST(date);
  return estDate.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
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
 */
export function getDateStringEST(date: Date | string): string {
  const estDate = toEST(date);
  const year = estDate.getFullYear();
  const month = String(estDate.getMonth() + 1).padStart(2, '0');
  const day = String(estDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets the year from a date in EST/EDT timezone
 */
export function getYearEST(date: Date | string): number {
  const estDate = toEST(date);
  return estDate.getFullYear();
}

/**
 * Gets the month from a date in EST/EDT timezone (0-11)
 */
export function getMonthEST(date: Date | string): number {
  const estDate = toEST(date);
  return estDate.getMonth();
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
  const estDate = toEST(today);
  const year = estDate.getFullYear();
  const month = estDate.getMonth();
  return getMonthStartEST(year, month);
}

/**
 * Gets the first day of the previous month in EST/EDT timezone
 */
export function getPreviousMonthStartEST(): string {
  const today = new Date();
  const estDate = toEST(today);
  let year = estDate.getFullYear();
  let month = estDate.getMonth() - 1;
  
  if (month < 0) {
    month = 11;
    year -= 1;
  }
  
  return getMonthStartEST(year, month);
}

