'use client';

import { supabase } from '@/lib/supabase';
import EntryCard from '@/components/EntryCard';
import type { Entry } from '@/lib/supabase';
import { getParticipantsAsync, type Participant } from '@/lib/participants';
import { getProblemWords, getCurrentParticipantId } from '@/lib/wordMastery';
import { getDateStringEST } from '@/lib/dateUtils';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Filter states
  const [selectedParticipant, setSelectedParticipant] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'word' | 'quote'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [showProblemWordsOnly, setShowProblemWordsOnly] = useState(false);
  const [problemWordIds, setProblemWordIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch participants from database
        const participantsData = await getParticipantsAsync();
        setParticipants(participantsData);

        // Fetch entries
        const { data, error } = await supabase
          .from('entries')
          .select('*, word_metadata(*), quote_metadata(*)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEntries(data || []);
        setFilteredEntries(data || []);

        // Load problem words for current participant
        const problemWords = await getProblemWords();
        setProblemWordIds(new Set(problemWords.map(w => w.entry_id)));
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate available letters (only for word entries)
  const availableLetters = Array.from(new Set(
    entries
      .filter(entry => entry.type === 'word' && entry.content && entry.content.length > 0)
      .map(entry => entry.content.charAt(0).toUpperCase())
      .filter(letter => /[A-Z]/.test(letter))
  )).sort();

  useEffect(() => {
    let filtered = [...entries];

    // Filter by participant
    if (selectedParticipant !== 'all') {
      filtered = filtered.filter(entry => entry.participant_id === selectedParticipant);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(entry => entry.type === selectedType);
    }

    // Filter by date
    if (selectedDate !== 'all') {
      const now = new Date();
      const todayEST = getDateStringEST(now); // Get today's date in EST
      
      filtered = filtered.filter(entry => {
        try {
          if (!entry.created_at) return false;
          
          const entryDateEST = getDateStringEST(entry.created_at);
          
          if (selectedDate === 'today') {
            // Compare date strings in YYYY-MM-DD format
            const matches = entryDateEST === todayEST;
            // Debug logging (can be removed later)
            if (process.env.NODE_ENV === 'development') {
              console.log('Date filter - Today:', todayEST, 'Entry:', entryDateEST, 'Matches:', matches);
            }
            return matches;
          } else if (selectedDate === 'this-week') {
            // Get date 7 days ago in EST
            const weekAgoDate = new Date(now);
            weekAgoDate.setDate(weekAgoDate.getDate() - 7);
            const weekAgoEST = getDateStringEST(weekAgoDate);
            // String comparison works for YYYY-MM-DD format
            return entryDateEST >= weekAgoEST && entryDateEST <= todayEST;
          } else if (selectedDate === 'this-month') {
            const [todayYear, todayMonth] = todayEST.split('-').map(Number);
            const [entryYear, entryMonth] = entryDateEST.split('-').map(Number);
            return entryMonth === todayMonth && entryYear === todayYear;
          } else if (selectedDate === 'this-year') {
            const [todayYear] = todayEST.split('-').map(Number);
            const [entryYear] = entryDateEST.split('-').map(Number);
            return entryYear === todayYear;
          }
          return true;
        } catch (err) {
          // If date parsing fails, exclude the entry
          console.error('Error parsing entry date:', entry.created_at, err);
          return false;
        }
      });
    }

    // Filter by first letter (only for word entries)
    if (selectedLetter !== 'all') {
      filtered = filtered.filter(entry => {
        if (entry.type === 'word' && entry.content && entry.content.length > 0) {
          const firstLetter = entry.content.charAt(0).toUpperCase();
          // Handle combined letter pairs
          const letterPairs: Record<string, string[]> = {
            'O': ['O', 'P'],
            'P': ['O', 'P'],
            'Q': ['Q', 'R'],
            'R': ['Q', 'R'],
            'S': ['S', 'T'],
            'T': ['S', 'T'],
            'U': ['U', 'V'],
            'V': ['U', 'V'],
            'W': ['W', 'X'],
            'X': ['W', 'X'],
            'Y': ['Y', 'Z'],
            'Z': ['Y', 'Z']
          };
          
          if (letterPairs[selectedLetter]) {
            return letterPairs[selectedLetter].includes(firstLetter);
          }
          return firstLetter === selectedLetter;
        }
        return false;
      });
    }

    // Filter by problem words
    if (showProblemWordsOnly) {
      filtered = filtered.filter(entry => {
        return entry.type === 'word' && problemWordIds.has(entry.id);
      });
    }

    setFilteredEntries(filtered);
  }, [entries, selectedParticipant, selectedType, selectedDate, selectedLetter, showProblemWordsOnly, problemWordIds]);

  const clearFilters = () => {
    setSelectedParticipant('all');
    setSelectedType('all');
    setSelectedDate('all');
    setSelectedLetter('all');
    setShowProblemWordsOnly(false);
  };

  const hasActiveFilters = selectedParticipant !== 'all' || selectedType !== 'all' || selectedDate !== 'all' || selectedLetter !== 'all' || showProblemWordsOnly;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="text-center py-8">
          <p className="text-black dark:text-[#ffffff] text-sm sm:text-base font-bold">Loading entries...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 bg-white dark:bg-[#000000]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-[#ffffff]">All Entries</h1>
          <Link
            href="/entries/new"
            className="bg-black dark:bg-[#0a0a0a] text-white dark:text-[#ffffff] font-bold px-3 sm:px-4 py-2 rounded hover:bg-gray-800 dark:hover:bg-[#1a1a1a] border border-black dark:border-[#333333] transition-colors text-sm sm:text-base whitespace-nowrap text-center"
          >
            Create New Entry
          </Link>
        </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-black dark:border-[#333333] rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs sm:text-sm font-bold text-black dark:text-[#ffffff]">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-700 dark:text-[#3b82f6] hover:text-blue-900 dark:hover:text-[#60a5fa] hover:underline touch-target font-bold"
            >
              Clear all
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Participant Filter */}
          <div>
            <label className="block text-xs font-bold text-black dark:text-[#ffffff] mb-1">
              Participant
            </label>
            <select
              value={selectedParticipant}
              onChange={(e) => setSelectedParticipant(e.target.value)}
              className="w-full text-sm border border-black dark:border-[#333333] rounded px-3 py-2 bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-[#3b82f6] focus:border-transparent font-semibold"
            >
              <option value="all">All Participants</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-bold text-black dark:text-[#ffffff] mb-1">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                const newType = e.target.value as 'all' | 'word' | 'quote';
                setSelectedType(newType);
                // Clear letter filter when switching to quotes
                if (newType === 'quote') {
                  setSelectedLetter('all');
                }
              }}
              className="w-full text-sm border border-black dark:border-[#333333] rounded px-3 py-2 bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-[#3b82f6] focus:border-transparent font-semibold"
            >
              <option value="all">All Types</option>
              <option value="word">Words</option>
              <option value="quote">Quotes</option>
            </select>
          </div>

          {/* Date Filter - Always show */}
          <div>
            <label className="block text-xs font-bold text-black dark:text-[#ffffff] mb-1">
              Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-sm border border-black dark:border-[#333333] rounded px-3 py-2 bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-[#3b82f6] focus:border-transparent font-semibold"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="this-year">This Year</option>
            </select>
          </div>

          {/* Problem Words Toggle - Only show when Type is 'word' */}
          {selectedType === 'word' && (
            <div>
              <label className="block text-xs font-bold text-black dark:text-[#ffffff] mb-1">
                Filter
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProblemWordsOnly}
                  onChange={(e) => {
                    setShowProblemWordsOnly(e.target.checked);
                  }}
                  className="w-4 h-4 text-accent-blue border-black dark:border-white rounded focus:ring-2 focus:ring-blue-700 dark:focus:ring-[#3b82f6] cursor-pointer"
                />
                <span className="text-xs font-semibold text-black dark:text-[#ffffff]">
                  Show only problem words
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Alphabet Filter - Only show for Words */}
        {selectedType !== 'quote' && (
          <div className="mt-3 pt-3 border-t border-black dark:border-[#333333]">
            <div className="flex flex-wrap gap-1 sm:gap-1.5 justify-center">
            <button
              onClick={() => setSelectedLetter('all')}
              className={`px-2 sm:px-2.5 py-1 text-xs sm:text-sm font-bold rounded border transition-colors ${
                selectedLetter === 'all'
                  ? 'bg-blue-700 dark:bg-[#2563eb] text-white dark:text-[#ffffff] border-blue-900 dark:border-[#3b82f6]'
                  : 'bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff] border-black dark:border-[#333333] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]'
              }`}
            >
              All
            </button>
            {/* Single letters A-N - only show if available */}
            {Array.from({ length: 14 }, (_, i) => {
              const letter = String.fromCharCode(65 + i); // A-N
              const isAvailable = availableLetters.includes(letter);
              const isSelected = selectedLetter === letter;
              
              // Only render if available
              if (!isAvailable) return null;
              
              return (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(letter)}
                  className={`px-2 sm:px-2.5 py-1 text-xs sm:text-sm font-bold rounded border transition-colors ${
                    isSelected
                      ? 'bg-blue-700 dark:bg-[#2563eb] text-white dark:text-[#ffffff] border-blue-900 dark:border-[#3b82f6]'
                      : 'bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff] border-black dark:border-[#333333] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
            {/* Combined letter pairs O-Z - only show if available */}
            {[
              { pair: 'OP', letters: ['O', 'P'] },
              { pair: 'QR', letters: ['Q', 'R'] },
              { pair: 'ST', letters: ['S', 'T'] },
              { pair: 'UV', letters: ['U', 'V'] },
              { pair: 'WX', letters: ['W', 'X'] },
              { pair: 'YZ', letters: ['Y', 'Z'] }
            ].map(({ pair, letters }) => {
              const isAvailable = letters.some(letter => availableLetters.includes(letter));
              const isSelected = letters.some(letter => selectedLetter === letter) || selectedLetter === pair;
              
              // Only render if available
              if (!isAvailable) return null;
              
              return (
                <button
                  key={pair}
                  onClick={() => {
                    // If clicked, set to the first available letter in the pair
                    const firstAvailable = letters.find(letter => availableLetters.includes(letter));
                    if (firstAvailable) setSelectedLetter(firstAvailable);
                  }}
                  className={`px-2 sm:px-2.5 py-1 text-xs sm:text-sm font-bold rounded border transition-colors ${
                    isSelected
                      ? 'bg-blue-700 dark:bg-[#2563eb] text-white dark:text-[#ffffff] border-blue-900 dark:border-[#3b82f6]'
                      : 'bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff] border-black dark:border-[#333333] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]'
                  }`}
                >
                  {pair}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* Results count */}
        <div className="mt-3 pt-3 border-t border-black dark:border-white">
          <p className="text-xs text-black dark:text-[#ffffff] font-bold">
            Showing <span className="font-bold">{filteredEntries.length}</span> of{' '}
            <span className="font-bold">{entries.length}</span> entries
          </p>
        </div>
      </div>

      {/* Words List - Hyperlinks */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-bold text-black dark:text-[#ffffff] mb-3">Words</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {entries
            .filter(entry => {
              if (entry.type !== 'word') return false;
              
              // Apply alphabet filter if selected
              if (selectedLetter !== 'all' && entry.content && entry.content.length > 0) {
                const firstLetter = entry.content.charAt(0).toUpperCase();
                // Handle combined letter pairs
                const letterPairs: Record<string, string[]> = {
                  'O': ['O', 'P'],
                  'P': ['O', 'P'],
                  'Q': ['Q', 'R'],
                  'R': ['Q', 'R'],
                  'S': ['S', 'T'],
                  'T': ['S', 'T'],
                  'U': ['U', 'V'],
                  'V': ['U', 'V'],
                  'W': ['W', 'X'],
                  'X': ['W', 'X'],
                  'Y': ['Y', 'Z'],
                  'Z': ['Y', 'Z']
                };
                
                if (letterPairs[selectedLetter]) {
                  return letterPairs[selectedLetter].includes(firstLetter);
                }
                return firstLetter === selectedLetter;
              }
              
              return true;
            })
            .sort((a, b) => a.content.localeCompare(b.content))
            .map((entry: Entry) => (
              <Link
                key={entry.id}
                href={`/entries/${entry.id}`}
                className="text-base sm:text-lg text-blue-700 dark:text-[#3b82f6] hover:text-blue-900 dark:hover:text-[#60a5fa] hover:underline font-medium"
              >
                {entry.content}
              </Link>
            ))}
        </div>
      </div>
      
      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry: Entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-[#0a0a0a] rounded-lg border border-black dark:border-[#333333]">
            <p className="text-black dark:text-[#ffffff] mb-2 font-bold">
              {hasActiveFilters ? 'No entries match your filters.' : 'No entries yet.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="text-blue-700 dark:text-[#3b82f6] hover:text-blue-900 dark:hover:text-[#60a5fa] hover:underline text-sm font-bold"
              >
                Clear filters to see all entries
              </button>
            ) : (
              <Link
                href="/entries/new"
                className="text-blue-700 dark:text-blue-300 hover:underline font-bold text-sm"
              >
                Create your first entry →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
