'use client';

import Link from 'next/link';
import { Entry } from '@/lib/supabase';
import { getParticipantName, getCurrentParticipantId } from '@/lib/participants';
import { formatDateEST } from '@/lib/dateUtils';
import { getMasteryStatus, markAsProblemWord, removeFromProblemWords, markAsConfident } from '@/lib/wordMastery';
import { useEffect, useState } from 'react';
import type { WordMasteryStatus } from '@/lib/supabase';

export default function EntryCard({ entry }: { entry: Entry }) {
  const [masteryStatus, setMasteryStatus] = useState<WordMasteryStatus | null>(null);
  const [markingProblem, setMarkingProblem] = useState(false);
  const [markingConfident, setMarkingConfident] = useState(false);

  useEffect(() => {
    if (entry.type === 'word') {
      const loadStatus = async () => {
        const tracking = await getMasteryStatus(entry.id);
        setMasteryStatus(tracking?.status || null);
      };
      loadStatus();
    }
  }, [entry.id, entry.type]);

  const handleMarkAsProblem = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (entry.type !== 'word') return;
    
    setMarkingProblem(true);
    try {
      if (masteryStatus) {
        await removeFromProblemWords(entry.id);
        setMasteryStatus(null);
      } else {
        await markAsProblemWord(entry.id);
        setMasteryStatus('not_known');
      }
    } catch (err) {
      console.error('Error toggling problem word:', err);
      alert('Failed to update problem word status');
    } finally {
      setMarkingProblem(false);
    }
  };

  const handleMarkAsConfident = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (entry.type !== 'word') return;
    
    setMarkingConfident(true);
    try {
      await markAsConfident(entry.id);
      setMasteryStatus('mastered');
    } catch (err) {
      console.error('Error marking word as confident:', err);
      alert('Failed to mark word as confident');
    } finally {
      setMarkingConfident(false);
    }
  };

  return (
    <div className="border border-black dark:border-[#333333] rounded p-3 sm:p-4 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors bg-white dark:bg-[#0a0a0a]">
      <Link href={`/entries/${entry.id}`} className="block">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm text-black dark:text-[#b0b0b0] font-semibold">{entry.type === 'word' ? 'Word of the Day' : 'Quote of the Day'}</p>
            {entry.type === 'word' && masteryStatus && masteryStatus !== 'mastered' && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                masteryStatus === 'practicing'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100'
              }`}>
                {masteryStatus === 'practicing' ? '…' : '!'}
              </span>
            )}
          </div>
          <p className="text-xs text-black dark:text-[#b0b0b0] font-semibold">{getParticipantName(entry.participant_id)}</p>
        </div>
        {entry.type === 'word' ? (
          <>
            <p className="text-xl sm:text-2xl font-bold break-words text-black dark:text-[#ffffff]">{entry.content}</p>
            {entry.word_metadata?.[0]?.definition && (
              <p className="text-xs sm:text-sm text-black dark:text-[#ffffff] mt-2 break-words">{entry.word_metadata[0].definition}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-base sm:text-lg italic break-words text-black dark:text-[#ffffff]">"{entry.content}"</p>
            {entry.quote_metadata?.[0]?.author && (
              <p className="text-xs sm:text-sm text-black dark:text-[#ffffff] mt-2">— {entry.quote_metadata[0].author}</p>
            )}
          </>
        )}
        <p className="text-xs text-black dark:text-[#b0b0b0] font-semibold mt-2 sm:mt-3">{formatDateEST(entry.created_at)}</p>
      </Link>
      {entry.type === 'word' && masteryStatus !== 'mastered' && (
        <div className="mt-2 pt-2 border-t border-card-border flex gap-2">
          {masteryStatus !== 'mastered' && (
            <button
              onClick={handleMarkAsConfident}
              disabled={markingConfident}
              className="text-xs px-2 py-1 rounded font-bold border transition-colors bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 border-green-700 dark:border-green-300 hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markingConfident ? 'Updating...' : '✓ I Know This'}
            </button>
          )}
          <button
            onClick={handleMarkAsProblem}
            disabled={markingProblem}
            className={`text-xs px-2 py-1 rounded font-bold border transition-colors ${
              masteryStatus
                ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border-red-700 dark:border-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 border-yellow-700 dark:border-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {markingProblem ? 'Updating...' : masteryStatus ? '✓ Problem Word' : 'Mark as Problem Word'}
          </button>
        </div>
      )}
    </div>
  );
}
