'use client';

import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { getParticipantsAsync, getCurrentParticipantId, type Participant } from '@/lib/participants';
import { useState, useEffect } from 'react';

interface MonthDay {
  day: number;
  date: Date;
  participants: string[];
}

const PARTICIPANT_SYMBOLS = ['▲', '■', '●'];
const PARTICIPANT_COLOR = '#86efac'; // Single color for all participants

// Create a mapping from participant ID to symbol index
// Based on known participant IDs: 101 (triangle), 102 (square), 103 (circle)
const PARTICIPANT_ID_TO_SYMBOL_INDEX: Record<string, number> = {
  '101': 0, // Brian Mickley - triangle
  '102': 1, // Erik Beachy - square
  '103': 2, // Ryan Mann - circle
};

export default function CalendarPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('all');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [yearsWithEntries, setYearsWithEntries] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch participants from database
        const participantsData = await getParticipantsAsync();
        // Normalize participant IDs to strings for consistency
        const normalizedParticipants = participantsData.map(p => ({
          ...p,
          id: String(p.id)
        }));
        console.log('Loaded participants:', normalizedParticipants);
        setParticipants(normalizedParticipants);

        // Default to sticky participant from localStorage
        const stickyParticipantId = getCurrentParticipantId();
        if (stickyParticipantId && normalizedParticipants.some(p => String(p.id) === stickyParticipantId)) {
          setSelectedParticipant(stickyParticipantId);
        }

        // Fetch entries
        const { data, error } = await supabase
          .from('entries')
          .select('id, type, content, created_at, updated_at, participant_id')
          .order('created_at', { ascending: false });

        if (error) throw error;
        console.log('Loaded entries:', data?.length, 'entries');
        
        // Normalize participant_id to strings for consistency
        const normalizedEntries = (data || []).map(entry => ({
          ...entry,
          participant_id: String(entry.participant_id),
        }));
        
        // Log unique participant IDs in entries
        const uniqueParticipantIds = Array.from(new Set(normalizedEntries.map(e => e.participant_id)));
        console.log('Unique participant IDs in entries:', uniqueParticipantIds);
        // Log entries for each participant
        uniqueParticipantIds.forEach(pid => {
          const count = normalizedEntries.filter(e => e.participant_id === pid).length;
          console.log(`Participant ${pid}: ${count} entries`);
          // Log sample entry for this participant
          const sampleEntry = normalizedEntries.find(e => e.participant_id === pid);
          if (sampleEntry) {
            console.log(`  Sample entry for ${pid}:`, {
              id: sampleEntry.id,
              participant_id: sampleEntry.participant_id,
              created_at: sampleEntry.created_at,
              date: new Date(sampleEntry.created_at).toISOString().split('T')[0]
            });
          }
        });
        // Specifically check for participant 103
        const ryanEntries = normalizedEntries.filter(e => e.participant_id === '103');
        console.log('Ryan Mann (103) entries found:', ryanEntries.length);
        if (ryanEntries.length > 0) {
          console.log('Ryan entries details:', ryanEntries.map(e => ({
            id: e.id,
            participant_id: e.participant_id,
            created_at: e.created_at,
            date: new Date(e.created_at).toISOString().split('T')[0]
          })));
        }
        
        // Find all years that have entries
        const years = new Set<number>();
        normalizedEntries.forEach(entry => {
          const year = new Date(entry.created_at).getFullYear();
          years.add(year);
        });
        const sortedYears = Array.from(years).sort((a, b) => b - a); // Most recent first
        setYearsWithEntries(sortedYears);
        
        // If there are entries, default to the most recent year with entries
        if (sortedYears.length > 0) {
          setCurrentYear(sortedYears[0]);
        }
        
        setEntries(normalizedEntries);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
            return entryDate === dateStr && entry.participant_id === selectedParticipant;
          });

      // Get unique participant IDs (already normalized to strings)
      const participants = Array.from(new Set(dayEntries.map(e => e.participant_id)));

      // Debug logging for January 2nd (common test date)
      if (month === 0 && day === 2 && participants.length > 0) {
        console.log(`Jan 2 entries:`, {
          dateStr,
          dayEntries: dayEntries.map(e => ({
            id: e.id,
            participant_id: e.participant_id,
            type: typeof e.participant_id,
            created_at: e.created_at
          })),
          participants
        });
      }

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
            return entryDate === dateStr && entry.participant_id === selectedParticipant;
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
      .filter(entry => selectedParticipant === 'all' || entry.participant_id === selectedParticipant)
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
    const idx = participants.findIndex(p => p.id === participantId);
    // If participant not found, return -1 (will use fallback symbol)
    return idx >= 0 ? idx : -1;
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxDays = 31;

  const currentStreak = getCurrentStreak();
  const longestStreak = getLongestStreak();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="text-center py-8">
          <p className="text-black dark:text-white text-sm sm:text-base font-bold">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
                <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 bg-white dark:bg-[#000000]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-3 sm:mb-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-[#ffffff]">Participation Calendar <span className="text-black dark:text-[#ffffff]">{currentYear}</span></h1>
        <div className="flex gap-1 items-center flex-wrap">
          <button
            onClick={() => setCurrentYear(currentYear - 1)}
            className="text-xs sm:text-sm px-2 py-1 border border-black dark:border-white rounded hover:bg-gray-100 dark:hover:bg-gray-900 touch-target bg-white dark:bg-black text-black dark:text-white font-bold"
            aria-label="Previous year"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentYear(new Date().getFullYear())}
            className="text-xs sm:text-sm px-2 py-1 border border-black dark:border-white rounded hover:bg-gray-100 dark:hover:bg-gray-900 touch-target bg-white dark:bg-black text-black dark:text-white font-bold"
            aria-label="Current year"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentYear(currentYear + 1)}
            className="text-xs sm:text-sm px-2 py-1 border border-black dark:border-white rounded hover:bg-gray-100 dark:hover:bg-gray-900 touch-target bg-white dark:bg-black text-black dark:text-white font-bold"
            aria-label="Next year"
          >
            →
          </button>
          {yearsWithEntries.length > 0 && (
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="text-xs sm:text-sm px-2 py-1 border border-black dark:border-white rounded bg-white dark:bg-black text-black dark:text-white ml-1 sm:ml-2 font-bold"
            >
              {yearsWithEntries.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
        </div>
      </div>

                  <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded p-2.5 sm:p-3 mb-3 sm:mb-4">
        <div className="mb-2 sm:mb-3">
          <select
            value={selectedParticipant}
            onChange={(e) => setSelectedParticipant(e.target.value)}
            className="w-full text-sm border border-black dark:border-white rounded px-3 py-2 bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-300 font-bold"
          >
            <option value="all">All Participants</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-white dark:bg-black rounded p-2 sm:p-3 border border-black dark:border-white">
                        <p className="text-xs text-black dark:text-[#b0b0b0] font-bold mb-1 sm:mb-0.5">Current Streak</p>
                        <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-[#3b82f6]">{currentStreak}</p>
          </div>
          <div className="bg-white dark:bg-black rounded p-2 sm:p-3 border border-black dark:border-white">
                        <p className="text-xs text-black dark:text-[#b0b0b0] font-bold mb-1 sm:mb-0.5">Longest Streak</p>
                        <p className="text-lg sm:text-xl font-bold text-green-700 dark:text-[#22c55e]">{longestStreak}</p>
          </div>
        </div>
      </div>

                  <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded p-2 sm:p-3 overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-[auto_repeat(12,1fr)] gap-1 mb-1">
            <div className="w-8"></div>
            {monthNames.map((month, monthIdx) => (
              <div
                key={monthIdx}
                            className="text-center text-xs font-bold text-black dark:text-[#ffffff] py-1"
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
                                className="w-8 h-4 flex items-center justify-end pr-1 text-[10px] font-bold text-black dark:text-[#ffffff]"
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
                          className="w-full h-4 bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 rounded"
                        />
                      );
                    }

                    const participantSymbols = monthDay!.participants.map(pid => {
                      const participant = participants.find(p => p.id === pid || String(p.id) === String(pid));
                      // Use the mapping based on participant ID to get the correct symbol index
                      // Handle both string and number IDs
                      const pidStr = String(pid);
                      const idx = PARTICIPANT_ID_TO_SYMBOL_INDEX[pidStr] ?? -1;
                      
                      // Use symbol based on participant ID mapping
                      // If not found, use a default symbol
                      let symbol = '●';
                      if (idx >= 0 && idx < PARTICIPANT_SYMBOLS.length) {
                        symbol = PARTICIPANT_SYMBOLS[idx];
                      }
                      
                      // Debug logging for participant 103
                      if (pidStr === '103' || pid === '103') {
                        console.log('Rendering symbol for participant 103:', {
                          pid,
                          pidStr,
                          idx,
                          symbol,
                          participant: participant?.name
                        });
                      }
                      
                      return {
                        symbol,
                        color: PARTICIPANT_COLOR,
                        participantId: pidStr,
                        name: participant?.name || pidStr,
                      };
                    });

                    // Check if all participants have entries on this day
                    const allParticipantsHaveEntries = participants.length > 0 && 
                      monthDay!.participants.length === participants.length;
                    
                    // Determine border styling: green if all participants have entries, red with 50% opacity otherwise
                    let borderStyle: { borderColor?: string } = {};
                    let borderClass = '';
                    
                    if (isFuture) {
                      borderClass = 'border-gray-300';
                    } else if (allParticipantsHaveEntries) {
                      borderClass = 'border-green-500';
                    } else {
                      // Red border with 50% opacity
                      borderClass = 'border-red-500';
                      borderStyle = { borderColor: 'rgba(239, 68, 68, 0.5)' }; // red-500 with 50% opacity
                    }

                    return (
                      <div
                        key={dayIdx}
                          className={`
                          w-full h-4 rounded border flex items-center justify-center gap-1
                                      ${isFuture ? 'bg-gray-200 dark:bg-[#0a0a0a]' : 'bg-white dark:bg-[#0a0a0a]'}
                          ${borderClass}
                          ${isToday ? 'ring-2 ring-blue-700 dark:ring-blue-300' : ''}
                        `}
                        style={borderStyle}
                        title={`${monthDay!.date.toLocaleDateString()}: ${monthDay!.participants.length > 0 ? monthDay!.participants.map(pid => participants.find(p => p.id === pid)?.name || pid).join(', ') : 'No entries'}`}
                      >
                        {!isFuture && participantSymbols.map((p, idx) => {
                          // Make circle symbol larger to match visual size of triangle and square
                          const isCircle = p.symbol === '●';
                          const symbolSize = isCircle ? '12px' : '10px';
                          const symbolWidth = isCircle ? '12px' : '10px';
                          const symbolHeight = isCircle ? '12px' : '10px';
                          
                          return (
                            <span
                              key={idx}
                              className="leading-none font-bold inline-flex items-center justify-center"
                              style={{ 
                                color: p.color,
                                width: symbolWidth,
                                height: symbolHeight,
                                fontSize: symbolSize,
                                lineHeight: '1'
                              }}
                            >
                              {p.symbol}
                            </span>
                          );
                        })}
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
              <span className="text-[12px] font-bold" style={{ color: PARTICIPANT_COLOR }}>▲</span>
              <span className="text-black dark:text-white font-bold">Participant made entry</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-white dark:bg-black border border-red-700 dark:border-red-300 rounded"></div>
              <span className="text-black dark:text-white font-bold">No symbols = No entries</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 border border-gray-600 dark:border-gray-400 rounded"></div>
              <span className="text-black dark:text-white font-bold">Future</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] flex-wrap">
            {participants.length > 0 ? (
              participants.map((participant, idx) => {
                // Use the ID-based mapping to get the correct symbol
                const pidStr = String(participant.id);
                const symbolIdx = PARTICIPANT_ID_TO_SYMBOL_INDEX[pidStr] ?? idx;
                const displaySymbol = PARTICIPANT_SYMBOLS[symbolIdx] || '●';
                
                // Make circle symbol larger to match visual size of triangle and square
                // Circle needs to be larger than triangle/square to appear the same visual size
                const isCircle = displaySymbol === '●';
                const symbolSize = isCircle ? '16px' : '12px';
                
                return (
                  <div key={participant.id} className="flex items-center gap-1">
                    <span 
                      style={{ 
                        color: PARTICIPANT_COLOR,
                        fontSize: symbolSize,
                        lineHeight: '1',
                        fontWeight: 'bold'
                      }} 
                      className="inline-flex items-center justify-center"
                    >
                      {displaySymbol}
                    </span>
                    <span className="font-bold text-black dark:text-white">{participant.name} (ID: {participant.id})</span>
                  </div>
                );
              })
            ) : (
              <div className="text-black dark:text-white font-bold">No participants loaded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
