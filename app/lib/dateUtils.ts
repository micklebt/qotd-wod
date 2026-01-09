/**
 * Utility functions for date/time formatting in EST/EDT timezone
 * 
 * CRITICAL: Supabase returns timestamps WITHOUT 'Z' suffix (e.g., "2026-01-09T01:13:55.276326").
 * JavaScript interprets such strings as LOCAL time, but Supabase stores them as UTC.
 * All functions that parse string timestamps must append 'Z' to force UTC interpretation.
 */

function normalizeTimestamp(dateStr: string): string {
  if (dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.match(/-\d{2}:\d{2}$/)) {
    return dateStr + 'Z';
  }
  return dateStr;
}

export function toEST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(normalizeTimestamp(date)) : date;
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
  
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
  
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

export function formatDateEST(date: Date | string): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return month + '/' + day + '/' + year;
  }
  
  const d = typeof date === 'string' ? new Date(normalizeTimestamp(date)) : date;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  
  return formatter.format(d);
}

export function formatDateTimeEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(normalizeTimestamp(date)) : date;
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

export function getDateStringEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(normalizeTimestamp(date)) : date;
  
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
  
  return year + '-' + month + '-' + day;
}

export function getYearEST(date: Date | string): number {
  const dateStr = getDateStringEST(date);
  return parseInt(dateStr.split('-')[0]);
}

export function getMonthEST(date: Date | string): number {
  const dateStr = getDateStringEST(date);
  const month = parseInt(dateStr.split('-')[1]);
  return month - 1;
}

export function getMonthStartEST(year: number, month: number): string {
  return year + '-' + String(month + 1).padStart(2, '0') + '-01';
}

export function getCurrentMonthStartEST(): string {
  const today = new Date();
  const todayEST = getDateStringEST(today);
  const [year, month] = todayEST.split('-').map(Number);
  return getMonthStartEST(year, month - 1);
}

export function getPreviousMonthStartEST(): string {
  const today = new Date();
  const todayEST = getDateStringEST(today);
  const [year, month] = todayEST.split('-').map(Number);
  let prevMonth = month - 2;
  let prevYear = year;
  
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear = year - 1;
  }
  
  return getMonthStartEST(prevYear, prevMonth);
}

export function getPreviousDayEST(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() - 1);
  return getDateStringEST(date);
}

export function getNextDayEST(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + 1);
  return getDateStringEST(date);
}

export function getCurrentTimestampEST(): string {
  const now = new Date();
  const estDate = toEST(now);
  return estDate.toISOString();
}

export function getESTDateRange(dateStr: string): { start: string; end: string } {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  const isDST = isDateInDST(year, month - 1, day);
  const offsetHours = isDST ? 4 : 5;
  
  const start = new Date(Date.UTC(year, month - 1, day, offsetHours, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, offsetHours + 24, 0, 0) - 1);
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function isDateInDST(year: number, month: number, day: number): boolean {
  const marchSecondSunday = getNthSunday(year, 2, 1);
  const novemberFirstSunday = getNthSunday(year, 10, 0);
  
  const date = new Date(year, month, day);
  const marchStart = new Date(year, 2, marchSecondSunday, 2, 0, 0);
  const novemberEnd = new Date(year, 10, novemberFirstSunday, 2, 0, 0);
  
  return date >= marchStart && date < novemberEnd;
}

function getNthSunday(year: number, month: number, n: number): number {
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  const daysUntilFirstSunday = (7 - firstDayOfWeek) % 7;
  const firstSunday = 1 + daysUntilFirstSunday;
  
  return firstSunday + (n * 7);
}

export function getESTMonthRange(year: number, month: number): { start: string; end: string } {
  const monthStart = getMonthStartEST(year, month);
  const monthEndDate = new Date(year, month + 1, 0);
  const monthEndStr = getDateStringEST(monthEndDate);
  
  const startRange = getESTDateRange(monthStart);
  const endRange = getESTDateRange(monthEndStr);
  
  return {
    start: startRange.start,
    end: endRange.end
  };
}
