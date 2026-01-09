'use client';

import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { getParticipantsAsync, getCurrentParticipantId, type Participant } from '@/lib/participants';
import { getDateStringEST, getYearEST, toEST, getPreviousDayEST, getNextDayEST, formatDateEST, daysBetweenEST } from '@/lib/dateUtils';
import { useState, useEffect, useMemo } from 'react';
import StreakDisplay from '@/components/StreakDisplay';
import Link from 'next/link';

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
  const [selectedDate, setSelectedDate] = useState<string>(getDateStringEST(new Date()));
  const [entriesLoading, setEntriesLoading] = useState(false);

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

        // Fetch entries with metadata
        const { data, error } = await supabase
          .from('entries')
          .select('*, word_metadata(*), quote_metadata(*)')
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
              date: getDateStringEST(sampleEntry.created_at)
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
            date: getDateStringEST(e.created_at)
          })));
        }
        
        // Find all years that have entries
        const years = new Set<number>();
        normalizedEntries.forEach(entry => {
          const year = getYearEST(entry.created_at);
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
      // Convert calendar date to EST date string for comparison
      const dateStr = getDateStringEST(date);

      const dayEntries = selectedParticipant === 'all'
        ? entries.filter(entry => {
            const entryDate = getDateStringEST(entry.created_at);
            return entryDate === dateStr;
          })
        : entries.filter(entry => {
            const entryDate = getDateStringEST(entry.created_at);
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

    // Convert today to EST for streak calculation
    const todayEST = toEST(today);
    todayEST.setHours(0, 0, 0, 0);
    let currentDate = new Date(todayEST);
    let streak = 0;

    while (true) {
      const dateStr = getDateStringEST(currentDate);
      const hasEntry = selectedParticipant === 'all'
        ? entries.some(entry => {
            const entryDate = getDateStringEST(entry.created_at);
            return entryDate === dateStr;
          })
        : entries.some(entry => {
            const entryDate = getDateStringEST(entry.created_at);
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
        date: getDateStringEST(entry.created_at),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sortedEntries.length === 0) return 0;

    const uniqueDates = Array.from(new Set(sortedEntries.map(e => e.date))).sort();

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const diffDays = daysBetweenEST(uniqueDates[i - 1], uniqueDates[i]);

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

  // Get all unique dates with entries for the selected participant
  const datesWithEntries = useMemo(() => {
    const filteredEntries = selectedParticipant === 'all'
      ? entries
      : entries.filter(entry => entry.participant_id === selectedParticipant);
    
    const uniqueDates = Array.from(new Set(
      filteredEntries.map(entry => getDateStringEST(entry.created_at))
    )).sort();
    
    return uniqueDates;
  }, [entries, selectedParticipant]);

  // Find next day with entries
  const findNextDayWithEntries = (currentDate: string): string | null => {
    const currentIndex = datesWithEntries.indexOf(currentDate);
    if (currentIndex < datesWithEntries.length - 1) {
      return datesWithEntries[currentIndex + 1];
    }
    return null;
  };

  // Find previous day with entries
  const findPreviousDayWithEntries = (currentDate: string): string | null => {
    const currentIndex = datesWithEntries.indexOf(currentDate);
    if (currentIndex > 0) {
      return datesWithEntries[currentIndex - 1];
    }
    return null;
  };

  // Navigate to next day with entries
  const goToNextDay = () => {
    const nextDay = findNextDayWithEntries(selectedDate);
    if (nextDay) {
      setSelectedDate(nextDay);
      const year = parseInt(nextDay.split('-')[0]);
      setCurrentYear(year);
    }
  };

  // Navigate to previous day with entries
  const goToPreviousDay = () => {
    const prevDay = findPreviousDayWithEntries(selectedDate);
    if (prevDay) {
      setSelectedDate(prevDay);
      const year = parseInt(prevDay.split('-')[0]);
      setCurrentYear(year);
    }
  };

  // Go to today
  const goToToday = () => {
    const todayStr = getDateStringEST(new Date());
    setSelectedDate(todayStr);
    const year = new Date().getFullYear();
    setCurrentYear(year);
  };

  // Get entries for the selected date
  const selectedDateEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = getDateStringEST(entry.created_at);
      const matchesDate = entryDate === selectedDate;
      const matchesParticipant = selectedParticipant === 'all' || entry.participant_id === selectedParticipant;
      return matchesDate && matchesParticipant;
    }).sort((a, b) => {
      // Sort by type (words first), then by created_at
      if (a.type !== b.type) {
        return a.type === 'word' ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [entries, selectedDate, selectedParticipant]);

  // Update currentYear when selectedDate changes
  useEffect(() => {
    const year = parseInt(selectedDate.split('-')[0]);
    if (year !== currentYear) {
      setCurrentYear(year);
    }
  }, [selectedDate, currentYear]);

  // Show loading indicator when date or participant changes
  useEffect(() => {
    setEntriesLoading(true);
    const timer = setTimeout(() => {
      setEntriesLoading(false);
    }, 300); // Short delay to show the loading indicator
    
    return () => clearTimeout(timer);
  }, [selectedDate, selectedParticipant]);

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

  const canGoPrevious = findPreviousDayWithEntries(selectedDate) !== null;
  const canGoNext = findNextDayWithEntries(selectedDate) !== null;
  const isToday = selectedDate === getDateStringEST(new Date());

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 bg-white dark:bg-[#000000]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-3 sm:mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-[#ffffff]">Participation Calendar <span className="text-black dark:text-[#ffffff]">{currentYear}</span></h1>
          <Link
            href="/competition"
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-3 py-1.5 rounded hover:from-yellow-600 hover:to-orange-600 text-sm whitespace-nowrap"
            title="View Competition Portal"
          >
            🏆 Competition
          </Link>
        </div>
        <div className="flex gap-1 items-center flex-wrap">
          <button
            onClick={goToPreviousDay}
            disabled={!canGoPrevious}
            className="text-xs sm:text-sm px-3 py-1.5 border border-input-border rounded hover:bg-hover-bg disabled:opacity-50 disabled:cursor-not-allowed touch-target bg-input-bg text-input-text font-bold transition-colors"
            aria-label="Previous day with entries"
            title={canGoPrevious ? `Go to ${formatDateEST(findPreviousDayWithEntries(selectedDate) || '')}` : 'No previous entries'}
          >
            ←
          </button>
          <button
            onClick={goToToday}
            className={`text-xs sm:text-sm px-3 py-1.5 border border-input-border rounded hover:bg-hover-bg touch-target bg-input-bg text-input-text font-bold transition-colors ${isToday ? 'ring-2 ring-accent-blue' : ''}`}
            aria-label="Go to today"
            title="Go to today"
          >
            Today
          </button>
          <button
            onClick={goToNextDay}
            disabled={!canGoNext}
            className="text-xs sm:text-sm px-3 py-1.5 border border-input-border rounded hover:bg-hover-bg disabled:opacity-50 disabled:cursor-not-allowed touch-target bg-input-bg text-input-text font-bold transition-colors"
            aria-label="Next day with entries"
            title={canGoNext ? `Go to ${formatDateEST(findNextDayWithEntries(selectedDate) || '')}` : 'No next entries'}
          >
            →
          </button>
          {yearsWithEntries.length > 0 && (
            <select
              value={currentYear}
              onChange={(e) => {
                const year = Number(e.target.value);
                setCurrentYear(year);
                // Find the first date in that year with entries
                const yearDate = datesWithEntries.find(d => parseInt(d.split('-')[0]) === year);
                if (yearDate) {
                  setSelectedDate(yearDate);
                }
              }}
              className="text-xs sm:text-sm px-2 py-1 border border-input-border rounded bg-input-bg text-input-text ml-1 sm:ml-2 font-bold"
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
            onChange={(e) => {
              setSelectedParticipant(e.target.value);
              // When participant changes, find the most recent date with entries for that participant
              const newParticipant = e.target.value;
              const filteredDates = newParticipant === 'all'
                ? datesWithEntries
                : Array.from(new Set(
                    entries
                      .filter(entry => entry.participant_id === newParticipant)
                      .map(entry => getDateStringEST(entry.created_at))
                  )).sort();
              
              if (filteredDates.length > 0) {
                // Set to the most recent date (last in sorted array)
                setSelectedDate(filteredDates[filteredDates.length - 1]);
              }
            }}
            className="w-full text-sm border border-input-border rounded px-3 py-2 bg-input-bg text-input-text focus:outline-none focus:ring-2 focus:ring-input-focus-ring font-bold"
          >
            <option value="all">All Participants</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>

        {selectedParticipant !== 'all' ? (
          <StreakDisplay participantId={selectedParticipant} className="mb-2 sm:mb-3" />
        ) : (
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
        )}
      </div>

      {/* Compact Entry Display for Selected Date */}
      {entriesLoading ? (
        <div className="bg-card-bg border border-card-border rounded p-2.5 sm:p-3 mb-3 sm:mb-4 flex items-center justify-center min-h-[100px]">
          <div className="flex flex-col items-center gap-2">
            <svg
              className="animate-spin h-8 w-8 text-accent-blue"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-sm text-muted-text font-bold">Loading entries...</p>
          </div>
        </div>
      ) : selectedDateEntries.length > 0 ? (
        <div 
          key={`${selectedDate}-${selectedParticipant}`}
          className="bg-card-bg border border-card-border rounded p-2.5 sm:p-3 mb-3 sm:mb-4 animate-fade-in"
        >
          <h3 className="text-sm sm:text-base font-bold text-foreground mb-3">
            {formatDateEST(selectedDate)} - {selectedDateEntries.length} {selectedDateEntries.length === 1 ? 'entry' : 'entries'}
          </h3>
          
          {/* Words - matching All Entries page layout */}
          {selectedDateEntries.filter(e => e.type === 'word').length > 0 && (
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold text-foreground mb-3">Words</h2>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {selectedDateEntries
                  .filter(entry => entry.type === 'word')
                  .sort((a, b) => a.content.localeCompare(b.content))
                  .map((entry, index) => (
                    <Link
                      key={entry.id}
                      href={`/entries/${entry.id}`}
                      className="text-base sm:text-lg text-blue-700 dark:text-[#3b82f6] hover:text-blue-900 dark:hover:text-[#60a5fa] hover:underline font-medium transition-all duration-300 ease-out animate-slide-in"
                      style={{
                        animationDelay: `${index * 30}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      {entry.content}
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {/* Quotes - matching All Entries page layout */}
          {selectedDateEntries.filter(e => e.type === 'quote').length > 0 && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground mb-3">Quotes</h2>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {selectedDateEntries
                  .filter(entry => entry.type === 'quote')
                  .map((entry, index) => (
                    <Link
                      key={entry.id}
                      href={`/entries/${entry.id}`}
                      className="text-base sm:text-lg italic text-blue-700 dark:text-[#3b82f6] hover:text-blue-900 dark:hover:text-[#60a5fa] hover:underline font-medium transition-all duration-300 ease-out animate-slide-in"
                      style={{
                        animationDelay: `${index * 30}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      &quot;{entry.content}&quot;
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

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

                    const dayDateStr = getDateStringEST(monthDay!.date);
                    const isSelected = dayDateStr === selectedDate;
                    const hasEntriesForSelectedParticipant = selectedParticipant === 'all'
                      ? monthDay!.participants.length > 0
                      : monthDay!.participants.includes(selectedParticipant);

                    return (
                      <div
                        key={dayIdx}
                        onClick={() => {
                          if (!isFuture) {
                            setSelectedDate(dayDateStr);
                          }
                        }}
                        className={`
                          w-full h-4 rounded border flex items-center justify-center gap-1
                          ${isFuture ? 'bg-gray-200 dark:bg-[#0a0a0a] cursor-default' : 'bg-white dark:bg-[#0a0a0a] cursor-pointer hover:bg-hover-bg'}
                          ${borderClass}
                          ${isToday ? 'ring-2 ring-blue-700 dark:ring-blue-300' : ''}
                          ${isSelected ? 'ring-2 ring-accent-blue' : ''}
                        `}
                        style={borderStyle}
                        title={`${monthDay!.date.toLocaleDateString()}: ${monthDay!.participants.length > 0 ? monthDay!.participants.map(pid => participants.find(p => p.id === pid)?.name || pid).join(', ') : 'No entries'}${!isFuture ? ' (Click to view entries)' : ''}`}
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
