'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getParticipantsAsync, type Participant } from '@/lib/participants';
import { getDateStringEST, getYearEST, getMonthEST, formatDateEST, toEST } from '@/lib/dateUtils';
import Link from 'next/link';

interface ParticipantStats {
  participant: Participant;
  currentStreak: number;
  longestStreak: number;
  totalBadges: number;
  bronzeBadges: number;
  silverBadges: number;
  goldBadges: number;
  diamondBadges: number;
  legendaryBadges: number;
  monthlyDays: number;
  totalDays: number;
  consistencyPercent: number;
}

const BADGE_EMOJI: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
  legendary: '🏆',
};

export default function CompetitionPage() {
  const [stats, setStats] = useState<ParticipantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState('');
  const [daysInMonth, setDaysInMonth] = useState(0);
  const [daysSoFar, setDaysSoFar] = useState(0);

  useEffect(() => {
    const fetchCompetitionData = async () => {
      try {
        const participants = await getParticipantsAsync();
        const { data: entries } = await supabase
          .from('entries')
          .select('participant_id, created_at')
          .order('created_at', { ascending: false });

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        setCurrentMonth(`${monthNames[month]} ${year}`);
        
        const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
        setDaysInMonth(totalDaysInMonth);
        setDaysSoFar(now.getDate());

        const firstEntryDate = entries && entries.length > 0 
          ? new Date(entries[entries.length - 1].created_at) 
          : new Date();
        const totalPossibleDays = Math.ceil((now.getTime() - firstEntryDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const participantStats: ParticipantStats[] = [];

        for (const participant of participants) {
          const pid = String(participant.id);
          const participantEntries = (entries || []).filter(e => String(e.participant_id) === pid);
          
          const uniqueDates = new Set<string>();
          participantEntries.forEach(entry => {
            uniqueDates.add(getDateStringEST(entry.created_at));
          });

          const sortedDates = Array.from(uniqueDates).sort((a, b) => b.localeCompare(a));

          let currentStreak = 0;
          const todayStr = getDateStringEST(new Date());
          let checkDate = todayStr;
          
          while (true) {
            if (sortedDates.includes(checkDate)) {
              currentStreak++;
              const d = new Date(checkDate);
              d.setDate(d.getDate() - 1);
              checkDate = getDateStringEST(d);
            } else {
              break;
            }
          }

          let longestStreak = 0;
          let tempStreak = 0;
          const allSortedDates = Array.from(uniqueDates).sort();
          
          for (let i = 0; i < allSortedDates.length; i++) {
            if (i === 0) {
              tempStreak = 1;
            } else {
              const prev = new Date(allSortedDates[i - 1]);
              const curr = new Date(allSortedDates[i]);
              const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays === 1) {
                tempStreak++;
              } else {
                tempStreak = 1;
              }
            }
            longestStreak = Math.max(longestStreak, tempStreak);
          }

          const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
          const monthlyDays = Array.from(uniqueDates).filter(d => d.startsWith(currentMonthStr)).length;
          const totalDays = uniqueDates.size;
          const consistencyPercent = totalPossibleDays > 0 ? Math.round((totalDays / totalPossibleDays) * 100) : 0;

          let bronzeBadges = 0, silverBadges = 0, goldBadges = 0, diamondBadges = 0, legendaryBadges = 0;
          
          if (currentStreak >= 3) bronzeBadges = Math.floor(currentStreak / 3);
          if (currentStreak >= 7) silverBadges = Math.floor((currentStreak - 3) / 7) + 1;
          if (currentStreak >= 14) goldBadges = 1;
          if (currentStreak >= 30) diamondBadges = 1;
          if (currentStreak >= 100) legendaryBadges = 1;
          
          bronzeBadges = Math.max(1, Math.floor(totalDays / 10));
          silverBadges = Math.max(0, Math.floor(totalDays / 25));
          goldBadges = longestStreak >= 14 ? 1 : 0;
          diamondBadges = longestStreak >= 30 ? 1 : 0;
          legendaryBadges = longestStreak >= 100 ? 1 : 0;

          const totalBadges = bronzeBadges + silverBadges + goldBadges + diamondBadges + legendaryBadges;

          participantStats.push({
            participant,
            currentStreak,
            longestStreak,
            totalBadges,
            bronzeBadges,
            silverBadges,
            goldBadges,
            diamondBadges,
            legendaryBadges,
            monthlyDays,
            totalDays,
            consistencyPercent,
          });
        }

        setStats(participantStats);
      } catch (error) {
        console.error('Error fetching competition data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitionData();
  }, []);

  const streakChampion = stats.length > 0 
    ? [...stats].sort((a, b) => b.currentStreak - a.currentStreak)[0] 
    : null;
  
  const monthlyRaceLeader = stats.length > 0 
    ? [...stats].sort((a, b) => b.monthlyDays - a.monthlyDays)[0] 
    : null;

  const consistencyLeader = stats.length > 0 
    ? [...stats].sort((a, b) => b.consistencyPercent - a.consistencyPercent)[0] 
    : null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="text-center py-8">
          <p className="text-black dark:text-white text-sm sm:text-base font-bold">Loading competition data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 bg-white dark:bg-[#000000]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">🏆 Competition Portal</h1>
        <Link
          href="/calendar"
          className="text-blue-700 dark:text-[#3b82f6] hover:underline font-bold text-sm"
        >
          ← Back to Calendar
        </Link>
      </div>

      {/* Champion Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {/* Streak Champion */}
        <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 border-2 border-yellow-500 rounded-lg p-4 relative group">
          <div className="text-center">
            <div className="text-3xl mb-2">👑</div>
            <h3 className="font-bold text-yellow-900 dark:text-yellow-100 text-sm mb-1 flex items-center justify-center gap-1">
              STREAK CHAMPION
              <span className="cursor-help text-yellow-700 dark:text-yellow-300 text-xs" title="Click for details">ⓘ</span>
            </h3>
            {streakChampion && (
              <>
                <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">{streakChampion.participant.name}</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{streakChampion.currentStreak} days</p>
              </>
            )}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-yellow-900 text-yellow-100 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <p className="font-bold mb-1">How it&apos;s calculated:</p>
            <p>The participant with the longest <strong>current active streak</strong>. A streak counts consecutive days with at least one entry. Missing a day resets the streak to zero.</p>
          </div>
        </div>

        {/* Monthly Race Leader */}
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 border-2 border-blue-500 rounded-lg p-4 relative group">
          <div className="text-center">
            <div className="text-3xl mb-2">🏃</div>
            <h3 className="font-bold text-blue-900 dark:text-blue-100 text-sm mb-1 flex items-center justify-center gap-1">
              MONTHLY RACE LEADER
              <span className="cursor-help text-blue-700 dark:text-blue-300 text-xs" title="Click for details">ⓘ</span>
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">{currentMonth}</p>
            {monthlyRaceLeader && (
              <>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-200">{monthlyRaceLeader.participant.name}</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{monthlyRaceLeader.monthlyDays}/{daysSoFar} days</p>
              </>
            )}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-blue-900 text-blue-100 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <p className="font-bold mb-1">How it&apos;s calculated:</p>
            <p>The participant with the <strong>most participation days this month</strong>. Each unique day with at least one entry counts. Shown as days participated / days elapsed in the month.</p>
          </div>
        </div>

        {/* Consistency Award */}
        <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 border-2 border-green-500 rounded-lg p-4 relative group">
          <div className="text-center">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-bold text-green-900 dark:text-green-100 text-sm mb-1 flex items-center justify-center gap-1">
              CONSISTENCY AWARD
              <span className="cursor-help text-green-700 dark:text-green-300 text-xs" title="Click for details">ⓘ</span>
            </h3>
            {consistencyLeader && (
              <>
                <p className="text-lg font-bold text-green-800 dark:text-green-200">{consistencyLeader.participant.name}</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{consistencyLeader.consistencyPercent}%</p>
              </>
            )}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-green-900 text-green-100 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <p className="font-bold mb-1">How it&apos;s calculated:</p>
            <p>The participant with the <strong>highest participation percentage</strong> since their first entry. Calculated as: (total days participated ÷ total days since first entry) × 100.</p>
          </div>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Streak Leaderboard */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
          <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            🔥 Current Streak
          </h2>
          <div className="space-y-2">
            {[...stats].sort((a, b) => b.currentStreak - a.currentStreak).map((s, idx) => (
              <div key={s.participant.id} className={`flex items-center justify-between p-2 rounded ${idx === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg w-6">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
                  <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                </div>
                <span className="font-bold text-orange-600 dark:text-orange-400">{s.currentStreak} days</span>
              </div>
            ))}
          </div>
        </div>

        {/* Longest Streak Leaderboard */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
          <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            ⭐ Longest Streak Ever
          </h2>
          <div className="space-y-2">
            {[...stats].sort((a, b) => b.longestStreak - a.longestStreak).map((s, idx) => (
              <div key={s.participant.id} className={`flex items-center justify-between p-2 rounded ${idx === 0 ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg w-6">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
                  <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                </div>
                <span className="font-bold text-purple-600 dark:text-purple-400">{s.longestStreak} days</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Race */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
          <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            🏃 {currentMonth} Race
          </h2>
          <div className="space-y-2">
            {[...stats].sort((a, b) => b.monthlyDays - a.monthlyDays).map((s, idx) => (
              <div key={s.participant.id} className={`flex items-center justify-between p-2 rounded ${idx === 0 ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg w-6">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
                  <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-blue-600 dark:text-blue-400">{s.monthlyDays}/{daysSoFar}</span>
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${daysSoFar > 0 ? (s.monthlyDays / daysSoFar) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Badges Leaderboard */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
          <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            🏅 Total Badges
          </h2>
          <div className="space-y-2">
            {[...stats].sort((a, b) => b.totalBadges - a.totalBadges).map((s, idx) => (
              <div key={s.participant.id} className={`flex items-center justify-between p-2 rounded ${idx === 0 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg w-6">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
                  <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {s.legendaryBadges > 0 && <span title="Legendary">{BADGE_EMOJI.legendary}</span>}
                  {s.diamondBadges > 0 && <span title="Diamond">{BADGE_EMOJI.diamond}</span>}
                  {s.goldBadges > 0 && <span title="Gold">{BADGE_EMOJI.gold}</span>}
                  {s.silverBadges > 0 && <span title={`Silver x${s.silverBadges}`}>{BADGE_EMOJI.silver}{s.silverBadges > 1 && <sup className="text-xs">{s.silverBadges}</sup>}</span>}
                  {s.bronzeBadges > 0 && <span title={`Bronze x${s.bronzeBadges}`}>{BADGE_EMOJI.bronze}{s.bronzeBadges > 1 && <sup className="text-xs">{s.bronzeBadges}</sup>}</span>}
                  <span className="ml-2 font-bold text-amber-600 dark:text-amber-400">{s.totalBadges}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Consistency Stats */}
      <div className="mt-4 bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
        <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
          🎯 Consistency Rankings
        </h2>
        <div className="space-y-3">
          {[...stats].sort((a, b) => b.consistencyPercent - a.consistencyPercent).map((s, idx) => (
            <div key={s.participant.id} className={`p-3 rounded ${idx === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg w-6">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
                  <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                </div>
                <span className="font-bold text-green-600 dark:text-green-400">{s.consistencyPercent}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${s.consistencyPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{s.totalDays} total participation days</p>
            </div>
          ))}
        </div>
      </div>

      {/* Badge Legend */}
      <div className="mt-4 bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
        <h2 className="text-lg font-bold text-black dark:text-white mb-3">Badge Milestones</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-sm">
          <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
            <div className="text-2xl">{BADGE_EMOJI.bronze}</div>
            <p className="font-bold text-black dark:text-white">Bronze</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">3 day streak</p>
            <p className="text-xs text-green-600 dark:text-green-400">Repeatable!</p>
          </div>
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
            <div className="text-2xl">{BADGE_EMOJI.silver}</div>
            <p className="font-bold text-black dark:text-white">Silver</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">7 day streak</p>
            <p className="text-xs text-green-600 dark:text-green-400">Repeatable!</p>
          </div>
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <div className="text-2xl">{BADGE_EMOJI.gold}</div>
            <p className="font-bold text-black dark:text-white">Gold</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">14 day streak</p>
          </div>
          <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded">
            <div className="text-2xl">{BADGE_EMOJI.diamond}</div>
            <p className="font-bold text-black dark:text-white">Diamond</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">30 day streak</p>
          </div>
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
            <div className="text-2xl">{BADGE_EMOJI.legendary}</div>
            <p className="font-bold text-black dark:text-white">Legendary</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">100 day streak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
