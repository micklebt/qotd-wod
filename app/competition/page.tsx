'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getParticipantsAsync, type Participant } from '@/lib/participants';
import { getDateStringEST } from '@/lib/dateUtils';
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
  weeklyDays: number;
  rolling7Days: number;
  todayEntries: number;
  lastWeekDays: number;
  comebackScore: number;
}

const BADGE_EMOJI: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
  legendary: '🏆',
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getLastWeekStart(date: Date): Date {
  const weekStart = getWeekStart(date);
  weekStart.setDate(weekStart.getDate() - 7);
  return weekStart;
}

function getRanking(sorted: ParticipantStats[], getValue: (s: ParticipantStats) => number): Map<string, number> {
  const rankings = new Map<string, number>();
  let currentRank = 1;
  let lastValue: number | null = null;
  let sameRankCount = 0;

  sorted.forEach((s, idx) => {
    const value = getValue(s);
    if (lastValue !== null && value < lastValue) {
      currentRank += sameRankCount;
      sameRankCount = 1;
    } else if (lastValue !== null && value === lastValue) {
      sameRankCount++;
    } else {
      sameRankCount = 1;
    }
    rankings.set(s.participant.id, currentRank);
    lastValue = value;
  });

  return rankings;
}

function getRankEmoji(rank: number, isTied: boolean): string {
  if (rank === 1) return isTied ? '🥇' : '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}.`;
}

function getLeaders<T>(items: T[], getValue: (item: T) => number): T[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a));
  const maxValue = getValue(sorted[0]);
  return sorted.filter(item => getValue(item) === maxValue);
}

export default function CompetitionPage() {
  const [stats, setStats] = useState<ParticipantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState('');
  const [daysSoFar, setDaysSoFar] = useState(0);
  const [currentWeekLabel, setCurrentWeekLabel] = useState('');

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
        setDaysSoFar(now.getDate());

        const weekStart = getWeekStart(now);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        setCurrentWeekLabel(`${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`);

        const lastWeekStart = getLastWeekStart(now);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

        const todayStr = getDateStringEST(now);
        const rolling7DaysAgo = new Date(now);
        rolling7DaysAgo.setDate(rolling7DaysAgo.getDate() - 6);

        const firstEntryDate = entries && entries.length > 0 
          ? new Date(entries[entries.length - 1].created_at) 
          : new Date();
        const totalPossibleDays = Math.ceil((now.getTime() - firstEntryDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const participantStats: ParticipantStats[] = [];

        for (const participant of participants) {
          const pid = String(participant.id);
          const participantEntries = (entries || []).filter(e => String(e.participant_id) === pid);
          
          const uniqueDates = new Set<string>();
          const entryCountByDate = new Map<string, number>();
          
          participantEntries.forEach(entry => {
            const dateStr = getDateStringEST(entry.created_at);
            uniqueDates.add(dateStr);
            entryCountByDate.set(dateStr, (entryCountByDate.get(dateStr) || 0) + 1);
          });

          const sortedDates = Array.from(uniqueDates).sort((a, b) => b.localeCompare(a));

          let currentStreak = 0;
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

          const weeklyDays = Array.from(uniqueDates).filter(d => {
            const date = new Date(d);
            return date >= weekStart && date <= now;
          }).length;

          const rolling7Days = Array.from(uniqueDates).filter(d => {
            const date = new Date(d);
            return date >= rolling7DaysAgo && date <= now;
          }).length;

          const todayEntries = entryCountByDate.get(todayStr) || 0;

          const lastWeekDays = Array.from(uniqueDates).filter(d => {
            const date = new Date(d);
            return date >= lastWeekStart && date <= lastWeekEnd;
          }).length;

          const comebackScore = weeklyDays - lastWeekDays;

          let bronzeBadges = Math.max(1, Math.floor(totalDays / 10));
          let silverBadges = Math.max(0, Math.floor(totalDays / 25));
          let goldBadges = longestStreak >= 14 ? 1 : 0;
          let diamondBadges = longestStreak >= 30 ? 1 : 0;
          let legendaryBadges = longestStreak >= 100 ? 1 : 0;
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
            weeklyDays,
            rolling7Days,
            todayEntries,
            lastWeekDays,
            comebackScore,
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

  const weeklyLeaders = getLeaders(stats, s => s.weeklyDays);
  const rolling7Leaders = getLeaders(stats, s => s.rolling7Days);
  const todayLeaders = getLeaders(stats, s => s.todayEntries);
  const comebackLeaders = getLeaders(stats, s => s.comebackScore);
  const streakLeaders = getLeaders(stats, s => s.currentStreak);
  const consistencyLeaders = getLeaders(stats, s => s.consistencyPercent);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="text-center py-8">
          <p className="text-black dark:text-white text-sm sm:text-base font-bold">Loading competition data...</p>
        </div>
      </div>
    );
  }

  const renderLeaderNames = (leaders: ParticipantStats[]) => {
    if (leaders.length === 0) return <span className="text-gray-500">No data</span>;
    if (leaders.length === 1) return <span>{leaders[0].participant.name}</span>;
    return (
      <span className="flex flex-col items-center">
        {leaders.map((l, i) => (
          <span key={l.participant.id}>{l.participant.name}{i < leaders.length - 1 ? '' : ''}</span>
        ))}
        <span className="text-xs opacity-75">(TIE)</span>
      </span>
    );
  };

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

      {/* Dynamic Champion Cards - These reset and allow new leaders */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-black dark:text-white mb-2 flex items-center gap-2">
          ⚡ Dynamic Leaders <span className="text-xs font-normal text-gray-500">(These reset - anyone can take the lead!)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* This Week's Leader */}
          <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 border-2 border-purple-500 rounded-lg p-3 relative group">
            <div className="text-center">
              <div className="text-2xl mb-1">📅</div>
              <h3 className="font-bold text-purple-900 dark:text-purple-100 text-xs mb-0.5 flex items-center justify-center gap-1">
                THIS WEEK
                <span className="cursor-help text-purple-700 dark:text-purple-300 text-xs">ⓘ</span>
              </h3>
              <p className="text-[10px] text-purple-700 dark:text-purple-300 mb-1">{currentWeekLabel}</p>
              <div className="text-sm font-bold text-purple-800 dark:text-purple-200">
                {renderLeaderNames(weeklyLeaders)}
              </div>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                {weeklyLeaders[0]?.weeklyDays || 0} days
              </p>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2 bg-purple-900 text-purple-100 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <p className="font-bold mb-1">Resets every Monday!</p>
              <p>Most participation days this week (Mon-Sun). Everyone starts fresh each week.</p>
            </div>
          </div>

          {/* Rolling 7-Day Leader */}
          <div className="bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900 dark:to-cyan-800 border-2 border-cyan-500 rounded-lg p-3 relative group">
            <div className="text-center">
              <div className="text-2xl mb-1">🔄</div>
              <h3 className="font-bold text-cyan-900 dark:text-cyan-100 text-xs mb-0.5 flex items-center justify-center gap-1">
                ROLLING 7-DAY
                <span className="cursor-help text-cyan-700 dark:text-cyan-300 text-xs">ⓘ</span>
              </h3>
              <p className="text-[10px] text-cyan-700 dark:text-cyan-300 mb-1">Last 7 days</p>
              <div className="text-sm font-bold text-cyan-800 dark:text-cyan-200">
                {renderLeaderNames(rolling7Leaders)}
              </div>
              <p className="text-lg font-bold text-cyan-900 dark:text-cyan-100">
                {rolling7Leaders[0]?.rolling7Days || 0}/7 days
              </p>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2 bg-cyan-900 text-cyan-100 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <p className="font-bold mb-1">Rolling window!</p>
              <p>Participation in the last 7 days. Old days drop off daily, so leaders can change anytime.</p>
            </div>
          </div>

          {/* Today's Champion */}
          <div className="bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 border-2 border-orange-500 rounded-lg p-3 relative group">
            <div className="text-center">
              <div className="text-2xl mb-1">☀️</div>
              <h3 className="font-bold text-orange-900 dark:text-orange-100 text-xs mb-0.5 flex items-center justify-center gap-1">
                TODAY&apos;S LEADER
                <span className="cursor-help text-orange-700 dark:text-orange-300 text-xs">ⓘ</span>
              </h3>
              <p className="text-[10px] text-orange-700 dark:text-orange-300 mb-1">Resets daily</p>
              <div className="text-sm font-bold text-orange-800 dark:text-orange-200">
                {renderLeaderNames(todayLeaders)}
              </div>
              <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {todayLeaders[0]?.todayEntries || 0} entries
              </p>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2 bg-orange-900 text-orange-100 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <p className="font-bold mb-1">Daily competition!</p>
              <p>Most entries (words + quotes) submitted today. Resets at midnight - compete fresh every day!</p>
            </div>
          </div>

          {/* Comeback King */}
          <div className="bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900 dark:to-rose-800 border-2 border-rose-500 rounded-lg p-3 relative group">
            <div className="text-center">
              <div className="text-2xl mb-1">🚀</div>
              <h3 className="font-bold text-rose-900 dark:text-rose-100 text-xs mb-0.5 flex items-center justify-center gap-1">
                COMEBACK KING
                <span className="cursor-help text-rose-700 dark:text-rose-300 text-xs">ⓘ</span>
              </h3>
              <p className="text-[10px] text-rose-700 dark:text-rose-300 mb-1">vs Last Week</p>
              <div className="text-sm font-bold text-rose-800 dark:text-rose-200">
                {renderLeaderNames(comebackLeaders)}
              </div>
              <p className="text-lg font-bold text-rose-900 dark:text-rose-100">
                {comebackLeaders[0]?.comebackScore > 0 ? '+' : ''}{comebackLeaders[0]?.comebackScore || 0} days
              </p>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2 bg-rose-900 text-rose-100 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <p className="font-bold mb-1">Best improvement!</p>
              <p>Biggest increase in participation days compared to last week. Rewards those catching up!</p>
            </div>
          </div>
        </div>
      </div>

      {/* All-Time Champion Cards */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-black dark:text-white mb-2 flex items-center gap-2">
          👑 All-Time Leaders
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Streak Champion */}
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 border-2 border-yellow-500 rounded-lg p-4 relative group">
            <div className="text-center">
              <div className="text-3xl mb-2">👑</div>
              <h3 className="font-bold text-yellow-900 dark:text-yellow-100 text-sm mb-1 flex items-center justify-center gap-1">
                STREAK CHAMPION
                <span className="cursor-help text-yellow-700 dark:text-yellow-300 text-xs">ⓘ</span>
              </h3>
              <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                {renderLeaderNames(streakLeaders)}
              </div>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{streakLeaders[0]?.currentStreak || 0} days</p>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-yellow-900 text-yellow-100 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <p className="font-bold mb-1">How it&apos;s calculated:</p>
              <p>Longest <strong>current active streak</strong>. Missing a day resets to zero - that&apos;s how new leaders emerge!</p>
            </div>
          </div>

          {/* Monthly Race Leader */}
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 border-2 border-blue-500 rounded-lg p-4 relative group">
            <div className="text-center">
              <div className="text-3xl mb-2">🏃</div>
              <h3 className="font-bold text-blue-900 dark:text-blue-100 text-sm mb-1 flex items-center justify-center gap-1">
                MONTHLY RACE
                <span className="cursor-help text-blue-700 dark:text-blue-300 text-xs">ⓘ</span>
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">{currentMonth}</p>
              <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                {renderLeaderNames(getLeaders(stats, s => s.monthlyDays))}
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {getLeaders(stats, s => s.monthlyDays)[0]?.monthlyDays || 0}/{daysSoFar} days
              </p>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-blue-900 text-blue-100 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <p className="font-bold mb-1">Resets each month!</p>
              <p>Most participation days this month. New month = fresh start for everyone.</p>
            </div>
          </div>

          {/* Consistency Award */}
          <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 border-2 border-green-500 rounded-lg p-4 relative group">
            <div className="text-center">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-bold text-green-900 dark:text-green-100 text-sm mb-1 flex items-center justify-center gap-1">
                CONSISTENCY
                <span className="cursor-help text-green-700 dark:text-green-300 text-xs">ⓘ</span>
              </h3>
              <div className="text-lg font-bold text-green-800 dark:text-green-200">
                {renderLeaderNames(consistencyLeaders)}
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{consistencyLeaders[0]?.consistencyPercent || 0}%</p>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-green-900 text-green-100 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <p className="font-bold mb-1">Can always change!</p>
              <p>Participation percentage since first entry. New participants can catch up by being more consistent!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* This Week Leaderboard */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
          <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            📅 This Week ({currentWeekLabel})
          </h2>
          <div className="space-y-2">
            {(() => {
              const sorted = [...stats].sort((a, b) => b.weeklyDays - a.weeklyDays);
              const rankings = getRanking(sorted, s => s.weeklyDays);
              return sorted.map((s) => {
                const rank = rankings.get(s.participant.id) || 0;
                const isTied = sorted.filter(x => x.weeklyDays === s.weeklyDays).length > 1;
                return (
                  <div key={s.participant.id} className={`flex items-center justify-between p-2 rounded ${rank === 1 ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg w-8">{getRankEmoji(rank, isTied)}</span>
                      <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                      {isTied && rank <= 3 && <span className="text-xs text-gray-500">(TIE)</span>}
                    </div>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{s.weeklyDays} days</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Rolling 7-Day Leaderboard */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
          <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            🔄 Rolling 7-Day
          </h2>
          <div className="space-y-2">
            {(() => {
              const sorted = [...stats].sort((a, b) => b.rolling7Days - a.rolling7Days);
              const rankings = getRanking(sorted, s => s.rolling7Days);
              return sorted.map((s) => {
                const rank = rankings.get(s.participant.id) || 0;
                const isTied = sorted.filter(x => x.rolling7Days === s.rolling7Days).length > 1;
                return (
                  <div key={s.participant.id} className={`flex items-center justify-between p-2 rounded ${rank === 1 ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-300 dark:border-cyan-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg w-8">{getRankEmoji(rank, isTied)}</span>
                      <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                      {isTied && rank <= 3 && <span className="text-xs text-gray-500">(TIE)</span>}
                    </div>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">{s.rolling7Days}/7</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Today's Entries */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
          <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            ☀️ Today&apos;s Entries
          </h2>
          <div className="space-y-2">
            {(() => {
              const sorted = [...stats].sort((a, b) => b.todayEntries - a.todayEntries);
              const rankings = getRanking(sorted, s => s.todayEntries);
              return sorted.map((s) => {
                const rank = rankings.get(s.participant.id) || 0;
                const isTied = sorted.filter(x => x.todayEntries === s.todayEntries).length > 1;
                return (
                  <div key={s.participant.id} className={`flex items-center justify-between p-2 rounded ${rank === 1 && s.todayEntries > 0 ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg w-8">{getRankEmoji(rank, isTied)}</span>
                      <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                      {isTied && rank <= 3 && s.todayEntries > 0 && <span className="text-xs text-gray-500">(TIE)</span>}
                    </div>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{s.todayEntries} entries</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Comeback Score */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
          <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            🚀 Comeback Score
          </h2>
          <div className="space-y-2">
            {(() => {
              const sorted = [...stats].sort((a, b) => b.comebackScore - a.comebackScore);
              const rankings = getRanking(sorted, s => s.comebackScore);
              return sorted.map((s) => {
                const rank = rankings.get(s.participant.id) || 0;
                const isTied = sorted.filter(x => x.comebackScore === s.comebackScore).length > 1;
                return (
                  <div key={s.participant.id} className={`flex items-center justify-between p-2 rounded ${rank === 1 ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg w-8">{getRankEmoji(rank, isTied)}</span>
                      <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                      {isTied && rank <= 3 && <span className="text-xs text-gray-500">(TIE)</span>}
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${s.comebackScore > 0 ? 'text-green-600 dark:text-green-400' : s.comebackScore < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {s.comebackScore > 0 ? '+' : ''}{s.comebackScore}
                      </span>
                      <p className="text-xs text-gray-500">This: {s.weeklyDays} | Last: {s.lastWeekDays}</p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Current Streak & Longest Streak */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
          <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            🔥 Current Streak
          </h2>
          <div className="space-y-2">
            {(() => {
              const sorted = [...stats].sort((a, b) => b.currentStreak - a.currentStreak);
              const rankings = getRanking(sorted, s => s.currentStreak);
              return sorted.map((s) => {
                const rank = rankings.get(s.participant.id) || 0;
                const isTied = sorted.filter(x => x.currentStreak === s.currentStreak).length > 1;
                return (
                  <div key={s.participant.id} className={`flex items-center justify-between p-2 rounded ${rank === 1 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg w-8">{getRankEmoji(rank, isTied)}</span>
                      <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                      {isTied && rank <= 3 && <span className="text-xs text-gray-500">(TIE)</span>}
                    </div>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{s.currentStreak} days</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-4">
          <h2 className="text-lg font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            ⭐ Longest Streak Ever
          </h2>
          <div className="space-y-2">
            {(() => {
              const sorted = [...stats].sort((a, b) => b.longestStreak - a.longestStreak);
              const rankings = getRanking(sorted, s => s.longestStreak);
              return sorted.map((s) => {
                const rank = rankings.get(s.participant.id) || 0;
                const isTied = sorted.filter(x => x.longestStreak === s.longestStreak).length > 1;
                return (
                  <div key={s.participant.id} className={`flex items-center justify-between p-2 rounded ${rank === 1 ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700' : 'bg-gray-50 dark:bg-gray-900'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg w-8">{getRankEmoji(rank, isTied)}</span>
                      <span className="font-bold text-black dark:text-white">{s.participant.name}</span>
                      {isTied && rank <= 3 && <span className="text-xs text-gray-500">(TIE)</span>}
                    </div>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{s.longestStreak} days</span>
                  </div>
                );
              });
            })()}
          </div>
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
