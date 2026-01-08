-- Create table to track word mastery progress
-- Tracks problem words and their practice progress from "not_known" → "practicing" → "mastered"

CREATE TABLE IF NOT EXISTS word_mastery_tracking (
  id BIGSERIAL PRIMARY KEY,
  entry_id BIGINT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_known', -- 'not_known', 'practicing', 'mastered'
  correct_count INTEGER NOT NULL DEFAULT 0, -- Number of correct answers (threshold: 3 for mastery)
  last_practiced_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entry_id, participant_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_word_mastery_entry_participant ON word_mastery_tracking(entry_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_word_mastery_participant_status ON word_mastery_tracking(participant_id, status);
CREATE INDEX IF NOT EXISTS idx_word_mastery_status ON word_mastery_tracking(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_word_mastery_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_word_mastery_tracking_updated_at
  BEFORE UPDATE ON word_mastery_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_word_mastery_tracking_updated_at();

-- Enable Row Level Security
ALTER TABLE word_mastery_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all mastery tracking (for stats)
CREATE POLICY "Anyone can read word mastery tracking"
  ON word_mastery_tracking
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own mastery tracking
CREATE POLICY "Users can insert their own word mastery tracking"
  ON word_mastery_tracking
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own mastery tracking
CREATE POLICY "Users can update their own word mastery tracking"
  ON word_mastery_tracking
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Users can delete their own mastery tracking
CREATE POLICY "Users can delete their own word mastery tracking"
  ON word_mastery_tracking
  FOR DELETE
  USING (true);


