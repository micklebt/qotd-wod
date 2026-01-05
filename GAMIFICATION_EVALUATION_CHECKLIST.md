# Gamification System Evaluation Checklist

## Pre-Deployment Checklist

### 1. Database Migrations ✅
- [ ] Run `create_streak_gamification_tables.sql` in Supabase SQL Editor
  - This creates:
    - `participant_streaks` table
    - `participant_badges` table
    - `streak_save_usage` table
    - All necessary indexes and RLS policies
- [ ] Verify migration ran successfully (check Supabase Table Editor)
- [ ] Check that existing participants have streak records initialized

### 2. Verify Database Schema
In Supabase, check that these tables exist:
- [ ] `participant_streaks` - Has columns: `current_streak`, `longest_streak`, `streak_saves_available`, `last_streak_save_month`, `last_activity_date`
- [ ] `participant_badges` - Has columns: `badge_type`, `earned_date`, `streak_length`
- [ ] `streak_save_usage` - Has columns: `used_date`, `saved_streak_length`

---

## Visual/UI Checks

### 3. Home Page (`/`)
- [ ] Navigate to home page
- [ ] Look for **StreakDisplay component** below the header
- [ ] Verify it shows:
  - Current streak count (e.g., "5 days streak")
  - Badge emoji and name if streak qualifies (🥉 Bronze, 🥈 Silver, 🥇 Gold, 💎 Diamond, ⭐ Legendary)
  - Progress to next badge (e.g., "2 days to Silver")
  - Streak save button (🛡️) if available

### 4. Calendar Page (`/calendar`)
- [ ] Navigate to calendar page
- [ ] Select a specific participant (not "All Participants")
- [ ] Verify **StreakDisplay component** appears showing their personal streak and badges
- [ ] Select "All Participants" and verify it shows aggregate stats (Current Streak, Longest Streak)

### 5. Streak Save UI
- [ ] If you have a streak save available, verify "🛡️ Streak Save Available" button appears
- [ ] Click the button and verify confirmation dialog appears
- [ ] Verify it shows:
  - Current streak length
  - Warning about one save per month limit
  - "Use Save" and "Cancel" buttons

---

## Functional Testing

### 6. Streak Tracking

#### Test: Create Entry and Check Streak
- [ ] Select a participant
- [ ] Create a new word entry
- [ ] After submission, refresh the home page
- [ ] Verify streak increased by 1 (if previous day had entry) OR stays at current count

#### Test: Daily Participation
- [ ] Note your current streak count
- [ ] Create an entry today (if not already done)
- [ ] Verify streak updated
- [ ] Wait until tomorrow (or manually check with different dates)
- [ ] Create another entry on the next day
- [ ] Verify streak continues (increases)

#### Test: Streak Break Detection
- [ ] Note your current streak
- [ ] Skip a day (don't create any entries)
- [ ] On the next day, create an entry
- [ ] Verify streak resets to 1 (or 0, depending on implementation)

### 7. Badge System

#### Test: Badge Unlocking
- [ ] Check current streak count
- [ ] Create entries until streak reaches 3 days
- [ ] Verify 🥉 **Bronze** badge appears
- [ ] Continue to 7 days
- [ ] Verify 🥈 **Silver** badge appears (Bronze should still show as highest)
- [ ] Continue to 14 days
- [ ] Verify 🥇 **Gold** badge appears
- [ ] Continue to 30 days
- [ ] Verify 💎 **Diamond** badge appears
- [ ] Continue to 100 days
- [ ] Verify ⭐ **Legendary** badge appears

#### Test: Badge Persistence
- [ ] After earning a badge, note which badge you have
- [ ] Break your streak (skip a day)
- [ ] Verify badge still shows (badges are permanent)
- [ ] Verify it shows as "Highest: [Badge Name]" if current streak is below that badge's threshold

#### Test: Badge Display Logic
- [ ] With a streak of 5 days:
  - Should show current badge (Bronze) prominently
  - Should show progress: "2 days to Silver"
- [ ] With a streak of 100+ days:
  - Should show Legendary badge
  - Should NOT show "progress to next" (already at max)

### 8. Streak Save System

#### Test: Monthly Allocation
**Note:** Streak saves are allocated at month start based on previous month's participation.

- [ ] Check current month's participation (calendar view)
- [ ] Count how many unique days you have entries in this month
- [ ] If you have 20+ participation days in the previous month:
  - Verify you have 1 streak save available
- [ ] If you have less than 20 participation days:
  - Verify you have 0 streak saves available

#### Test: Using Streak Save
- [ ] Ensure you have a streak save available (🛡️ button visible)
- [ ] Note your current streak count
- [ ] Click "🛡️ Streak Save Available"
- [ ] Click "Use Save" in confirmation dialog
- [ ] Verify save is used successfully
- [ ] Verify "🛡️ Streak Save Available" button disappears
- [ ] Check database: `streak_save_usage` table should have a new record
- [ ] Check database: `participant_streaks.streak_saves_available` should be 0

#### Test: Save Limits
- [ ] Try to use a streak save when you have 0 available
- [ ] Verify button doesn't appear OR shows disabled state
- [ ] Use a save, then try to use another in the same month
- [ ] Verify you cannot use another save in the same month

#### Test: Monthly Reset
- [ ] Use your streak save in current month
- [ ] Wait until next month (or simulate)
- [ ] Verify new save is allocated based on previous month's participation
- [ ] If you had 20+ participation days last month, verify new save appears

---

## API/Backend Testing

### 9. API Routes

#### Test: `/api/update-streak`
- [ ] Create a new entry
- [ ] Verify API is called automatically after entry creation
- [ ] Check browser Network tab: Should see POST to `/api/update-streak`
- [ ] Verify response is successful (200 OK)

#### Test: `/api/streak-data`
- [ ] Navigate to home page
- [ ] Check browser Network tab: Should see GET to `/api/streak-data?participantId=...`
- [ ] Verify response includes:
  - `streak` object with `current_streak`, `longest_streak`, `streak_saves_available`
  - `badges` array with earned badges

#### Test: `/api/use-streak-save`
- [ ] Click "Use Save" button
- [ ] Check browser Network tab: Should see POST to `/api/use-streak-save`
- [ ] Verify response is successful (200 OK)
- [ ] Verify streak data refreshes after use

### 10. Database Verification

#### Check `participant_streaks` Table
In Supabase, verify:
- [ ] Your participant has a record
- [ ] `current_streak` matches displayed streak
- [ ] `longest_streak` is correct (should be max of all streaks ever)
- [ ] `last_activity_date` is today's date (EST) when you created an entry
- [ ] `streak_saves_available` is 0 or 1
- [ ] `last_streak_save_month` is current month if save was allocated

#### Check `participant_badges` Table
In Supabase, verify:
- [ ] You have records for badges you've earned
- [ ] `badge_type` values are correct: 'bronze', 'silver', 'gold', 'diamond', 'legendary'
- [ ] `earned_date` is the date you reached that milestone
- [ ] `streak_length` matches the streak when badge was earned
- [ ] No duplicate badges (UNIQUE constraint on participant_id + badge_type)

#### Check `streak_save_usage` Table
In Supabase, verify:
- [ ] Record exists if you used a save
- [ ] `used_date` is the date you used it (EST)
- [ ] `saved_streak_length` is the streak length that was saved

---

## Edge Cases & Error Handling

### 11. Edge Cases

#### Test: First Entry Ever
- [ ] As a new participant (or clear their streak data)
- [ ] Create first entry
- [ ] Verify streak starts at 1
- [ ] Verify no badges yet (need 3 days minimum)

#### Test: Multiple Entries Same Day
- [ ] Create 3 entries on the same day
- [ ] Verify streak only counts as 1 day (not 3)
- [ ] Verify `participant_streaks.last_activity_date` is correct

#### Test: Timezone Handling

- [ ] Create entry late at night (near midnight EST)
- [ ] Verify it counts for correct day in EST timezone
- [ ] Check that `getDateStringEST()` is used consistently

#### Test: Missing Yesterday Entry
- [ ] Have an active streak (e.g., 5 days)
- [ ] Skip a day (no entries)
- [ ] Create entry the day after
- [ ] Verify streak resets (doesn't continue from 5)

#### Test: Longest Streak Tracking
- [ ] Break a streak
- [ ] Start a new streak
- [ ] Verify `longest_streak` still shows your previous best (doesn't reset)

### 12. Error Handling

#### Test: Missing Participant
- [ ] Try to view streak without selecting a participant
- [ ] Verify StreakDisplay doesn't crash (gracefully handles null)

#### Test: Database Errors
- [ ] Simulate database unavailability
- [ ] Verify error messages are user-friendly
- [ ] Verify app doesn't crash

#### Test: API Failures
- [ ] Disconnect from internet
- [ ] Try to create an entry
- [ ] Verify streak update failure doesn't prevent entry creation
- [ ] Verify helpful error message

---

## Performance & Data Consistency

### 13. Performance Checks

#### Test: Streak Calculation
- [ ] With a very long streak (100+ days)
- [ ] Verify streak calculation doesn't cause lag
- [ ] Check browser console for any performance warnings

#### Test: Badge Lookup
- [ ] With many earned badges
- [ ] Verify badge display loads quickly
- [ ] Verify badges are sorted correctly (newest first)

### 14. Data Consistency

#### Test: Streak Synchronization
- [ ] Create entry
- [ ] Immediately check database
- [ ] Verify streak updated within a few seconds
- [ ] Refresh page, verify UI matches database

#### Test: Badge Consistency
- [ ] Earn a badge
- [ ] Verify badge appears in UI
- [ ] Check database immediately
- [ ] Verify badge record exists
- [ ] Refresh page, verify badge persists

---

## Integration Points

### 15. Entry Creation Integration

#### Test: Word Entry
- [ ] Create a word entry
- [ ] Verify streak updates after submission
- [ ] Verify redirect to entries page works
- [ ] Return to home page, verify streak increased

#### Test: Quote Entry
- [ ] Create a quote entry
- [ ] Verify streak updates (same as word)
- [ ] Verify both types count toward participation

### 16. Calendar Integration

#### Test: Calendar Streak Display
- [ ] View calendar for specific participant
- [ ] Verify StreakDisplay shows their personal streak
- [ ] Switch to "All Participants"
- [ ] Verify aggregate stats (Current/Longest Streak) show
- [ ] Verify calendar highlights days with entries correctly

---

## User Experience

### 17. Visual Feedback

#### Test: Loading States
- [ ] Navigate to home page
- [ ] Verify "Loading streak..." appears briefly
- [ ] Verify smooth transition to actual streak data

#### Test: Streak Save Confirmation
- [ ] Click "Use Save"
- [ ] Verify confirmation dialog is clear
- [ ] Verify it shows current streak length
- [ ] Verify cancel works
- [ ] Verify save works on confirmation

#### Test: Badge Celebrations
- [ ] Earn a new badge
- [ ] Verify badge appears immediately (or after refresh)
- [ ] Verify emoji displays correctly

### 18. Responsive Design

#### Test: Mobile View
- [ ] Resize browser to mobile width
- [ ] Verify StreakDisplay is readable
- [ ] Verify badges display correctly
- [ ] Verify streak save button is clickable

#### Test: Dark Mode
- [ ] Toggle dark mode
- [ ] Verify streak display is readable
- [ ] Verify badge emojis are visible
- [ ] Verify colors have good contrast

---

## Documentation

### 19. Verify Documentation

- [ ] Check `STREAK_GAMIFICATION_EVALUATION.md` exists
- [ ] Check `MIGRATION_REQUIRED.md` exists (if applicable)
- [ ] Check `FEATURES.md` updated with gamification features
- [ ] Verify README mentions gamification system

---

## Summary Testing Scenarios

### Quick Smoke Test (5 minutes)
1. ✅ Create a word entry
2. ✅ Check home page shows streak
3. ✅ Create entries for 3 days (or check existing streak)
4. ✅ Verify Bronze badge appears at 3 days
5. ✅ Check calendar page shows streak for individual participant

### Comprehensive Test (30 minutes)
1. ✅ Complete all functional tests above
2. ✅ Test badge unlocking (3, 7, 14, 30 days)
3. ✅ Test streak save allocation and usage
4. ✅ Verify database consistency
5. ✅ Test error handling
6. ✅ Verify edge cases

---

## Success Criteria

### ✅ System is Working If:
- [ ] Streaks update correctly after entry creation
- [ ] Badges unlock at correct milestones (3, 7, 14, 30, 100 days)
- [ ] Streak saves allocate monthly based on participation
- [ ] UI displays all information correctly
- [ ] Database records match UI display
- [ ] No crashes or error messages
- [ ] Performance is acceptable

### ⚠️ Issues to Report:
- Streak not updating after entry creation
- Badges not unlocking at milestones
- Streak saves not allocating
- UI not displaying streak/badges
- Database inconsistency
- Performance issues
- Error messages or crashes

---

**Current Version: 0.4.5**

