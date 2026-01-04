-- Migration: Add pronunciation_respelling and pronunciation_ipa fields to word_metadata table
-- This allows storing both dictionary-style respelling (MYND-fuhl) and IPA format (/ˈmaɪnd.fəl/)

ALTER TABLE word_metadata 
ADD COLUMN IF NOT EXISTS pronunciation_respelling TEXT,
ADD COLUMN IF NOT EXISTS pronunciation_ipa TEXT;

-- Migrate existing pronunciation data to pronunciation_ipa
-- (assuming current pronunciation field contains IPA format)
UPDATE word_metadata 
SET pronunciation_ipa = pronunciation 
WHERE pronunciation IS NOT NULL AND pronunciation_ipa IS NULL;

-- Note: pronunciation_respelling will need to be populated separately
-- as we don't have automatic conversion from IPA to respelling format yet

