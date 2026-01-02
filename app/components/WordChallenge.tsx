'use client';

import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { useState, useEffect } from 'react';

interface WordChallengeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WordChallenge({ isOpen, onClose }: WordChallengeProps) {
  const [randomWord, setRandomWord] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRandomWord();
      setShowMetadata(false);
    }
  }, [isOpen]);

  const fetchRandomWord = async () => {
    setLoading(true);
    setShowMetadata(false);
    try {
      const { data: allWords, error } = await supabase
        .from('entries')
        .select('*, word_metadata(*)')
        .eq('type', 'word');

      if (error) throw error;

      if (allWords && allWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * allWords.length);
        setRandomWord(allWords[randomIndex]);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Word Challenge</h2>
            <div className="flex gap-2">
              <button
                onClick={fetchRandomWord}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'New Word'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading random word...</p>
            </div>
          ) : randomWord ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-5xl font-bold mb-4">{randomWord.content}</p>
                <p className="text-sm text-gray-500 mb-4">
                  Do you remember this word?
                </p>
                {!showMetadata && (
                  <button
                    onClick={() => setShowMetadata(true)}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors"
                  >
                    Show Definition & Details
                  </button>
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

