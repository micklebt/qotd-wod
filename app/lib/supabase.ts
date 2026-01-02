import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Entry {
  id: number;
  type: "word" | "quote";
  content: string;
  submitted_by_user_id: string;
  created_at: string;
  updated_at: string;
  word_metadata?: {
    id: number;
    entry_id: number;
    definition: string;
    pronunciation: string;
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
