import { supabase } from './supabase';
import { getDateStringEST } from './dateUtils';
import type { BadgeType } from './supabase';

export const BADGE_MILESTONES: Record<BadgeType, number> = {
  bronze: 3,
  silver: 7,
  gold: 14,
  diamond: 30,
  legendary: 100,
};

export const BADGE_ORDER: BadgeType[] = ['bronze', 'silver', 'gold', 'diamond', 'legendary'];

export function getBadgeForStreak(streak: number): BadgeType | null {
  if (streak >= BADGE_MILESTONES.legendary) return 'legendary';
  if (streak >= BADGE_MILESTONES.diamond) return 'diamond';
  if (streak >= BADGE_MILESTONES.gold) return 'gold';
  if (streak >= BADGE_MILESTONES.silver) return 'silver';
  if (streak >= BADGE_MILESTONES.bronze) return 'bronze';
  return null;
}

export function getNextBadgeMilestone(currentStreak: number): number | null {
  for (const badgeType of BADGE_ORDER) {
    if (currentStreak < BADGE_MILESTONES[badgeType]) {
      return BADGE_MILESTONES[badgeType];
    }
  }
  return null;
}

export async function calculateStreakFromEntries(participantId: string): Promise<number> {
  const { data: entries, error } = await supabase
    .from('entries')
    .select('created_at')
    .eq('participant_id', participantId)
    .order('created_at', { ascending: false });

  if (error || !entries || entries.length === 0) {
    return 0;
  }

  const uniqueDates = new Set<string>();
  entries.forEach(entry => {
    const dateStr = getDateStringEST(entry.created_at);
    uniqueDates.add(dateStr);
  });

  const sortedDates = Array.from(uniqueDates).sort((a, b) => b.localeCompare(a));
  
  let streak = 0;
  const today = new Date();
  let currentDate = new Date(today);

  while (true) {
    const dateStr = getDateStringEST(currentDate);
    
    if (sortedDates.includes(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export async function updateParticipantStreak(participantId: string): Promise<void> {
  const currentStreak = await calculateStreakFromEntries(participantId);
  const todayEST = getDateStringEST(new Date());

  const { data: existingStreak, error: fetchError } = await supabase
    .from('participant_streaks')
    .select('*')
    .eq('participant_id', participantId)
    .single();

  let longestStreak = currentStreak;

  if (!fetchError && existingStreak) {
    longestStreak = Math.max(existingStreak.longest_streak, currentStreak);
  }

  const { error: upsertError } = await supabase
    .from('participant_streaks')
    .upsert({
      participant_id: participantId,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_activity_date: todayEST,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'participant_id',
    });

  if (upsertError) {
    console.error('Error updating streak:', upsertError);
    throw upsertError;
  }

  await checkAndAwardBadges(participantId, currentStreak);
}

async function checkAndAwardBadges(participantId: string, currentStreak: number): Promise<void> {
  const currentBadge = getBadgeForStreak(currentStreak);
  if (!currentBadge) return;

  const { data: existingBadges, error: fetchError } = await supabase
    .from('participant_badges')
    .select('badge_type')
    .eq('participant_id', participantId);

  if (fetchError) {
    console.error('Error fetching badges:', fetchError);
    return;
  }

  const earnedBadgeTypes = new Set(existingBadges?.map(b => b.badge_type) || []);
  
  for (const badgeType of BADGE_ORDER) {
    if (currentStreak >= BADGE_MILESTONES[badgeType] && !earnedBadgeTypes.has(badgeType)) {
      const todayEST = getDateStringEST(new Date());
      
      const { error: insertError } = await supabase
        .from('participant_badges')
        .insert({
          participant_id: participantId,
          badge_type: badgeType,
          earned_date: todayEST,
          streak_length: currentStreak,
        });

      if (insertError) {
        console.error(`Error awarding ${badgeType} badge:`, insertError);
      }
    }
  }
}

