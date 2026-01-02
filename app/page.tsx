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

  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  // Get participant names
  const wordParticipantName = word ? await getParticipantNameAsync(word.participant_id) : '';
  const quoteParticipantName = quote ? await getParticipantNameAsync(quote.participant_id) : '';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Today's Featured</h1>
          <div className="flex gap-2">
            <WordChallengeTrigger />
            <Link
              href="/entries/new"
              className="bg-blue-600 text-white font-semibold px-3 sm:px-4 py-2 rounded hover:bg-blue-700 text-sm sm:text-base whitespace-nowrap"
            >
              Create New Entry
            </Link>
          </div>
        </div>

        {/* Word of the Day */}
        {word && (
          <div className="border border-gray-300 rounded p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-3 sm:mb-2">
              <h2 className="text-base sm:text-lg font-bold">Word of the Day</h2>
              <p className="text-xs sm:text-sm text-gray-500">Submitted by {wordParticipantName}</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 break-words">{word.content}</p>
            {word.word_metadata && word.word_metadata[0] && (
              <div className="space-y-2 text-xs sm:text-sm">
                <p><span className="font-semibold">Pronunciation:</span> {word.word_metadata[0].pronunciation}</p>
                <p><span className="font-semibold">Part of Speech:</span> {word.word_metadata[0].part_of_speech}</p>
                <p><span className="font-semibold">Definition:</span> {word.word_metadata[0].definition}</p>
                {word.word_metadata[0].etymology && (
                  <p><span className="font-semibold">Etymology:</span> {word.word_metadata[0].etymology}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quote of the Day */}
        {quote && (
          <div className="border border-gray-300 rounded p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold">Quote of the Day</h2>
              <p className="text-xs sm:text-sm text-gray-500">Submitted by {quoteParticipantName}</p>
            </div>
            <p className="text-lg sm:text-xl italic mb-3 sm:mb-4 break-words">"{quote.content}"</p>
            {quote.quote_metadata && quote.quote_metadata[0] && (
              <div className="text-xs sm:text-sm space-y-1">
                {quote.quote_metadata[0].author && (
                  <p><span className="font-semibold">Author:</span> {quote.quote_metadata[0].author}</p>
                )}
                {quote.quote_metadata[0].source && (
                  <p><span className="font-semibold">Source:</span> {quote.quote_metadata[0].source}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t">
          <Link href="/entries" className="text-blue-600 hover:underline font-medium text-sm sm:text-base">
            View all entries →
          </Link>
        </div>
      </div>
    </div>
  );
}
