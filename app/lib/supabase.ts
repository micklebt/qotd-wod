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
