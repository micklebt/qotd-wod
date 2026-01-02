'use client';

import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { getCurrentParticipantId, getParticipantName, getParticipantsAsync, type Participant } from '@/lib/participants';
import Navigation from './Navigation';

interface WordChallengeProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WordChallengeStats {
  totalAppearances: number;
  confirmedKnown: number;
  confirmedNotKnown: number;
  currentUserResponse: boolean | null; // null = no response yet, true = knows it, false = doesn't know it
}

export default function WordChallenge({ isOpen, onClose }: WordChallengeProps) {
  const [randomWord, setRandomWord] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [stats, setStats] = useState<WordChallengeStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Always reload participant when modal opens
      const participantId = getCurrentParticipantId();
      setCurrentParticipantId(participantId);
      fetchRandomWord();
      setShowMetadata(false);
      
      // Load participants for dropdown
      const loadParticipants = async () => {
        const participantsData = await getParticipantsAsync();
        setParticipants(participantsData);
      };
      loadParticipants();
    }
  }, [isOpen]);

  // Listen for storage changes and custom events to update participant
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'qotd-wod-selected-participant') {
        const newParticipantId = getCurrentParticipantId();
        setCurrentParticipantId(newParticipantId);
        // Refresh stats if we have a word loaded
        if (randomWord && newParticipantId) {
          fetchWordStats(randomWord.id);
        }
      }
    };

    // Listen for custom events (for same-window updates)
    const handleCustomStorageChange = () => {
      const newParticipantId = getCurrentParticipantId();
      setCurrentParticipantId(newParticipantId);
      if (randomWord && newParticipantId) {
        fetchWordStats(randomWord.id);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('participantChanged', handleCustomStorageChange);

    // Also check localStorage periodically when modal is open (every 500ms)
    let intervalId: NodeJS.Timeout | null = null;
    if (isOpen) {
      intervalId = setInterval(() => {
        const currentId = getCurrentParticipantId();
        if (currentId !== currentParticipantId) {
          setCurrentParticipantId(currentId);
          if (randomWord && currentId) {
            fetchWordStats(randomWord.id);
          }
        }
      }, 500);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('participantChanged', handleCustomStorageChange);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [randomWord, isOpen, currentParticipantId]);

  const loadCurrentParticipant = () => {
    const participantId = getCurrentParticipantId();
    setCurrentParticipantId(participantId);
  };

  const fetchRandomWord = async () => {
    setLoading(true);
    setShowMetadata(false);
    setStats(null);
    try {
      const { data: allWords, error } = await supabase
        .from('entries')
        .select('*, word_metadata(*)')
        .eq('type', 'word');

      if (error) throw error;

      if (allWords && allWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * allWords.length);
        const word = allWords[randomIndex];
        setRandomWord(word);
        await fetchWordStats(word.id, true); // Pass true to reset user response
      } else {
        setRandomWord(null);
      }
    } catch (err) {
      console.error('Error fetching random word:', err);
      setRandomWord(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchWordStats = async (entryId: number, resetUserResponse: boolean = false) => {
    // Always get the latest participant ID from localStorage
    const participantId = getCurrentParticipantId();
    // Update state if it changed
    if (participantId !== currentParticipantId) {
      setCurrentParticipantId(participantId);
    }

    try {
      // Get all responses for this word
      const { data: allResponses, error: responsesError } = await supabase
        .from('word_challenge_responses')
        .select('*')
        .eq('entry_id', entryId);

      if (responsesError) throw responsesError;

      // Get current user's response (only if not resetting)
      const userResponse = resetUserResponse ? null : allResponses?.find(r => r.participant_id === participantId);

      // Calculate stats (aggregate data always shown)
      const totalAppearances = allResponses?.length || 0;
      const confirmedKnown = allResponses?.filter(r => r.is_known === true).length || 0;
      const confirmedNotKnown = allResponses?.filter(r => r.is_known === false).length || 0;

      setStats({
        totalAppearances,
        confirmedKnown,
        confirmedNotKnown,
        currentUserResponse: resetUserResponse ? null : (userResponse ? userResponse.is_known : null),
      });
    } catch (err) {
      console.error('Error fetching word stats:', err);
      // Set default stats if error
      setStats({
        totalAppearances: 0,
        confirmedKnown: 0,
        confirmedNotKnown: 0,
        currentUserResponse: null,
      });
    }
  };

  const handleParticipantChange = (participantId: string) => {
    setCurrentParticipantId(participantId);
    if (participantId) {
      localStorage.setItem('qotd-wod-selected-participant', participantId);
      // Refresh stats if we have a word loaded
      if (randomWord) {
        fetchWordStats(randomWord.id);
      }
    }
  };

  const handleConfirmation = async (isKnown: boolean) => {
    if (!randomWord) {
      alert('No word selected');
      return;
    }
    
    // Always check localStorage directly before saving
    const participantId = getCurrentParticipantId();
    if (!participantId) {
      alert('Please select a participant first');
      return;
    }
    
    // Update state if needed
    if (participantId !== currentParticipantId) {
      setCurrentParticipantId(participantId);
    }

    setSaving(true);
    try {
      // Always insert a new record - don't update existing ones
      // This allows users to change their mind and track their learning journey
      // Each click increments the counters independently
      const { error } = await supabase
        .from('word_challenge_responses')
        .insert({
          entry_id: randomWord.id,
          participant_id: participantId,
          is_known: isKnown,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Database error:', error);
        // Check if it's a unique constraint violation
        if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
          alert('Database constraint error: Please run the migration SQL to remove the UNIQUE constraint. See remove_unique_constraint_word_challenge.sql');
        } else {
          throw error;
        }
        return;
      }

      // Refresh stats to show updated counters
      await fetchWordStats(randomWord.id, false);
    } catch (err) {
      console.error('Error saving confirmation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to save your response: ${errorMessage}. Please check the console for details.`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
          <Navigation />
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Word Challenge</h2>
          </div>

          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500">Loading random word...</p>
            </div>
          ) : randomWord ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-bold mb-3 sm:mb-4">{randomWord.content}</p>
                <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                  Do you have confident knowledge and use of this word?
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center mb-4 sm:mb-6">
                  <button
                    onClick={() => handleConfirmation(true)}
                    disabled={saving || !currentParticipantId}
                    className={`px-4 sm:px-6 py-2 sm:py-3 font-semibold rounded transition-colors text-sm sm:text-base ${
                      stats?.currentUserResponse === true
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {saving ? 'Saving...' : stats?.currentUserResponse === true ? '✓ I Know This Word' : 'I Know This Word'}
                  </button>
                  <button
                    onClick={() => handleConfirmation(false)}
                    disabled={saving || !currentParticipantId}
                    className={`px-4 sm:px-6 py-2 sm:py-3 font-semibold rounded transition-colors text-sm sm:text-base ${
                      stats?.currentUserResponse === false
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {saving ? 'Saving...' : stats?.currentUserResponse === false ? '✗ Not Yet Confident' : 'Not Yet Confident'}
                  </button>
                </div>

                {!showMetadata && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowMetadata(true)}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-100 text-blue-700 font-semibold rounded hover:bg-blue-200 transition-colors text-sm sm:text-base"
                    >
                      Show Definition & Details
                    </button>
                  </div>
                )}

                {/* Statistics Display */}
                {stats && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Word Challenge Statistics</p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                      <div>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalAppearances}</p>
                        <p className="text-xs text-gray-700">Total Appearances</p>
                      </div>
                      <div>
                        <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.confirmedKnown}</p>
                        <p className="text-xs text-gray-700">Confirmed Known</p>
                      </div>
                      <div>
                        <p className="text-xl sm:text-2xl font-bold text-red-700">{stats.confirmedNotKnown}</p>
                        <p className="text-xs text-gray-700">Not Yet Confident</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={fetchRandomWord}
                    disabled={loading}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-semibold"
                  >
                    {loading ? 'Loading...' : 'New Word'}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm sm:text-base font-semibold"
                  >
                    Close
                  </button>
                </div>

                {/* Participant Selection */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Participant</label>
                  <select
                    value={currentParticipantId || ''}
                    onChange={(e) => handleParticipantChange(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-gray-700 bg-white"
                  >
                    <option value="">Select participant (your selection will be remembered)</option>
                    {participants.map((participant) => (
                      <option key={participant.id} value={String(participant.id)}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tracking Progress - Moved to Bottom */}
                {currentParticipantId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 mt-4">
                    <p className="text-sm text-blue-900 font-medium">
                      Tracking progress for: <span className="font-bold text-blue-950">{getParticipantName(currentParticipantId)}</span>
                    </p>
                  </div>
                )}
              </div>

              {showMetadata && randomWord.word_metadata && randomWord.word_metadata[0] && (
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">Pronunciation</p>
                    <p className="text-lg">{randomWord.word_metadata[0].pronunciation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">Part of Speech</p>
                    <p className="text-lg">{randomWord.word_metadata[0].part_of_speech || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">Definition</p>
                    <p className="text-lg">{randomWord.word_metadata[0].definition || 'N/A'}</p>
                  </div>
                  {randomWord.word_metadata[0].etymology && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">Etymology</p>
                      <p className="text-lg">{randomWord.word_metadata[0].etymology}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No words found in the database.</p>
              <p className="text-sm text-gray-400 mt-2">Add some words to start the challenge!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

