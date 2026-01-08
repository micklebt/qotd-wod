'use client';

import { Entry } from '@/lib/supabase';
import { markAsProblemWord, removeFromProblemWords, getMasteryStatus, markAsConfident } from '@/lib/wordMastery';
import { useState, useEffect } from 'react';
import type { WordMasteryStatus } from '@/lib/supabase';

interface HomeWordCardProps {
  word: Entry;
}

export default function HomeWordCard({ word }: HomeWordCardProps) {
  const [masteryStatus, setMasteryStatus] = useState<WordMasteryStatus | null>(null);
  const [markingProblem, setMarkingProblem] = useState(false);
  const [markingConfident, setMarkingConfident] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      const tracking = await getMasteryStatus(word.id);
      setMasteryStatus(tracking?.status || null);
    };
    loadStatus();
  }, [word.id]);

  const handleMarkAsProblem = async () => {
    setMarkingProblem(true);
    try {
      if (masteryStatus) {
        await removeFromProblemWords(word.id);
        setMasteryStatus(null);
      } else {
        await markAsProblemWord(word.id);
        setMasteryStatus('not_known');
      }
    } catch (err) {
      console.error('Error toggling problem word:', err);
      alert('Failed to update problem word status');
    } finally {
      setMarkingProblem(false);
    }
  };

  const handleMarkAsConfident = async () => {
    setMarkingConfident(true);
    try {
      await markAsConfident(word.id);
      setMasteryStatus('mastered');
    } catch (err) {
      console.error('Error marking word as confident:', err);
      alert('Failed to mark word as confident');
    } finally {
      setMarkingConfident(false);
    }
  };

  return (
    <div className="border border-black dark:border-[#333333] rounded p-3 sm:p-4 bg-white dark:bg-[#0a0a0a]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-3 sm:mb-2">
        <h2 className="text-base sm:text-lg font-bold text-black dark:text-[#ffffff]">Word of the Day</h2>
        {masteryStatus !== 'mastered' && (
          <div className="flex items-center gap-2">
            {masteryStatus && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                masteryStatus === 'practicing'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100'
              }`}>
                {masteryStatus === 'practicing' ? '…' : '!'}
              </span>
            )}
            <button
              onClick={handleMarkAsConfident}
              disabled={markingConfident}
              className="text-xs px-2 py-1 rounded font-bold border transition-colors bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 border-green-700 dark:border-green-300 hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markingConfident ? 'Updating...' : '✓ I Know This'}
            </button>
            <button
              onClick={handleMarkAsProblem}
              disabled={markingProblem}
              className={`text-xs px-2 py-1 rounded font-bold border transition-colors ${
                masteryStatus
                  ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border-red-700 dark:border-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                  : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 border-yellow-700 dark:border-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {markingProblem ? 'Updating...' : masteryStatus ? '✓ Problem' : 'Mark Problem'}
            </button>
          </div>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 break-words text-black dark:text-[#ffffff]">{word.content}</p>
      {word.word_metadata && word.word_metadata[0] && (
        <div className="space-y-2 text-xs sm:text-sm text-black dark:text-[#ffffff]">
          <p><span className="font-bold">Pronunciation:</span> {word.word_metadata[0].pronunciation_respelling || word.word_metadata[0].pronunciation_ipa || word.word_metadata[0].pronunciation}</p>
          <p><span className="font-bold">Part of Speech:</span> {word.word_metadata[0].part_of_speech}</p>
          <p><span className="font-bold">Definition:</span> {word.word_metadata[0].definition}</p>
          {word.word_metadata[0].etymology && (
            <p><span className="font-bold">Etymology:</span> {word.word_metadata[0].etymology}</p>
          )}
        </div>
      )}
    </div>
  );
}

