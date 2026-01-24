# CLAUDE.md - AI Assistant Guide for QOTD-WOD

This document provides essential context for AI assistants working on this codebase.

## Project Overview

**Quote & Word of the Day (QOTD-WOD)** is a full-stack learning application for tracking and enriching daily words and quotes with definitions, pronunciations, etymology, examples, and contextual information. It includes gamification features like streaks, badges, and word mastery tracking.

**Version**: 0.1.4

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| External APIs | OpenAI (GPT-4o-mini), Free Dictionary, Wordnik, Wiktionary, Quotable |
| SMS | Twilio |

## Project Structure

```
app/
├── api/                    # Next.js API routes
│   ├── etymology/          # Wiktionary etymology lookup
│   ├── examples/           # Example sentence generation (Wordnik)
│   ├── quote-ai/           # OpenAI quote lookup
│   ├── quote-search/       # Multi-source quote search
│   ├── streak-data/        # Fetch streaks & badges
│   ├── update-streak/      # Streak calculation
│   └── use-streak-save/    # Streak save mechanism
├── components/             # React components
│   ├── EntryForm.tsx       # Main form for entries (~55KB, largest component)
│   ├── WordChallenge.tsx   # Word challenge modal
│   ├── WordPractice.tsx    # Word mastery tracking
│   ├── StreakDisplay.tsx   # Streak & badge display
│   ├── EntryCard.tsx       # Entry display card
│   └── Navigation.tsx      # Site navigation
├── contexts/
│   └── ThemeContext.tsx    # Theme management
├── lib/                    # Utilities & business logic
│   ├── supabase.ts         # Supabase client & TypeScript interfaces
│   ├── dateUtils.ts        # EST timezone utilities (CRITICAL)
│   ├── streaks.ts          # Streak calculation & badges
│   ├── dictionary.ts       # Word lookup & enrichment
│   ├── quoteLookup.ts      # Quote enrichment
│   └── participants.ts     # Participant management
├── entries/
│   ├── page.tsx            # All entries with filtering
│   ├── [id]/page.tsx       # Entry detail & edit
│   └── new/page.tsx        # Create new entry
├── calendar/page.tsx       # Participation calendar
├── competition/page.tsx    # Leaderboard
└── page.tsx                # Home page
```

## Critical Rules

### 1. EST/EDT Timezone - MANDATORY

**All dates and times MUST use EST/EDT timezone (America/New_York).**

```typescript
// CORRECT - Use utility functions from @/lib/dateUtils
import { getCurrentTimestampEST, getDateStringEST, formatDateEST, getESTDateRange } from '@/lib/dateUtils';

const timestamp = getCurrentTimestampEST();           // For database timestamps
const dateStr = getDateStringEST(entry.created_at);   // For date comparisons (YYYY-MM-DD)
const display = formatDateEST(entry.created_at);      // For UI display
const range = getESTDateRange('2026-01-24');          // For database date range queries

// WRONG - Never use these directly
new Date().toISOString();                    // Wrong timezone
entry.created_at.split('T')[0];              // Wrong timezone
new Date(entry.created_at).toLocaleDateString(); // User's local timezone, not EST
```

**Key date utility functions:**
- `getCurrentTimestampEST()` - Get current timestamp for database
- `getDateStringEST(date)` - Get YYYY-MM-DD in EST
- `formatDateEST(date)` - Format for display
- `getESTDateRange(dateStr)` - Get UTC range for an EST date
- `getESTMonthRange(year, month)` - Get UTC range for a month

**Critical Note:** Supabase returns timestamps WITHOUT 'Z' suffix. The dateUtils functions handle this normalization automatically.

### 2. Database Conventions

**Tables:**
- `participants` - User information
- `entries` - Words and quotes (type: 'word' | 'quote')
- `word_metadata` - Definition, pronunciation, etymology (linked to entries)
- `quote_metadata` - Author, source (linked to entries)
- `participant_streaks` - Streak tracking
- `participant_badges` - Achievement badges
- `streak_save_usage` - Streak save history
- `word_challenge_responses` - Challenge response tracking
- `word_mastery_tracking` - Word practice progress

**Key interfaces (from `app/lib/supabase.ts`):**
```typescript
interface Entry {
  id: number;
  type: "word" | "quote";
  content: string;
  participant_id: string;
  created_at: string;
  word_metadata?: { definition, pronunciation, pronunciation_ipa, etymology, part_of_speech }[];
  quote_metadata?: { author, source }[];
}

interface ParticipantStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  streak_saves_available: number;
}

type BadgeType = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';
type WordMasteryStatus = 'not_known' | 'practicing' | 'mastered';
```

### 3. Badge Milestones

```typescript
bronze: 3 days    // Repeatable
silver: 7 days    // Repeatable
gold: 14 days     // One-time
diamond: 30 days  // One-time
legendary: 100 days // One-time
```

### 4. Component Patterns

- Client components use `'use client'` directive
- Data fetching done in useEffect with loading states
- Participant selection persisted via localStorage
- Auto-expanding textareas for form fields
- Conditional field visibility (fields appear after lookup)

### 5. API Route Pattern

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Implementation
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error message' }, { status: 500 });
  }
}
```

## Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
OPENAI_API_KEY=your_openai_api_key           # AI quote lookup
WORDNIK_API_KEY=your_wordnik_api_key         # Better example sentences
TWILIO_ACCOUNT_SID=your_twilio_sid           # SMS notifications
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Common Tasks

### Adding a new entry type field

1. Update interface in `app/lib/supabase.ts`
2. Add database column via SQL migration
3. Update `EntryForm.tsx` to include field
4. Update `entries/[id]/page.tsx` for edit view
5. Update any display components (EntryCard, etc.)

### Adding a new API route

1. Create route file: `app/api/route-name/route.ts`
2. Export HTTP method functions (GET, POST, etc.)
3. Use proper error handling with try/catch
4. Return NextResponse.json()

### Working with streaks

```typescript
import { updateParticipantStreak, calculateStreakFromEntries } from '@/lib/streaks';

// After creating an entry
await updateParticipantStreak(participantId);

// Get current streak
const streak = await calculateStreakFromEntries(participantId);
```

### Word lookup integration

```typescript
import { lookupWord } from '@/lib/dictionary';

const result = await lookupWord(word);
// Returns: { definition, partOfSpeech, pronunciation, pronunciationIPA,
//           pronunciationRespelling, etymology, examples, audioUrl, sourceUrl, suggestions }
```

### Quote lookup integration

```typescript
import { enrichQuote } from '@/lib/quoteLookup';

const result = await enrichQuote(quote);
// Returns: { author, source, context, background, interpretation, significance, sourceType }
```

## Key Files to Understand

| File | Purpose |
|------|---------|
| `app/lib/dateUtils.ts` | EST timezone utilities - read this first |
| `app/lib/supabase.ts` | Database client & all TypeScript interfaces |
| `app/lib/streaks.ts` | Streak calculation & badge awarding logic |
| `app/components/EntryForm.tsx` | Main form component with lookup functionality |
| `EST_TIMEZONE_RULE.md` | Comprehensive timezone documentation |
| `FEATURES.md` | Detailed feature development history |

## Testing Considerations

- Always test date functionality across DST transitions (March, November)
- Verify dates display correctly regardless of user's local timezone
- Test streak calculations at midnight EST boundary
- Ensure participant selection persists across page refreshes

## Deployment

Deployed on Vercel. See `DEPLOYMENT.md` for detailed instructions.

**Post-deployment checklist:**
1. Verify environment variables are set
2. Run any pending SQL migrations in Supabase
3. Test EST timezone handling in production

## Code Style

- TypeScript with strict typing
- Tailwind CSS for styling (prefer CSS variables for theming)
- No explicit labels on form fields (use placeholders instead)
- Auto-expanding textareas for multi-line content
- Loading states for all async operations
- Error boundaries and graceful fallbacks

## External API Fallback Chain

**Word lookup:** Free Dictionary API -> Singular form fallback -> Spelling suggestions

**Quote lookup:** OpenAI -> Quotable API -> Hardcoded handlers -> Generic response

**Etymology:** Dictionary API -> Wiktionary fallback

**Examples:** Wordnik API -> Free Dictionary -> Generated examples
