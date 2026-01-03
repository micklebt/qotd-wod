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
    <div className="fixed inset-0 bg-black bg-opacity-70 dark:bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-black dark:border-white">
        <div className="sticky top-0 bg-white dark:bg-black z-10 border-b-2 border-black dark:border-white">
          <Navigation />
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-black dark:text-white">Word Challenge</h2>
          </div>

          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-black dark:text-white font-bold">Loading random word...</p>
            </div>
          ) : randomWord ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-bold mb-3 sm:mb-4 text-black dark:text-white">{randomWord.content}</p>
                <p className="text-xs sm:text-sm text-black dark:text-white font-semibold mb-3 sm:mb-4">
                  Do you have confident knowledge and use of this word?
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center mb-4 sm:mb-6">
                  <button
                    onClick={() => handleConfirmation(true)}
                    disabled={saving || !currentParticipantId}
                    className={`px-4 sm:px-6 py-2 sm:py-3 font-bold rounded border-2 transition-colors text-sm sm:text-base ${
                      stats?.currentUserResponse === true
                        ? 'bg-green-700 dark:bg-green-500 text-white dark:text-black border-green-900 dark:border-green-300'
                        : 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 border-green-700 dark:border-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {saving ? 'Saving...' : stats?.currentUserResponse === true ? '✓ I Know This Word' : 'I Know This Word'}
                  </button>
                  <button
                    onClick={() => handleConfirmation(false)}
                    disabled={saving || !currentParticipantId}
                    className={`px-4 sm:px-6 py-2 sm:py-3 font-bold rounded border-2 transition-colors text-sm sm:text-base ${
                      stats?.currentUserResponse === false
                        ? 'bg-red-700 dark:bg-red-500 text-white dark:text-black border-red-900 dark:border-red-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border-red-700 dark:border-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {saving ? 'Saving...' : stats?.currentUserResponse === false ? '✗ Not Yet Confident' : 'Not Yet Confident'}
                  </button>
                </div>

                {!showMetadata && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowMetadata(true)}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-bold rounded border-2 border-blue-700 dark:border-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm sm:text-base"
                    >
                      Show Definition & Details
                    </button>
                  </div>
                )}

                {/* Statistics Display */}
                {stats && (
                  <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border-2 border-black dark:border-white">
                    <p className="text-xs sm:text-sm font-bold text-black dark:text-white mb-2">Word Challenge Statistics</p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                      <div>
                        <p className="text-xl sm:text-2xl font-bold text-black dark:text-white">{stats.totalAppearances}</p>
                        <p className="text-xs text-black dark:text-white font-semibold">Total Appearances</p>
                      </div>
                      <div>
                        <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">{stats.confirmedKnown}</p>
                        <p className="text-xs text-black dark:text-white font-semibold">Confirmed Known</p>
                      </div>
                      <div>
                        <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-300">{stats.confirmedNotKnown}</p>
                        <p className="text-xs text-black dark:text-white font-semibold">Not Yet Confident</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={fetchRandomWord}
                    disabled={loading}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-black text-black dark:text-white rounded border-2 border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-bold"
                  >
                    {loading ? 'Loading...' : 'New Word'}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-black text-black dark:text-white rounded border-2 border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-sm sm:text-base font-bold"
                  >
                    Close
                  </button>
                </div>

                {/* Participant Selection */}
                <div className="border-t-2 border-black dark:border-white pt-4 mt-4">
                  <label className="block text-sm font-bold text-black dark:text-white mb-2">Select Participant</label>
                  <select
                    value={currentParticipantId || ''}
                    onChange={(e) => handleParticipantChange(e.target.value)}
                    className="w-full border-2 border-black dark:border-white rounded p-2 text-black dark:text-white bg-white dark:bg-black font-semibold"
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
                  <div className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-700 dark:border-blue-300 rounded-lg p-2 sm:p-3 mt-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-bold">
                      Tracking progress for: <span className="font-bold">{getParticipantName(currentParticipantId)}</span>
                    </p>
                  </div>
                )}
              </div>

              {showMetadata && randomWord.word_metadata && randomWord.word_metadata[0] && (
                <div className="border-t-2 border-black dark:border-white pt-6 space-y-4">
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white mb-1">Pronunciation</p>
                    <p className="text-lg text-black dark:text-white">{randomWord.word_metadata[0].pronunciation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white mb-1">Part of Speech</p>
                    <p className="text-lg text-black dark:text-white">{randomWord.word_metadata[0].part_of_speech || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white mb-1">Definition</p>
                    <p className="text-lg text-black dark:text-white">{randomWord.word_metadata[0].definition || 'N/A'}</p>
                  </div>
                  {randomWord.word_metadata[0].etymology && (
                    <div>
                      <p className="text-sm font-bold text-black dark:text-white mb-1">Etymology</p>
                      <p className="text-lg text-black dark:text-white">{randomWord.word_metadata[0].etymology}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-black dark:text-white font-bold">No words found in the database.</p>
              <p className="text-sm text-black dark:text-white mt-2 font-semibold">Add some words to start the challenge!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

