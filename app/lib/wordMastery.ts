import { supabase } from './supabase';
import type { WordMasteryTracking } from './supabase';
import type { WordMasteryStatus } from './supabase';
import { getCurrentParticipantId } from './participants';

export type { WordMasteryStatus };

const MASTERY_THRESHOLD = 3; // Number of correct answers required for mastery

/**
 * Mark a word as a problem word (status: 'not_known')
 */
export async function markAsProblemWord(entryId: number, participantId?: string): Promise<WordMasteryTracking | null> {
  const pid = participantId || getCurrentParticipantId();
  if (!pid) {
    throw new Error('Participant ID is required');
  }

  const { data, error } = await supabase
    .from('word_mastery_tracking')
    .upsert({
      entry_id: entryId,
      participant_id: pid,
      status: 'not_known',
      correct_count: 0,
      last_practiced_at: null,
      mastered_at: null,
    }, {
      onConflict: 'entry_id,participant_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error marking word as problem:', error);
    throw error;
  }

  return data;
}

/**
 * Start practicing a word (transition from 'not_known' to 'practicing')
 */
export async function startPractice(entryId: number, participantId?: string): Promise<WordMasteryTracking | null> {
  const pid = participantId || getCurrentParticipantId();
  if (!pid) {
    throw new Error('Participant ID is required');
  }

  // Check if tracking exists, create if not
  const { data: existing } = await supabase
    .from('word_mastery_tracking')
    .select('*')
    .eq('entry_id', entryId)
    .eq('participant_id', pid)
    .single();

  if (!existing) {
    // Create new tracking record
    return await markAsProblemWord(entryId, pid);
  }

  // Update status to 'practicing' if it's 'not_known'
  if (existing.status === 'not_known') {
    const { data, error } = await supabase
      .from('word_mastery_tracking')
      .update({
        status: 'practicing',
        last_practiced_at: new Date().toISOString(),
      })
      .eq('entry_id', entryId)
      .eq('participant_id', pid)
      .select()
      .single();

    if (error) {
      console.error('Error starting practice:', error);
      throw error;
    }

    return data;
  }

  return existing;
}

/**
 * Record a practice answer and update mastery status
 */
export async function recordPracticeAnswer(
  entryId: number,
  isCorrect: boolean,
  participantId?: string
): Promise<WordMasteryTracking | null> {
  const pid = participantId || getCurrentParticipantId();
  if (!pid) {
    throw new Error('Participant ID is required');
  }

  // Get current tracking
  const { data: existing, error: fetchError } = await supabase
    .from('word_mastery_tracking')
    .select('*')
    .eq('entry_id', entryId)
    .eq('participant_id', pid)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching mastery tracking:', fetchError);
    throw fetchError;
  }

  let newCorrectCount = 0;
  let newStatus: WordMasteryStatus = 'not_known';
  let masteredAt: string | null = null;

  if (existing) {
    newCorrectCount = isCorrect ? existing.correct_count + 1 : existing.correct_count;
    newStatus = existing.status;

    // Transition from 'not_known' to 'practicing' on first attempt
    if (existing.status === 'not_known') {
      newStatus = 'practicing';
    }

    // Transition to 'mastered' when threshold is reached
    if (newCorrectCount >= MASTERY_THRESHOLD && existing.status !== 'mastered') {
      newStatus = 'mastered';
      masteredAt = new Date().toISOString();
    }
  } else {
    // Create new record if it doesn't exist
    if (isCorrect) {
      newCorrectCount = 1;
      newStatus = 'practicing';
    } else {
      newStatus = 'not_known';
    }
  }

  const updateData: Partial<WordMasteryTracking> = {
    status: newStatus,
    correct_count: newCorrectCount,
    last_practiced_at: new Date().toISOString(),
    ...(masteredAt && { mastered_at: masteredAt }),
  };

  const { data, error } = await supabase
    .from('word_mastery_tracking')
    .upsert({
      entry_id: entryId,
      participant_id: pid,
      ...updateData,
    }, {
      onConflict: 'entry_id,participant_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording practice answer:', error);
    throw error;
  }

  return data;
}

/**
 * Get all problem words for a participant
 */
export async function getProblemWords(participantId?: string): Promise<WordMasteryTracking[]> {
  const pid = participantId || getCurrentParticipantId();
  if (!pid) {
    return [];
  }

  const { data, error } = await supabase
    .from('word_mastery_tracking')
    .select('*')
    .eq('participant_id', pid)
    .in('status', ['not_known', 'practicing'])
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching problem words:', error);
    return [];
  }

  return data || [];
}

/**
 * Get mastery status for a specific word and participant
 */
export async function getMasteryStatus(
  entryId: number,
  participantId?: string
): Promise<WordMasteryTracking | null> {
  const pid = participantId || getCurrentParticipantId();
  if (!pid) {
    return null;
  }

  const { data, error } = await supabase
    .from('word_mastery_tracking')
    .select('*')
    .eq('entry_id', entryId)
    .eq('participant_id', pid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return null;
    }
    console.error('Error fetching mastery status:', error);
    return null;
  }

  return data;
}

/**
 * Get practice progress for a word (correct_count and status)
 */
export async function getPracticeProgress(
  entryId: number,
  participantId?: string
): Promise<{ correctCount: number; status: WordMasteryStatus; progress: string } | null> {
  const tracking = await getMasteryStatus(entryId, participantId);
  
  if (!tracking) {
    return null;
  }

  const progress = tracking.status === 'mastered' 
    ? 'Mastered!' 
    : `${tracking.correct_count}/${MASTERY_THRESHOLD} correct`;

  return {
    correctCount: tracking.correct_count,
    status: tracking.status,
    progress,
  };
}

/**
 * Remove a word from problem words (delete tracking)
 */
export async function removeFromProblemWords(
  entryId: number,
  participantId?: string
): Promise<boolean> {
  const pid = participantId || getCurrentParticipantId();
  if (!pid) {
    throw new Error('Participant ID is required');
  }

  const { error } = await supabase
    .from('word_mastery_tracking')
    .delete()
    .eq('entry_id', entryId)
    .eq('participant_id', pid);

  if (error) {
    console.error('Error removing from problem words:', error);
    throw error;
  }

  return true;
}

/**
 * Mark a word as confidently known (immediately set to 'mastered')
 */
export async function markAsConfident(
  entryId: number,
  participantId?: string
): Promise<WordMasteryTracking | null> {
  const pid = participantId || getCurrentParticipantId();
  if (!pid) {
    throw new Error('Participant ID is required');
  }

  const { data, error } = await supabase
    .from('word_mastery_tracking')
    .upsert({
      entry_id: entryId,
      participant_id: pid,
      status: 'mastered',
      correct_count: MASTERY_THRESHOLD,
      last_practiced_at: new Date().toISOString(),
      mastered_at: new Date().toISOString(),
    }, {
      onConflict: 'entry_id,participant_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error marking word as confident:', error);
    throw error;
  }

  return data;
}

