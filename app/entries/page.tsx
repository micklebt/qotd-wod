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

    setFilteredEntries(filtered);
  }, [entries, selectedParticipant, selectedType, selectedDate]);

  const clearFilters = () => {
    setSelectedParticipant('all');
    setSelectedType('all');
    setSelectedDate('all');
  };

  const hasActiveFilters = selectedParticipant !== 'all' || selectedType !== 'all' || selectedDate !== 'all';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm sm:text-base">Loading entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-3 sm:mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold">All Entries</h1>
        <Link
          href="/entries/new"
          className="bg-blue-600 text-white font-semibold px-3 sm:px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm sm:text-base whitespace-nowrap text-center"
        >
          Create New Entry
        </Link>
      </div>

      {/* Filter Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-700">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline touch-target"
            >
              Clear all
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Participant Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Participant
            </label>
            <select
              value={selectedParticipant}
              onChange={(e) => setSelectedParticipant(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | 'word' | 'quote')}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="word">Words</option>
              <option value="quote">Quotes</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="this-year">This Year</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filteredEntries.length}</span> of{' '}
            <span className="font-semibold text-gray-700">{entries.length}</span> entries
          </p>
        </div>
      </div>
      
      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry: Entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-2">
              {hasActiveFilters ? 'No entries match your filters.' : 'No entries yet.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
              >
                Clear filters to see all entries
              </button>
            ) : (
              <Link
                href="/entries/new"
                className="text-blue-600 hover:underline font-medium text-sm"
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
