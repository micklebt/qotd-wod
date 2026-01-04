'use client';

import { useEffect, useState } from 'react';
import { getCurrentParticipantId } from '@/lib/participants';
import type { ParticipantStreak, ParticipantBadge, BadgeType } from '@/lib/supabase';
import { getBadgeForStreak, getNextBadgeMilestone } from '@/lib/streaks';

const BADGE_MILESTONES: Record<BadgeType, number> = {
  bronze: 3,
  silver: 7,
  gold: 14,
  diamond: 30,
  legendary: 100,
};

interface StreakDisplayProps {
  participantId?: string;
  className?: string;
}

const BADGE_EMOJIS: Record<BadgeType, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
  legendary: '⭐',
};

const BADGE_NAMES: Record<BadgeType, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
  legendary: 'Legendary',
};

export default function StreakDisplay({ participantId: propParticipantId, className = '' }: StreakDisplayProps) {
  const [streak, setStreak] = useState<ParticipantStreak | null>(null);
  const [badges, setBadges] = useState<ParticipantBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStreakData = async () => {
      const pid = propParticipantId || getCurrentParticipantId();
      if (!pid) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/streak-data?participantId=${encodeURIComponent(pid)}`);
        if (!response.ok) {
          console.error('Failed to fetch streak data');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setStreak(data.streak);
        setBadges(data.badges || []);
      } catch (error) {
        console.error('Error fetching streak data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreakData();
  }, [propParticipantId]);

  const handleUseStreakSave = async () => {
    const pid = propParticipantId || getCurrentParticipantId();
    if (!pid || !streak || streak.streak_saves_available <= 0) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/use-streak-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: pid }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to use streak save');
        return;
      }

      setShowSaveConfirm(false);
      
      const refreshResponse = await fetch(`/api/streak-data?participantId=${encodeURIComponent(pid)}`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setStreak(data.streak);
      }
    } catch (error) {
      console.error('Error using streak save:', error);
      alert('Failed to use streak save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="text-sm text-black dark:text-[#b0b0b0]">Loading streak...</div>
      </div>
    );
  }

  if (!streak) {
    return null;
  }

  const currentStreak = streak.current_streak || 0;
  const currentBadge = getBadgeForStreak(currentStreak);
  const nextMilestone = getNextBadgeMilestone(currentStreak);
  const highestBadge = badges.length > 0 ? badges[0] : null;

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="text-lg sm:text-xl font-bold text-blue-700 dark:text-[#3b82f6]">
            {currentStreak} day{currentStreak !== 1 ? 's' : ''}
          </div>
          <span className="text-xs text-black dark:text-[#b0b0b0] font-bold">streak</span>
        </div>

        {currentBadge && (
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">{BADGE_EMOJIS[currentBadge]}</span>
            <span className="text-sm sm:text-base font-bold text-black dark:text-[#ffffff]">
              {BADGE_NAMES[currentBadge]}
            </span>
          </div>
        )}

        {highestBadge && highestBadge.badge_type !== currentBadge && (
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">{BADGE_EMOJIS[highestBadge.badge_type]}</span>
            <span className="text-xs sm:text-sm text-black dark:text-[#b0b0b0] font-bold">
              Highest: {BADGE_NAMES[highestBadge.badge_type]}
            </span>
          </div>
        )}

        {nextMilestone && (
          <div className="text-xs text-black dark:text-[#b0b0b0] font-bold">
            {nextMilestone - currentStreak} day{nextMilestone - currentStreak !== 1 ? 's' : ''} to {BADGE_MILESTONES.bronze === nextMilestone ? 'Bronze' : BADGE_MILESTONES.silver === nextMilestone ? 'Silver' : BADGE_MILESTONES.gold === nextMilestone ? 'Gold' : BADGE_MILESTONES.diamond === nextMilestone ? 'Diamond' : 'Legendary'}
          </div>
        )}

        {streak.streak_saves_available > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveConfirm(true)}
              className="text-xs sm:text-sm px-2 py-1 bg-green-600 dark:bg-green-500 text-white font-bold rounded hover:bg-green-700 dark:hover:bg-green-600 border border-green-700 dark:border-green-600"
              title="Use your streak save to protect your current streak if you miss a day"
            >
              🛡️ Streak Save Available
            </button>
          </div>
        )}
      </div>

      {showSaveConfirm && (
        <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-600 dark:border-yellow-500 rounded">
          <p className="text-sm font-bold text-black dark:text-white mb-2">
            Use your streak save now?
          </p>
          <p className="text-xs text-black dark:text-[#b0b0b0] mb-3">
            This will preserve your current streak of {currentStreak} day{currentStreak !== 1 ? 's' : ''}. You can only use one save per month.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleUseStreakSave}
              disabled={saving}
              className="text-xs px-3 py-1 bg-green-600 dark:bg-green-500 text-white font-bold rounded hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Using...' : 'Use Save'}
            </button>
            <button
              onClick={() => setShowSaveConfirm(false)}
              disabled={saving}
              className="text-xs px-3 py-1 bg-gray-600 dark:bg-gray-500 text-white font-bold rounded hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

