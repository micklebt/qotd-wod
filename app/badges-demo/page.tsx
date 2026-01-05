'use client';

import { useEffect, useState } from 'react';
import { getCurrentParticipantId } from '@/lib/participants';
import type { ParticipantBadge, BadgeType } from '@/lib/supabase';
import { BADGE_MILESTONES, BADGE_ORDER } from '@/lib/streaks';

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

const BADGE_DESCRIPTIONS: Record<BadgeType, string> = {
  bronze: '3 Day Streak - You\'re getting started!',
  silver: '7 Day Streak - Building momentum!',
  gold: '14 Day Streak - Excellent consistency!',
  diamond: '30 Day Streak - Outstanding dedication!',
  legendary: '100 Day Streak - Legendary achievement!',
};

const BADGE_COLORS: Record<BadgeType, { bg: string; border: string; text: string }> = {
  bronze: {
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    border: 'border-orange-400 dark:border-orange-600',
    text: 'text-orange-800 dark:text-orange-300',
  },
  silver: {
    bg: 'bg-gray-100 dark:bg-gray-800/20',
    border: 'border-gray-400 dark:border-gray-500',
    text: 'text-gray-800 dark:text-gray-300',
  },
  gold: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    border: 'border-yellow-500 dark:border-yellow-600',
    text: 'text-yellow-800 dark:text-yellow-300',
  },
  diamond: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/20',
    border: 'border-cyan-400 dark:border-cyan-500',
    text: 'text-cyan-800 dark:text-cyan-300',
  },
  legendary: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    border: 'border-purple-500 dark:border-purple-600',
    text: 'text-purple-800 dark:text-purple-300',
  },
};

export default function BadgesDemo() {
  const [earnedBadges, setEarnedBadges] = useState<ParticipantBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      const participantId = getCurrentParticipantId();
      if (!participantId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/streak-data?participantId=${encodeURIComponent(participantId)}`);
        if (!response.ok) {
          console.error('Failed to fetch badge data');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setEarnedBadges(data.badges || []);
      } catch (error) {
        console.error('Error fetching badge data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, []);

  const earnedBadgeTypes = new Set(earnedBadges.map(b => b.badge_type));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 bg-white dark:bg-[#000000]">
      <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-black dark:text-[#ffffff]">
        Badge Showcase
      </h1>

      {loading ? (
        <div className="text-black dark:text-[#ffffff] font-bold">Loading badges...</div>
      ) : (
        <>
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-300 dark:border-blue-700 rounded">
            <p className="text-sm text-blue-900 dark:text-blue-300 font-semibold">
              Badges are awarded automatically when you reach streak milestones. Earn badges by maintaining your daily entry streak!
            </p>
          </div>

          <div className="space-y-4">
            {BADGE_ORDER.map((badgeType) => {
              const earned = earnedBadgeTypes.has(badgeType);
              const badgeData = earnedBadges.find(b => b.badge_type === badgeType);
              const colors = BADGE_COLORS[badgeType];

              return (
                <div
                  key={badgeType}
                  className={`border-2 rounded-lg p-4 sm:p-6 ${colors.bg} ${colors.border} ${
                    earned ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-5xl sm:text-6xl flex-shrink-0">
                      {BADGE_EMOJIS[badgeType]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className={`text-xl sm:text-2xl font-bold ${colors.text}`}>
                          {BADGE_NAMES[badgeType]} Badge
                        </h2>
                        {earned && (
                          <span className="px-2 py-1 text-xs font-bold bg-green-500 text-white rounded">
                            EARNED
                          </span>
                        )}
                      </div>
                      <p className={`text-sm sm:text-base mb-2 font-semibold ${colors.text}`}>
                        {BADGE_DESCRIPTIONS[badgeType]}
                      </p>
                      <p className={`text-xs sm:text-sm ${colors.text} opacity-75`}>
                        Required: {BADGE_MILESTONES[badgeType]} day streak
                      </p>
                      {badgeData && (
                        <div className="mt-3 pt-3 border-t border-current opacity-50">
                          <p className={`text-xs ${colors.text}`}>
                            Earned on: {formatDate(badgeData.earned_date)}
                          </p>
                          <p className={`text-xs ${colors.text}`}>
                            Streak length: {badgeData.streak_length} days
                          </p>
                        </div>
                      )}
                      {!earned && (
                        <div className="mt-3 pt-3 border-t border-current opacity-30">
                          <p className={`text-xs ${colors.text}`}>
                            Not yet earned - keep your streak going!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-300 dark:border-gray-700 rounded">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
              <strong>Total Badges Earned:</strong> {earnedBadges.length} / {BADGE_ORDER.length}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

