import { supabase, type Participant } from './supabase';

// Re-export Participant type for convenience
export type { Participant };

// Cache for participants to avoid repeated database calls
let participantsCache: Participant[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all participants from the database
 */
export async function fetchParticipants(): Promise<Participant[]> {
  // Check cache first
  const now = Date.now();
  if (participantsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return participantsCache;
  }

  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('name');

    if (error) {
      // Only log if it's not a "table doesn't exist" or "permission denied" error
      // PGRST116 = no rows returned, 42P01 = relation does not exist, PGRST301 = permission denied
      if (error.code !== 'PGRST116' && error.code !== '42P01' && error.code !== 'PGRST301') {
        console.error('Error fetching participants:', error);
      }
      // Return empty array if database fails
      return [];
    }

    // If no data or empty array, return empty array
    if (!data || data.length === 0) {
      return [];
    }

    // Update cache
    participantsCache = data || [];
    cacheTimestamp = now;
    return participantsCache;
  } catch (error) {
    // Only log unexpected errors
    if (error instanceof Error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
      console.error('Error fetching participants:', error);
    }
    // Return empty array if database fails
    return [];
  }
}

/**
 * Get participant name by ID (synchronous, uses cache)
 * Returns participant ID if not found in cache
 */
export function getParticipantName(userId: string): string {
  if (participantsCache) {
    const participant = participantsCache.find(p => p.id === userId);
    if (participant) return participant.name;
  }
  
  // Return ID if not found
  return userId;
}

/**
 * Get participant name by ID (async, fetches if needed)
 */
export async function getParticipantNameAsync(userId: string): Promise<string> {
  try {
    const participants = await fetchParticipants();
    const participant = participants.find(p => p.id === userId);
    return participant?.name || userId;
  } catch (error) {
    // Return ID if not found
    return userId;
  }
}

/**
 * Get participant by ID (synchronous, uses cache)
 */
export function getParticipantById(userId: string): Participant | undefined {
  if (participantsCache) {
    return participantsCache.find(p => p.id === userId);
  }
  
  // Return undefined if not found
  return undefined;
}

/**
 * Get participant by ID (async, fetches if needed)
 */
export async function getParticipantByIdAsync(userId: string): Promise<Participant | undefined> {
  try {
    const participants = await fetchParticipants();
    return participants.find(p => p.id === userId);
  } catch (error) {
    // Return undefined if not found
    return undefined;
  }
}

/**
 * Get all participants (synchronous, uses cache)
 */
export function getParticipants(): Participant[] {
  if (participantsCache) {
    return participantsCache;
  }
  
  // Return empty array if cache is empty
  return [];
}

/**
 * Get all participants (async, fetches if needed)
 */
export async function getParticipantsAsync(): Promise<Participant[]> {
  return await fetchParticipants();
}

/**
 * Preload participants cache (call this on app initialization)
 */
export async function preloadParticipants(): Promise<void> {
  await fetchParticipants();
}

/**
 * Clear the participants cache (useful after updates)
 */
export function clearParticipantsCache(): void {
  participantsCache = null;
  cacheTimestamp = 0;
}

/**
 * Get the currently selected participant ID from localStorage
 * Returns null if no participant is selected
 * This is a synchronous function for client-side use
 */
export function getCurrentParticipantId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const STORAGE_KEY = 'qotd-wod-selected-participant';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored || null;
}

