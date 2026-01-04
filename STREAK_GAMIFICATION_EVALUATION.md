# Streak Gamification Feature Evaluation

## Proposal Summary

**Streaks System:**
- Milestone rewards at: 3, 7, 14, 30, 100 days
- Badge types: Bronze, Silver, Gold, Diamond, Legendary
- Missed day → streak resets to zero
- 1 "streak save" per month (earned by high participation)

---

## Current Application Context

### Existing Infrastructure ✅

1. **Participation Tracking**: 
   - `entries` table tracks all word/quote submissions with `participant_id` and `created_at`
   - Calendar view already calculates `currentStreak` and `longestStreak` (see `app/calendar/page.tsx`)
   - Uses EST timezone for date calculations (`getDateStringEST()`)

2. **Database Structure**:
   - `participants` table exists with participant IDs
   - `entries` table links to participants
   - Row-level security policies in place

3. **User Interface**:
   - Calendar page displays streaks
   - Participant selection system with localStorage persistence

---

## Technical Feasibility Assessment

### ✅ STRENGTHS

1. **Foundation Already Exists**: 
   - Streak calculation logic already implemented in calendar page
   - Date normalization (EST) already handled
   - Participation tracking via entries table is robust

2. **Clear Participation Definition**:
   - Current definition: At least one entry (word or quote) per day = participation
   - Well-defined, easy to calculate

3. **Database-Friendly**:
   - Can leverage existing `entries` table
   - Simple schema additions needed

### ⚠️ CONSIDERATIONS & CHALLENGES

#### 1. Participation Definition
**Question**: What exactly counts as "participation" for a streak day?

**Current behavior**: Calendar counts any entry submission on that day (EST)

**Proposed options**:
- **Option A**: Any entry submission (word OR quote) = 1 day ✅ Simple, matches current logic
- **Option B**: Minimum activity threshold (e.g., 2 entries, or entry + word challenge response)
- **Option C**: Word challenge participation also counts

**Recommendation**: Start with Option A (any entry = participation day). This aligns with current calendar logic and is easiest to implement.

#### 2. Timezone Handling
**Current Status**: ✅ Already handled via `getDateStringEST()` utility

**Consideration**: Ensure streak saves and badge unlocks use the same EST normalization to avoid edge cases.

#### 3. Database Schema Requirements

**New Tables Needed**:

```sql
-- Streak tracking table
CREATE TABLE participant_streaks (
  id BIGSERIAL PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE NOT NULL, -- EST date of last participation
  streak_saves_available INTEGER NOT NULL DEFAULT 0,
  last_streak_save_month DATE, -- Month when last streak save was used (YYYY-MM-01 format)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id)
);

-- Badges earned by participants
CREATE TABLE participant_badges (
  id BIGSERIAL PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'diamond', 'legendary'
  earned_date DATE NOT NULL, -- EST date when badge was earned
  streak_length INTEGER NOT NULL, -- Streak length when badge was earned
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, badge_type) -- Prevent duplicate badges
);

-- Streak save usage history (optional, for auditing)
CREATE TABLE streak_save_usage (
  id BIGSERIAL PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  used_date DATE NOT NULL, -- EST date when save was used
  saved_streak_length INTEGER NOT NULL, -- Streak length that was saved
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes Needed**:
- `idx_participant_streaks_participant_id` on `participant_streaks(participant_id)`
- `idx_participant_badges_participant_id` on `participant_badges(participant_id)`

#### 4. Streak Save System - "High Participation" Definition

**Critical Question**: What constitutes "high participation" to earn a streak save?

**Proposed Options**:
- **Option A**: Submit entries on X days in the month (e.g., 20+ days)
- **Option B**: Submit X total entries in the month (e.g., 30+ entries)
- **Option C**: Combination (e.g., 20+ days AND 25+ entries)
- **Option D**: Percentile-based (e.g., top 50% of participants that month)

**Recommendation**: Start with Option A (20+ participation days per month). Simple, clear, encourages daily engagement.

**Implementation Notes**:
- Streak saves reset monthly (1 per month max)
- Earned at start of new month based on previous month's activity
- Can only use 1 save per month
- Save expires if not used by end of month (or rollover policy)

#### 5. Badge Unlock Logic

**Milestones**:
- 3 days → Bronze
- 7 days → Silver
- 14 days → Gold
- 30 days → Diamond
- 100 days → Legendary

**Considerations**:
- Badges are **earned**, not just displayed (should be stored permanently)
- User can earn multiple badges if streak reaches multiple milestones
- Should badges be re-earnable if streak resets and rebuilds? **Recommendation**: No - once earned, badge is permanent
- Display current highest badge + progress to next badge

#### 6. Streak Reset Logic

**Current Behavior** (from calendar page):
- Counts backwards from today
- Breaks on first missing day

**For Gamification**:
- Need to calculate streak on every entry submission
- Check if yesterday (EST) had participation
- If no participation yesterday AND no streak save available → reset to 0
- If no participation yesterday BUT streak save available → prompt user to use save, or auto-use

**Edge Cases**:
- Multiple entries on same day: Still counts as 1 day
- Entry submitted at 11:59 PM EST vs 12:01 AM EST: Must use EST date normalization
- Backdating entries: Should NOT count for streaks (only real-time submissions)

#### 7. UI/UX Considerations

**Display Locations**:
1. **Calendar Page**: 
   - Add badge display near streak stats
   - Show "Streak Save Available" indicator
   - Highlight badge milestones on calendar

2. **Home Page**:
   - Display current streak, badge, and progress to next milestone
   - Show streak save status

3. **Profile/Stats Page** (if exists):
   - Show all earned badges
   - Streak history
   - Streak save usage history

**Badge Visualization**:
- Icon/emoji representation for each badge type
- Progress bar to next milestone
- Celebration animation on badge unlock (optional)

**Streak Save UI**:
- Clear indicator when save is available
- Confirmation dialog when using save (it's valuable!)
- Show when save will expire/reset

#### 8. Performance Considerations

**Real-time Calculation**:
- On entry submission: Calculate current streak (check last N days until gap found)
- This could be expensive for long streaks (checking 100+ dates)

**Optimization Strategies**:
1. **Cached Streak Table**: Maintain `participant_streaks.current_streak` and update on each entry
2. **Background Job**: Periodic recalculation to catch edge cases
3. **Event-Driven**: Update streak table only when entries are created/deleted

**Recommendation**: Use cached streak table + update on entry creation. Recalculate on entry deletion if needed.

---

## Implementation Complexity

### Phase 1: Core Streak System (Medium Complexity)
- Database schema creation
- Streak calculation function
- Update streak on entry submission
- Display current streak in UI

**Estimated Effort**: 4-6 hours

### Phase 2: Badge System (Low-Medium Complexity)
- Badge unlock logic
- Badge storage and display
- UI components for badge visualization

**Estimated Effort**: 3-4 hours

### Phase 3: Streak Save System (Medium Complexity)
- High participation calculation
- Monthly streak save allocation
- Streak save usage logic
- UI for streak save management

**Estimated Effort**: 4-5 hours

### Phase 4: Polish & Edge Cases (Low Complexity)
- Timezone edge cases
- Multiple entries same day handling
- Badge celebration animations
- Documentation

**Estimated Effort**: 2-3 hours

**Total Estimated Effort**: 13-18 hours

---

## Recommendations

### ✅ PROCEED WITH IMPLEMENTATION

**Reasons**:
1. Foundation already exists (streak calculation logic)
2. Clear value proposition (increased retention)
3. Aligns with existing participation model
4. Reasonable complexity for the benefit

### 📋 IMPLEMENTATION PRIORITY

1. **Start with Phase 1 + Phase 2** (Core streaks + badges)
   - Immediate value
   - Lower complexity
   - Can validate user engagement

2. **Add Phase 3 later** (Streak saves)
   - More complex logic
   - Can gather data on participation patterns first
   - Allows refinement of "high participation" definition

### 🎯 KEY DECISIONS NEEDED

Before implementation, clarify:

1. **Participation Definition**: Any entry = participation day? (Recommend: Yes)
2. **High Participation Threshold**: Days per month? Total entries? (Recommend: 20+ days/month)
3. **Badge Re-earning**: Can users re-earn badges after reset? (Recommend: No - permanent)
4. **Streak Save Expiration**: Do unused saves rollover or expire? (Recommend: Expire monthly)
5. **Backdating**: Should manually backdated entries count? (Recommend: No - only real-time)

### 🔧 TECHNICAL RECOMMENDATIONS

1. **Use Cached Streak Table**: Don't recalculate from scratch every time
2. **EST Timezone**: Continue using existing `getDateStringEST()` utility
3. **Row-Level Security**: Add RLS policies for streak tables
4. **Database Functions**: Consider PostgreSQL function for streak calculation (performance)
5. **Migration Strategy**: Create migration script for schema changes

---

## Potential Issues & Mitigations

### Issue 1: Multiple Entries Same Day
**Problem**: User submits 5 entries on Monday, none on Tuesday
**Solution**: Count as 1 participation day (already handled in calendar logic)

### Issue 2: Timezone Edge Cases
**Problem**: Entry at 11:59 PM EST vs 12:01 AM EST next day
**Solution**: Use `getDateStringEST()` consistently (already implemented)

### Issue 3: Long Streak Calculation Performance
**Problem**: Checking 100+ dates on each submission
**Solution**: Cached streak table + incremental updates

### Issue 4: Badge Display Clutter
**Problem**: Showing all 5 badges might be overwhelming
**Solution**: Show only highest badge + progress to next, with "View All" option

### Issue 5: Streak Save Confusion
**Problem**: Users don't understand how to earn/use saves
**Solution**: Clear UI indicators, tooltips, documentation

---

## Success Metrics

After implementation, track:
- Average streak length increase
- Badge unlock frequency
- Streak save usage rate
- Retention rate improvement
- Daily active users

---

## Conclusion

✅ **Recommendation: PROCEED with implementation**

The streaks feature is highly feasible given the existing infrastructure. The main complexity lies in the streak save system, which can be implemented in a second phase after validating core streak functionality.

**Next Steps**:
1. Confirm participation definition and high participation threshold
2. Create database migration script
3. Implement Phase 1 (Core streaks) + Phase 2 (Badges)
4. Test with real data
5. Gather user feedback
6. Implement Phase 3 (Streak saves) based on learnings

