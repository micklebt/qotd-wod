'use client';

import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { PARTICIPANTS } from '@/lib/constants';
import { useState, useEffect } from 'react';

interface MonthDay {
  day: number;
  date: Date;
  participants: string[];
}

const PARTICIPANT_SYMBOLS = ['▲', '■', '●'];
const PARTICIPANT_COLORS = ['#2563eb', '#059669', '#d97706'];

export default function CalendarPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('all');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const { data, error } = await supabase
          .from('entries')
          .select('id, type, content, created_at, submitted_by_user_id')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEntries(data || []);
      } catch (err) {
        console.error('Error fetching entries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, []);

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthData = (year: number, month: number): MonthDay[] => {
    const daysInMonth = getDaysInMonth(year, month);
    const monthDays: MonthDay[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];

      const dayEntries = selectedParticipant === 'all'
        ? entries.filter(entry => {
            const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
            return entryDate === dateStr;
          })
        : entries.filter(entry => {
            const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
            return entryDate === dateStr && entry.submitted_by_user_id === selectedParticipant;
          });

      const participants = Array.from(new Set(dayEntries.map(e => e.submitted_by_user_id)));

      monthDays.push({
        day,
        date,
        participants,
      });
    }

    return monthDays;
  };

  const getCurrentStreak = (): number => {
    if (entries.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentDate = new Date(today);
    let streak = 0;

    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasEntry = selectedParticipant === 'all'
        ? entries.some(entry => {
            const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
            return entryDate === dateStr;
          })
        : entries.some(entry => {
            const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
            return entryDate === dateStr && entry.submitted_by_user_id === selectedParticipant;
          });

      if (hasEntry) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const getLongestStreak = (): number => {
    if (entries.length === 0) return 0;

    const sortedEntries = [...entries]
      .filter(entry => selectedParticipant === 'all' || entry.submitted_by_user_id === selectedParticipant)
      .map(entry => ({
        date: new Date(entry.created_at).toISOString().split('T')[0],
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sortedEntries.length === 0) return 0;

    const uniqueDates = Array.from(new Set(sortedEntries.map(e => e.date))).sort();

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return longestStreak;
  };

  const getParticipantIndex = (participantId: string): number => {
    return PARTICIPANTS.findIndex(p => p.id === participantId);
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxDays = 31;

  const currentStreak = getCurrentStreak();
  const longestStreak = getLongestStreak();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (loading) {
    return (
      <div className="max-w-full mx-auto p-2">
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto p-2">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold">Participation Calendar {currentYear}</h1>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentYear(currentYear - 1)}
            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentYear(new Date().getFullYear())}
            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentYear(currentYear + 1)}
            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-3">
        <div className="mb-2">
          <select
            value={selectedParticipant}
            onChange={(e) => setSelectedParticipant(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Participants</option>
            {PARTICIPANTS.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded p-2 border border-gray-200">
            <p className="text-xs text-gray-600 mb-0.5">Current Streak</p>
            <p className="text-lg font-bold text-blue-600">{currentStreak}</p>
          </div>
          <div className="bg-white rounded p-2 border border-gray-200">
            <p className="text-xs text-gray-600 mb-0.5">Longest Streak</p>
            <p className="text-lg font-bold text-green-600">{longestStreak}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded p-2 overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-[auto_repeat(12,1fr)] gap-1 mb-1">
            <div className="w-8"></div>
            {monthNames.map((month, monthIdx) => (
              <div
                key={monthIdx}
                className="text-center text-xs font-semibold text-gray-700 py-1"
              >
                {month}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[auto_repeat(12,1fr)] gap-1">
            <div className="flex flex-col gap-1">
              {Array.from({ length: maxDays }, (_, dayIdx) => {
                const day = dayIdx + 1;
                return (
                  <div
                    key={dayIdx}
                    className="w-8 h-4 flex items-center justify-end pr-1 text-[10px] font-medium text-gray-600"
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {monthNames.map((month, monthIdx) => {
              const monthData = getMonthData(currentYear, monthIdx);
              const daysInMonth = monthData.length;

              return (
                <div key={monthIdx} className="flex flex-col gap-1">
                  {Array.from({ length: maxDays }, (_, dayIdx) => {
                    const day = dayIdx + 1;
                    const monthDay = monthData.find(d => d.day === day);
                    const isToday = monthDay && monthDay.date.toDateString() === today.toDateString();
                    const isFuture = monthDay && monthDay.date > today;
                    const hasEntries = monthDay && monthDay.participants.length > 0;

                    if (day > daysInMonth) {
                      return (
                        <div
                          key={dayIdx}
                          className="w-full h-4 bg-gray-50 border border-gray-100 rounded"
                        />
                      );
                    }

                    const participantSymbols = monthDay!.participants
                      .slice(0, 3)
                      .map(pid => {
                        const idx = getParticipantIndex(pid);
                        return {
                          symbol: PARTICIPANT_SYMBOLS[idx] || '●',
                          color: PARTICIPANT_COLORS[idx] || '#6b7280',
                          participantId: pid,
                          name: PARTICIPANTS.find(p => p.id === pid)?.name || pid,
                        };
                      });

                    return (
                      <div
                        key={dayIdx}
                        className={`
                          w-full h-4 rounded border-2 flex items-center justify-center
                          ${isFuture ? 'bg-gray-200 border-gray-300' : hasEntries ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'}
                          ${isToday ? 'ring-2 ring-blue-500' : ''}
                        `}
                        title={`${monthDay!.date.toLocaleDateString()}: ${hasEntries ? participantSymbols.map(p => p.name).join(', ') : 'No entry'}`}
                      >
                        {hasEntries && participantSymbols.length > 0 && (
                          <div className="flex items-center justify-center gap-0.5">
                            {participantSymbols.map((p, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] leading-none font-bold"
                                style={{ color: p.color }}
                              >
                                {p.symbol}
                              </span>
                            ))}
                            {monthDay!.participants.length > 3 && (
                              <span className="text-[6px] leading-none text-gray-600">+</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-center gap-4 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
              <span>Entry</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
              <span>No entry</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-200 border-2 border-gray-300 rounded"></div>
              <span>Future</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] flex-wrap">
            {PARTICIPANTS.map((participant, idx) => (
              <div key={participant.id} className="flex items-center gap-1">
                <span style={{ color: PARTICIPANT_COLORS[idx] }} className="text-[14px] font-bold">
                  {PARTICIPANT_SYMBOLS[idx]}
                </span>
                <span className="font-medium">{participant.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
