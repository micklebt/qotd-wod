import { supabase } from './supabase';
import { getDateStringEST, getCurrentMonthStartEST, getPreviousMonthStartEST, getPreviousDayEST, getESTMonthRange, getCurrentTimestampEST } from './dateUtils';
import type { BadgeType } from './supabase';

const HIGH_PARTICIPATION_DAYS_THRESHOLD = 20;

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
  // Get today's date in EST
  const todayESTStr = getDateStringEST(new Date());
  let currentDateStr = todayESTStr;

  while (true) {
    if (sortedDates.includes(currentDateStr)) {
      streak++;
      // Get previous day's EST date string
      currentDateStr = getPreviousDayEST(currentDateStr);
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
      updated_at: getCurrentTimestampEST(),
    }, {
      onConflict: 'participant_id',
    });

  if (upsertError) {
    console.error('Error updating streak:', upsertError);
    throw upsertError;
  }

  await checkAndAwardBadges(participantId, currentStreak);
  await checkAndAllocateStreakSave(participantId);
}

export async function calculateParticipationDaysInMonth(participantId: string, year: number, month: number): Promise<number> {
  const monthRange = getESTMonthRange(year, month);

  const { data: entries, error } = await supabase
    .from('entries')
    .select('created_at')
    .eq('participant_id', participantId)
    .gte('created_at', monthRange.start)
    .lte('created_at', monthRange.end);

  if (error || !entries || entries.length === 0) {
    return 0;
  }

  const uniqueDates = new Set<string>();
  entries.forEach(entry => {
    const dateStr = getDateStringEST(entry.created_at);
    const [entryYear, entryMonth] = dateStr.split('-').map(Number);
    if (entryYear === year && entryMonth === month + 1) {
      uniqueDates.add(dateStr);
    }
  });

  return uniqueDates.size;
}

export async function checkAndAllocateStreakSave(participantId: string): Promise<void> {
  const currentMonth = getCurrentMonthStartEST();
  const previousMonth = getPreviousMonthStartEST();

  const { data: streakData, error: fetchError } = await supabase
    .from('participant_streaks')
    .select('streak_saves_available, last_streak_save_month')
    .eq('participant_id', participantId)
    .single();

  if (fetchError) {
    console.error('Error fetching streak data for save allocation:', fetchError);
    return;
  }

  const lastAllocatedMonth = streakData?.last_streak_save_month;
  
  if (lastAllocatedMonth === currentMonth) {
    return;
  }

  if (!lastAllocatedMonth) {
    await supabase
      .from('participant_streaks')
      .update({
        last_streak_save_month: currentMonth,
      })
      .eq('participant_id', participantId);
    return;
  }

  const [prevYear, prevMonth] = previousMonth.split('-').map(Number);
  const participationDays = await calculateParticipationDaysInMonth(participantId, prevYear, prevMonth - 1);

  let newSavesAvailable = 0;

  if (participationDays >= HIGH_PARTICIPATION_DAYS_THRESHOLD) {
    newSavesAvailable = 1;
  }

  const { error: updateError } = await supabase
    .from('participant_streaks')
    .update({
      streak_saves_available: newSavesAvailable,
      last_streak_save_month: currentMonth,
    })
    .eq('participant_id', participantId);

  if (updateError) {
    console.error('Error updating streak saves:', updateError);
  }
}

export async function canUseStreakSave(participantId: string): Promise<boolean> {
  const { data: streakData, error } = await supabase
    .from('participant_streaks')
    .select('streak_saves_available, last_streak_save_month')
    .eq('participant_id', participantId)
    .single();

  if (error || !streakData) {
    return false;
  }

  const currentMonth = getCurrentMonthStartEST();
  const lastUsedMonth = streakData.last_streak_save_month;

  if (streakData.streak_saves_available <= 0) {
    return false;
  }

  if (lastUsedMonth && lastUsedMonth !== currentMonth) {
    return true;
  }

  if (!lastUsedMonth) {
    return true;
  }

  return false;
}

export async function useStreakSave(participantId: string): Promise<boolean> {
  const canUse = await canUseStreakSave(participantId);
  
  if (!canUse) {
    return false;
  }

  const { data: streakData, error: fetchError } = await supabase
    .from('participant_streaks')
    .select('current_streak')
    .eq('participant_id', participantId)
    .single();

  if (fetchError || !streakData) {
    console.error('Error fetching streak data for save usage:', fetchError);
    return false;
  }

  const savedStreakLength = streakData.current_streak;
  const currentMonth = getCurrentMonthStartEST();
  const todayEST = getDateStringEST(new Date());

  const { error: updateError } = await supabase
    .from('participant_streaks')
    .update({
      streak_saves_available: 0,
      last_streak_save_month: currentMonth,
    })
    .eq('participant_id', participantId);

  if (updateError) {
    console.error('Error updating streak after using save:', updateError);
    return false;
  }

  const { error: insertError } = await supabase
    .from('streak_save_usage')
    .insert({
      participant_id: participantId,
      used_date: todayEST,
      saved_streak_length: savedStreakLength,
    });

  if (insertError) {
    console.error('Error recording streak save usage:', insertError);
  }

  return true;
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

