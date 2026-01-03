import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { getParticipantNameAsync, preloadParticipants } from '@/lib/participants';
import Link from 'next/link';
import WordChallengeTrigger from '@/components/WordChallengeTrigger';

export default async function Home() {
  let word: Entry | null = null;
  let quote: Entry | null = null;
  let error: string | null = null;

  // Preload participants cache
  await preloadParticipants();

  try {
    // Fetch latest word
    const { data: wordData, error: wordError } = await supabase
      .from('entries')
      .select('id, type, content, created_at, updated_at, participant_id, word_metadata(*)')
      .eq('type', 'word')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (wordError) throw wordError;
    word = wordData;

    // Fetch latest quote
    const { data: quoteData, error: quoteError } = await supabase
      .from('entries')
      .select('id, type, content, created_at, updated_at, participant_id, quote_metadata(*)')
      .eq('type', 'quote')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (quoteError) throw quoteError;
    quote = quoteData;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load data';
  }

  if (error) return <div className="p-4 text-red-700 dark:text-[#f85149] font-bold">Error: {error}</div>;

  // Get participant names
  const wordParticipantName = word ? await getParticipantNameAsync(word.participant_id) : '';
  const quoteParticipantName = quote ? await getParticipantNameAsync(quote.participant_id) : '';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-[#c9d1d9]">Today's Featured</h1>
          <div className="flex gap-2">
            <WordChallengeTrigger />
            <Link
              href="/entries/new"
              className="bg-black dark:bg-[#21262d] text-white dark:text-[#c9d1d9] font-bold px-3 sm:px-4 py-2 rounded hover:bg-gray-800 dark:hover:bg-[#30363d] border-2 border-black dark:border-[#30363d] text-sm sm:text-base whitespace-nowrap"
            >
              Create New Entry
            </Link>
          </div>
        </div>

        {/* Word of the Day */}
        {word && (
          <div className="border-2 border-black dark:border-[#30363d] rounded p-3 sm:p-4 bg-white dark:bg-[#161b22]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-3 sm:mb-2">
              <h2 className="text-base sm:text-lg font-bold text-black dark:text-[#c9d1d9]">Word of the Day</h2>
              <p className="text-xs sm:text-sm text-black dark:text-[#8b949e] font-semibold">Submitted by {wordParticipantName}</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 break-words text-black dark:text-[#c9d1d9]">{word.content}</p>
            {word.word_metadata && word.word_metadata[0] && (
              <div className="space-y-2 text-xs sm:text-sm text-black dark:text-[#c9d1d9]">
                <p><span className="font-bold">Pronunciation:</span> {word.word_metadata[0].pronunciation}</p>
                <p><span className="font-bold">Part of Speech:</span> {word.word_metadata[0].part_of_speech}</p>
                <p><span className="font-bold">Definition:</span> {word.word_metadata[0].definition}</p>
                {word.word_metadata[0].etymology && (
                  <p><span className="font-bold">Etymology:</span> {word.word_metadata[0].etymology}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quote of the Day */}
        {quote && (
          <div className="border-2 border-black dark:border-[#30363d] rounded p-3 sm:p-4 bg-white dark:bg-[#161b22]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold text-black dark:text-[#c9d1d9]">Quote of the Day</h2>
              <p className="text-xs sm:text-sm text-black dark:text-[#8b949e] font-semibold">Submitted by {quoteParticipantName}</p>
            </div>
            <p className="text-lg sm:text-xl italic mb-3 sm:mb-4 break-words text-black dark:text-[#c9d1d9]">"{quote.content}"</p>
            {quote.quote_metadata && quote.quote_metadata[0] && (
              <div className="text-xs sm:text-sm space-y-1 text-black dark:text-[#c9d1d9]">
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

        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t-2 border-black dark:border-[#30363d]">
          <Link href="/entries" className="text-blue-700 dark:text-[#58a6ff] hover:underline font-bold text-sm sm:text-base">
            View all entries →
          </Link>
        </div>
      </div>
    </div>
  );
}
