'use client';

import { supabase } from '@/lib/supabase';
import EntryCard from '@/components/EntryCard';
import type { Entry } from '@/lib/supabase';
import { getParticipantsAsync, type Participant } from '@/lib/participants';
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
      const today = new Date();
      const filterDate = new Date(selectedDate);
      
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.created_at);
        
        if (selectedDate === 'today') {
          return entryDate.toDateString() === today.toDateString();
        } else if (selectedDate === 'this-week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return entryDate >= weekAgo;
        } else if (selectedDate === 'this-month') {
          return entryDate.getMonth() === today.getMonth() && 
                 entryDate.getFullYear() === today.getFullYear();
        } else if (selectedDate === 'this-year') {
          return entryDate.getFullYear() === today.getFullYear();
        }
        return true;
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

    setFilteredEntries(filtered);
  }, [entries, selectedParticipant, selectedType, selectedDate, selectedLetter]);

  const clearFilters = () => {
    setSelectedParticipant('all');
    setSelectedType('all');
    setSelectedDate('all');
    setSelectedLetter('all');
  };

  const hasActiveFilters = selectedParticipant !== 'all' || selectedType !== 'all' || selectedDate !== 'all' || selectedLetter !== 'all';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="text-center py-8">
          <p className="text-black dark:text-[#c9d1d9] text-sm sm:text-base font-bold">Loading entries...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 bg-white dark:bg-[#0d1117]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-[#c9d1d9]">All Entries</h1>
          <Link
            href="/entries/new"
            className="bg-black dark:bg-[#21262d] text-white dark:text-[#c9d1d9] font-bold px-3 sm:px-4 py-2 rounded hover:bg-gray-800 dark:hover:bg-[#30363d] border-2 border-black dark:border-[#30363d] transition-colors text-sm sm:text-base whitespace-nowrap text-center"
          >
            Create New Entry
          </Link>
        </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-[#161b22] border-2 border-black dark:border-[#30363d] rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs sm:text-sm font-bold text-black dark:text-[#c9d1d9]">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-700 dark:text-[#58a6ff] hover:text-blue-900 dark:hover:text-[#79c0ff] hover:underline touch-target font-bold"
            >
              Clear all
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Participant Filter */}
          <div>
            <label className="block text-xs font-bold text-black dark:text-[#c9d1d9] mb-1">
              Participant
            </label>
            <select
              value={selectedParticipant}
              onChange={(e) => setSelectedParticipant(e.target.value)}
              className="w-full text-sm border-2 border-black dark:border-[#30363d] rounded px-3 py-2 bg-white dark:bg-[#0d1117] text-black dark:text-[#c9d1d9] focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-[#58a6ff] focus:border-transparent font-semibold"
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
            <label className="block text-xs font-bold text-black dark:text-[#c9d1d9] mb-1">
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
              className="w-full text-sm border-2 border-black dark:border-[#30363d] rounded px-3 py-2 bg-white dark:bg-[#0d1117] text-black dark:text-[#c9d1d9] focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-[#58a6ff] focus:border-transparent font-semibold"
            >
              <option value="all">All Types</option>
              <option value="word">Words</option>
              <option value="quote">Quotes</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs font-bold text-black dark:text-[#c9d1d9] mb-1">
              Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-sm border-2 border-black dark:border-[#30363d] rounded px-3 py-2 bg-white dark:bg-[#0d1117] text-black dark:text-[#c9d1d9] focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-[#58a6ff] focus:border-transparent font-semibold"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="this-year">This Year</option>
            </select>
          </div>
        </div>

        {/* Alphabet Filter - Only show for Words */}
        {selectedType !== 'quote' && (
          <div className="mt-3 pt-3 border-t-2 border-black dark:border-[#30363d]">
            <div className="flex flex-wrap gap-1 sm:gap-1.5 justify-center">
            <button
              onClick={() => setSelectedLetter('all')}
              className={`px-2 sm:px-2.5 py-1 text-xs sm:text-sm font-bold rounded border-2 transition-colors ${
                selectedLetter === 'all'
                  ? 'bg-blue-700 dark:bg-[#1f6feb] text-white dark:text-[#c9d1d9] border-blue-900 dark:border-[#58a6ff]'
                  : 'bg-white dark:bg-[#161b22] text-black dark:text-[#c9d1d9] border-black dark:border-[#30363d] hover:bg-gray-100 dark:hover:bg-[#21262d]'
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
                  className={`px-2 sm:px-2.5 py-1 text-xs sm:text-sm font-bold rounded border-2 transition-colors ${
                    isSelected
                      ? 'bg-blue-700 dark:bg-[#1f6feb] text-white dark:text-[#c9d1d9] border-blue-900 dark:border-[#58a6ff]'
                      : 'bg-white dark:bg-[#161b22] text-black dark:text-[#c9d1d9] border-black dark:border-[#30363d] hover:bg-gray-100 dark:hover:bg-[#21262d]'
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
                  className={`px-2 sm:px-2.5 py-1 text-xs sm:text-sm font-bold rounded border-2 transition-colors ${
                    isSelected
                      ? 'bg-blue-700 dark:bg-[#1f6feb] text-white dark:text-[#c9d1d9] border-blue-900 dark:border-[#58a6ff]'
                      : 'bg-white dark:bg-[#161b22] text-black dark:text-[#c9d1d9] border-black dark:border-[#30363d] hover:bg-gray-100 dark:hover:bg-[#21262d]'
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
        <div className="mt-3 pt-3 border-t-2 border-black dark:border-white">
          <p className="text-xs text-black dark:text-[#c9d1d9] font-bold">
            Showing <span className="font-bold">{filteredEntries.length}</span> of{' '}
            <span className="font-bold">{entries.length}</span> entries
          </p>
        </div>
      </div>

      {/* Words List - Hyperlinks */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-bold text-black dark:text-[#c9d1d9] mb-3">Words</h2>
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
                className="text-base sm:text-lg text-blue-700 dark:text-[#58a6ff] hover:text-blue-900 dark:hover:text-[#79c0ff] hover:underline font-medium"
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
          <div className="text-center py-12 bg-white dark:bg-[#161b22] rounded-lg border-2 border-black dark:border-[#30363d]">
            <p className="text-black dark:text-[#c9d1d9] mb-2 font-bold">
              {hasActiveFilters ? 'No entries match your filters.' : 'No entries yet.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="text-blue-700 dark:text-[#58a6ff] hover:text-blue-900 dark:hover:text-[#79c0ff] hover:underline text-sm font-bold"
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
