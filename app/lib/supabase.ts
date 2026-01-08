import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Participant {
  id: string;
  name: string;
  mobile_phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: number;
  type: "word" | "quote";
  content: string;
  participant_id: string;
  created_at: string;
  updated_at: string;
  word_metadata?: {
    id: number;
    entry_id: number;
    definition: string;
    pronunciation: string; // Legacy field - kept for backward compatibility
    pronunciation_respelling?: string | null; // Dictionary-style respelling (e.g., MYND-fuhl)
    pronunciation_ipa?: string | null; // IPA format (e.g., /ˈmaɪnd.fəl/)
    part_of_speech: string;
    etymology: string;
  }[];
  quote_metadata?: {
    id: number;
    entry_id: number;
    author: string;
    source: string;
  }[];
}

export type BadgeType = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';

export interface ParticipantStreak {
  id: number;
  participant_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_saves_available: number;
  last_streak_save_month: string | null;
  updated_at: string;
}

export interface ParticipantBadge {
  id: number;
  participant_id: string;
  badge_type: BadgeType;
  earned_date: string;
  streak_length: number;
  created_at: string;
}

export interface StreakSaveUsage {
  id: number;
  participant_id: string;
  used_date: string;
  saved_streak_length: number;
  created_at: string;
}

export type WordMasteryStatus = 'not_known' | 'practicing' | 'mastered';

export interface WordMasteryTracking {
  id: number;
  entry_id: number;
  participant_id: string;
  status: WordMasteryStatus;
  correct_count: number;
  last_practiced_at: string | null;
  mastered_at: string | null;
  created_at: string;
  updated_at: string;
}