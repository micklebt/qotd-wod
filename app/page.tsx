import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { getParticipantNameAsync, getParticipantsAsync } from '@/lib/participants';
import Link from 'next/link';
import WordChallengeTrigger from '@/components/WordChallengeTrigger';
import WordPracticeTrigger from '@/components/WordPracticeTrigger';
import HomeWordCard from '@/components/HomeWordCard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let word: Entry | null = null;
  let quote: Entry | null = null;
  let error: string | null = null;

  try {
    const [participantsResult, wordsResult, responsesResult, quotesResult] = await Promise.all([
      getParticipantsAsync(),
      supabase
        .from('entries')
        .select('id, type, content, created_at, updated_at, participant_id, word_metadata(*)')
        .eq('type', 'word'),
      supabase
        .from('word_challenge_responses')
        .select('entry_id, participant_id')
        .eq('is_known', true),
      supabase
        .from('entries')
        .select('id, type, content, created_at, updated_at, participant_id, quote_metadata(*)')
        .eq('type', 'quote'),
    ]);

    const allParticipants = participantsResult;
    const participantIds = allParticipants.map(p => String(p.id));

    const { data: allWords, error: wordsError } = wordsResult;
    if (wordsError) throw wordsError;

    const { data: knownResponses, error: responsesError } = responsesResult;
    const knownByEntry = new Map<number, Set<string>>();
    if (!responsesError && knownResponses) {
      for (const r of knownResponses) {
        const eid = r.entry_id as number;
        if (!knownByEntry.has(eid)) knownByEntry.set(eid, new Set());
        knownByEntry.get(eid)!.add(String(r.participant_id));
      }
    }

    let eligibleWords: Entry[] = [];
    if (allWords && allWords.length > 0) {
      if (participantIds.length === 0) {
        eligibleWords = allWords;
      } else {
        for (const wordEntry of allWords) {
          const knownIds = knownByEntry.get(wordEntry.id);
          if (responsesError || !knownIds) {
            eligibleWords.push(wordEntry);
            continue;
          }
          const allParticipantsKnow = participantIds.every(pid => knownIds.has(pid));
          if (!allParticipantsKnow) eligibleWords.push(wordEntry);
        }
      }
      if (eligibleWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleWords.length);
        word = eligibleWords[randomIndex];
      }
    }

    const { data: allQuotes, error: quoteError } = quotesResult;
    if (quoteError) throw quoteError;
    if (allQuotes && allQuotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * allQuotes.length);
      quote = allQuotes[randomIndex];
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load data';
  }

  if (error) return <div className="p-4 text-red-700 dark:text-[#ef4444] font-bold">Error: {error}</div>;

  const [wordParticipantName, quoteParticipantName] = await Promise.all([
    word ? getParticipantNameAsync(word.participant_id) : Promise.resolve(''),
    quote ? getParticipantNameAsync(quote.participant_id) : Promise.resolve(''),
  ]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#000000]">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-[#ffffff]">Today&apos;s Featured</h1>
          <div className="flex gap-2 flex-wrap">
            <WordChallengeTrigger />
            <WordPracticeTrigger />
          </div>
        </div>

        {word && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
              <p className="text-xs sm:text-sm text-black dark:text-[#b0b0b0] font-semibold">Submitted by {wordParticipantName}</p>
            </div>
            <HomeWordCard word={word} />
          </div>
        )}

        {quote && (
          <div className="border border-black dark:border-[#333333] rounded p-3 sm:p-4 bg-white dark:bg-[#0a0a0a]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold text-black dark:text-[#ffffff]">Quote of the Day</h2>
              <p className="text-xs sm:text-sm text-black dark:text-[#b0b0b0] font-semibold">Submitted by {quoteParticipantName}</p>
            </div>
            <p className="text-lg sm:text-xl italic mb-3 sm:mb-4 break-words text-black dark:text-[#ffffff]">&quot;{quote.content}&quot;</p>
            {quote.quote_metadata && quote.quote_metadata[0] && (
              <div className="text-xs sm:text-sm space-y-1 text-black dark:text-[#ffffff]">
                {quote.quote_metadata[0].author && (
                  <p><span className="font-bold">Author:</span> {quote.quote_metadata[0].author}</p>
                )}
                {quote.quote_metadata[0].source && (
                  <p><span className="font-bold">Source:</span> {quote.quote_metadata[0].source}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-black dark:border-[#333333]">
          <Link href="/entries" className="text-blue-700 dark:text-[#3b82f6] hover:underline font-bold text-sm sm:text-base">
            View all entries →
          </Link>
        </div>
      </div>
    </div>
  );
}
