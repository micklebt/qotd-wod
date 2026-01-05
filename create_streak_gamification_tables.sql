-- Create tables for streak gamification system
-- This migration creates tables for tracking streaks, badges, and streak saves

-- Table to track participant streaks
CREATE TABLE IF NOT EXISTS participant_streaks (
  id BIGSERIAL PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE, -- EST date of last participation (nullable for new participants)
  streak_saves_available INTEGER NOT NULL DEFAULT 0,
  last_streak_save_month DATE, -- Month when last streak save was used (YYYY-MM-01 format, nullable)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id)
);

-- Table to track badges earned by participants
CREATE TABLE IF NOT EXISTS participant_badges (
  id BIGSERIAL PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('bronze', 'silver', 'gold', 'diamond', 'legendary')),
  earned_date DATE NOT NULL, -- EST date when badge was earned
  streak_length INTEGER NOT NULL, -- Streak length when badge was earned
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, badge_type) -- Prevent duplicate badges
);

-- Table to track streak save usage history (for auditing and display)
CREATE TABLE IF NOT EXISTS streak_save_usage (
  id BIGSERIAL PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  used_date DATE NOT NULL, -- EST date when save was used
  saved_streak_length INTEGER NOT NULL, -- Streak length that was saved
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_participant_streaks_participant_id ON participant_streaks(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_streaks_last_activity_date ON participant_streaks(last_activity_date);
CREATE INDEX IF NOT EXISTS idx_participant_badges_participant_id ON participant_badges(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_badges_badge_type ON participant_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_streak_save_usage_participant_id ON streak_save_usage(participant_id);
CREATE INDEX IF NOT EXISTS idx_streak_save_usage_used_date ON streak_save_usage(used_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_participant_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_participant_streaks_updated_at
  BEFORE UPDATE ON participant_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_streaks_updated_at();

-- Enable Row Level Security
ALTER TABLE participant_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_save_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for participant_streaks
-- Policy: Anyone can read streak data (for display purposes)
CREATE POLICY "Anyone can read participant streaks"
  ON participant_streaks
  FOR SELECT
  USING (true);

-- Policy: System can insert/update streaks (handled server-side)
CREATE POLICY "Anyone can insert participant streaks"
  ON participant_streaks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update participant streaks"
  ON participant_streaks
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for participant_badges
-- Policy: Anyone can read badges (for display purposes)
CREATE POLICY "Anyone can read participant badges"
  ON participant_badges
  FOR SELECT
  USING (true);

-- Policy: System can insert badges (handled server-side)
CREATE POLICY "Anyone can insert participant badges"
  ON participant_badges
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for streak_save_usage
-- Policy: Anyone can read streak save usage (for display purposes)
CREATE POLICY "Anyone can read streak save usage"
  ON streak_save_usage
  FOR SELECT
  USING (true);

-- Policy: System can insert streak save usage (handled server-side)
CREATE POLICY "Anyone can insert streak save usage"
  ON streak_save_usage
  FOR INSERT
  WITH CHECK (true);

-- Initialize streaks for existing participants (optional - can be done via application code)
-- This ensures all existing participants have a streak record
INSERT INTO participant_streaks (participant_id, current_streak, longest_streak)
SELECT id, 0, 0
FROM participants
WHERE id NOT IN (SELECT participant_id FROM participant_streaks)
ON CONFLICT (participant_id) DO NOTHING;

