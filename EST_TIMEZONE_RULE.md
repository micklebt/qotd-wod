# EST Timezone Rule

## CRITICAL RULE: All Dates and Times Must Use EST/EDT

**The entire application and database MUST function off LOCAL TIME (EST/EDT) only and always.**

### Timezone Specification
- **Primary Timezone**: America/New_York (EST/EDT)
- **EST**: Eastern Standard Time (UTC-5) - November to March
- **EDT**: Eastern Daylight Time (UTC-4) - March to November
- The system automatically handles DST transitions

### Implementation Rules

#### 1. Database Timestamps
- **NEVER** use `new Date().toISOString()` directly
- **ALWAYS** use `getCurrentTimestampEST()` from `@/lib/dateUtils` for all database timestamp operations
- Database columns using `TIMESTAMPTZ` will store UTC, but the values must represent EST/EDT times

#### 2. Date Comparisons and Queries
- **ALWAYS** use `getDateStringEST()` for date comparisons (returns YYYY-MM-DD format)
- **ALWAYS** use `getESTDateRange()` or `getESTMonthRange()` for database date range queries
- **NEVER** use UTC timestamps (`T00:00:00Z`) directly in database queries

#### 3. Date Display
- **ALWAYS** use `formatDateEST()` or `formatDateTimeEST()` for displaying dates to users
- **NEVER** use native Date methods like `.toLocaleDateString()` without EST timezone specification

#### 4. Date Creation
- When creating dates from user input or date strings, **ALWAYS** interpret them as EST/EDT
- Use `getDateStringEST()` to normalize dates before comparisons
- Use `toEST()` to convert UTC timestamps to EST when needed

### Utility Functions (from `@/lib/dateUtils`)

#### Core Functions
- `getCurrentTimestampEST()` - Get current timestamp in EST as ISO string (use for database)
- `getDateStringEST(date)` - Get date string (YYYY-MM-DD) in EST timezone
- `formatDateEST(date)` - Format date for display in EST
- `formatDateTimeEST(date)` - Format date and time for display in EST
- `toEST(date)` - Convert UTC timestamp to EST Date object

#### Date Range Functions
- `getESTDateRange(dateStr)` - Get start/end timestamps for an EST date (for database queries)
- `getESTMonthRange(year, month)` - Get start/end timestamps for a month in EST

#### Date Manipulation Functions
- `getPreviousDayEST(dateStr)` - Get previous day in EST
- `getNextDayEST(dateStr)` - Get next day in EST
- `getCurrentMonthStartEST()` - Get first day of current month in EST
- `getPreviousMonthStartEST()` - Get first day of previous month in EST

### Examples

#### ✅ CORRECT: Creating a timestamp for database
```typescript
import { getCurrentTimestampEST } from '@/lib/dateUtils';

// CORRECT
const timestamp = getCurrentTimestampEST();

// WRONG
const timestamp = new Date().toISOString();
```

#### ✅ CORRECT: Database date range query
```typescript
import { getESTMonthRange } from '@/lib/dateUtils';

// CORRECT
const monthRange = getESTMonthRange(year, month);
const { data } = await supabase
  .from('entries')
  .select('*')
  .gte('created_at', monthRange.start)
  .lte('created_at', monthRange.end);

// WRONG
const { data } = await supabase
  .from('entries')
  .select('*')
  .gte('created_at', `${monthStart}T00:00:00Z`)
  .lte('created_at', `${monthEnd}T23:59:59Z`);
```

#### ✅ CORRECT: Date comparison
```typescript
import { getDateStringEST } from '@/lib/dateUtils';

// CORRECT
const todayEST = getDateStringEST(new Date());
const entryDateEST = getDateStringEST(entry.created_at);
if (todayEST === entryDateEST) {
  // Same day in EST
}

// WRONG
const today = new Date().toISOString().split('T')[0];
const entryDate = entry.created_at.split('T')[0];
if (today === entryDate) {
  // May be wrong due to timezone
}
```

#### ✅ CORRECT: Displaying dates
```typescript
import { formatDateEST } from '@/lib/dateUtils';

// CORRECT
<p>{formatDateEST(entry.created_at)}</p>

// WRONG
<p>{new Date(entry.created_at).toLocaleDateString()}</p>
```

### Database Schema Notes
- DATE columns store dates without timezone (interpreted as EST dates)
- TIMESTAMPTZ columns store UTC timestamps, but values must represent EST/EDT times
- When using `NOW()` in SQL, consider that it returns server time (may be UTC)
- Prefer using application-level timestamp generation with `getCurrentTimestampEST()`

### Migration Notes
- All existing timestamps in the database are assumed to be in UTC
- When reading from database, use `getDateStringEST()` to convert to EST for comparisons
- New timestamps must use `getCurrentTimestampEST()` to ensure EST timezone

### Testing
- Always test date functionality across DST transitions (March and November)
- Verify that dates display correctly regardless of user's local timezone
- Ensure streak calculations work correctly at midnight EST

