'use client';

import { supabase } from '@/lib/supabase';
import type { Entry, WordMasteryStatus } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { getCurrentParticipantId, getParticipantName, getParticipantsAsync, type Participant } from '@/lib/participants';
import { getMasteryStatus, markAsConfident, markAsProblemWord, removeFromProblemWords } from '@/lib/wordMastery';
import { getCurrentTimestampEST } from '@/lib/dateUtils';

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
  const [masteryStatus, setMasteryStatus] = useState<WordMasteryStatus | null>(null);
  const [markingProblem, setMarkingProblem] = useState(false);
  const helpSectionRef = useRef<HTMLDivElement>(null);

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
        // Load mastery status
        const tracking = await getMasteryStatus(word.id);
        setMasteryStatus(tracking?.status || null);
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
          created_at: getCurrentTimestampEST(),
          updated_at: getCurrentTimestampEST(),
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

      // If user confirms they know the word, also mark as confident in mastery tracking
      if (isKnown) {
        try {
          await markAsConfident(randomWord.id, participantId);
          setMasteryStatus('mastered');
        } catch (err) {
          console.error('Error marking as confident:', err);
          // Don't fail the whole operation if mastery update fails
        }
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
      <div className="bg-white dark:bg-[#0a0a0a] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-black dark:border-[#333333]">
        <div className="sticky top-0 bg-white dark:bg-[#0a0a0a] z-10 border-b border-black dark:border-[#333333] px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-black dark:text-white">Flash Cards</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black dark:hover:text-white text-2xl font-bold leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-black dark:text-[#ffffff] font-bold">Loading random word...</p>
            </div>
          ) : randomWord ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-bold mb-3 sm:mb-4 text-black dark:text-[#ffffff]">{randomWord.content}</p>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center mb-4 sm:mb-6">
                  <button
                    onClick={() => handleConfirmation(true)}
                    disabled={saving || !currentParticipantId}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 font-bold rounded border transition-colors text-xs sm:text-sm ${
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
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 font-bold rounded border transition-colors text-xs sm:text-sm ${
                      stats?.currentUserResponse === false
                        ? 'bg-red-700 dark:bg-red-500 text-white dark:text-black border-red-900 dark:border-red-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border-red-700 dark:border-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {saving ? 'Saving...' : stats?.currentUserResponse === false ? '✗ Not Yet Confident' : 'Not Yet Confident'}
                  </button>
                  {!showMetadata && (
                    <button
                      onClick={() => {
                        setShowMetadata(true);
                        setTimeout(() => {
                          helpSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-bold rounded border border-blue-700 dark:border-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-xs sm:text-sm"
                    >
                      Help
                    </button>
                  )}
                </div>

                {/* Mark as Problem Word */}
                {randomWord && masteryStatus !== 'mastered' && (
                  <div className="flex justify-center mb-4">
                    <button
                      onClick={async () => {
                        if (!randomWord) return;
                        setMarkingProblem(true);
                        try {
                          if (masteryStatus) {
                            await removeFromProblemWords(randomWord.id);
                            setMasteryStatus(null);
                          } else {
                            await markAsProblemWord(randomWord.id);
                            setMasteryStatus('not_known');
                          }
                        } catch (err) {
                          console.error('Error toggling problem word:', err);
                          alert('Failed to update problem word status');
                        } finally {
                          setMarkingProblem(false);
                        }
                      }}
                      disabled={markingProblem}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 font-bold rounded border transition-colors text-xs sm:text-sm ${
                        masteryStatus
                          ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border-red-700 dark:border-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 border-yellow-700 dark:border-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {markingProblem ? 'Updating...' : masteryStatus ? '✓ Problem Word' : 'Mark as Problem Word'}
                    </button>
                  </div>
                )}

                {/* Statistics Display */}
                {stats && (
                  <div                               className="bg-white dark:bg-[#0a0a0a] rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                                <div className="flex flex-col items-center mb-2">
                                  <p className="text-xs sm:text-sm font-bold text-black dark:text-[#ffffff]">Word Challenge Statistics</p>
                                  {currentParticipantId && (
                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-normal">
                                      {getParticipantName(currentParticipantId)}
                                    </p>
                                  )}
                                </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                      <div>
                                    <p className="text-xl sm:text-2xl font-bold text-black dark:text-[#ffffff]">{stats.totalAppearances}</p>
                        <p className="text-xs text-black dark:text-white font-semibold">Total Appearances</p>
                      </div>
                      <div>
                                    <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-[#22c55e]">{stats.confirmedKnown}</p>
                        <p className="text-xs text-black dark:text-white font-semibold">Confirmed Known</p>
                      </div>
                      <div>
                                    <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-[#ef4444]">{stats.confirmedNotKnown}</p>
                        <p className="text-xs text-black dark:text-white font-semibold">Not Yet Confident</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={fetchRandomWord}
                    disabled={loading}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-black text-black dark:text-white rounded border border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-bold"
                  >
                    {loading ? 'Loading...' : 'New Word'}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-black text-black dark:text-white rounded border border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-xs sm:text-sm font-bold"
                  >
                    Close
                  </button>
                </div>

                {/* Practice Problem Words Link */}
                <div className="pt-4 mt-4 border-t border-black dark:border-white">
                  <p className="text-xs sm:text-sm text-black dark:text-[#ffffff] font-bold mb-2 text-center">
                    Practice your problem words to master them
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      // Trigger practice modal - this will be handled by parent component
                      window.dispatchEvent(new CustomEvent('openWordPractice'));
                    }}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-accent-blue text-white font-bold rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                  >
                    Practice Problem Words
                  </button>
                </div>

                {/* Participant Selection */}
                <div className="pt-4 mt-4">
                  <label className="block text-sm font-bold text-black dark:text-white mb-2">Select Participant</label>
                  <select
                    value={currentParticipantId || ''}
                    onChange={(e) => handleParticipantChange(e.target.value)}
                    className="w-full border border-black dark:border-white rounded p-2 text-black dark:text-white bg-white dark:bg-black font-semibold"
                  >
                    <option value="">Select participant (your selection will be remembered)</option>
                    {participants.map((participant) => (
                      <option key={participant.id} value={String(participant.id)}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {showMetadata && randomWord.word_metadata && randomWord.word_metadata[0] && (
                <div ref={helpSectionRef} className="border-t border-black dark:border-white pt-6 space-y-4">
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white mb-1">Pronunciation</p>
                    <p className="text-lg text-black dark:text-white">{randomWord.word_metadata[0].pronunciation_respelling || randomWord.word_metadata[0].pronunciation_ipa || randomWord.word_metadata[0].pronunciation || 'N/A'}</p>
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
              <p className="text-black dark:text-[#ffffff] font-bold">No words found in the database.</p>
              <p className="text-sm text-black dark:text-white mt-2 font-semibold">Add some words to start the challenge!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

