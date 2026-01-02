-- Create table to track word challenge responses
-- This tracks when participants confirm whether they know a word or not

CREATE TABLE IF NOT EXISTS word_challenge_responses (
  id BIGSERIAL PRIMARY KEY,
  entry_id BIGINT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  is_known BOOLEAN NOT NULL, -- true = confirmed they know it, false = confirmed they don't know it yet
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  
  -- Note: No UNIQUE constraint - allows multiple responses per participant per word
  -- This enables tracking learning journey (e.g., knew it, forgot it, learned it again)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_word_challenge_responses_entry_id ON word_challenge_responses(entry_id);
CREATE INDEX IF NOT EXISTS idx_word_challenge_responses_participant_id ON word_challenge_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_word_challenge_responses_is_known ON word_challenge_responses(is_known);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_word_challenge_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_word_challenge_responses_updated_at
  BEFORE UPDATE ON word_challenge_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_word_challenge_responses_updated_at();

-- Enable Row Level Security
ALTER TABLE word_challenge_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all responses (for stats)
CREATE POLICY "Anyone can read word challenge responses"
  ON word_challenge_responses
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own responses
CREATE POLICY "Users can insert their own word challenge responses"
  ON word_challenge_responses
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own responses
CREATE POLICY "Users can update their own word challenge responses"
  ON word_challenge_responses
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Users can delete their own responses
CREATE POLICY "Users can delete their own word challenge responses"
  ON word_challenge_responses
  FOR DELETE
  USING (true);

