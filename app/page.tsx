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
      .select('id, type, content, created_at, participant_id, word_metadata(*)')
      .eq('type', 'word')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (wordError) throw wordError;
    word = wordData;

    // Fetch latest quote
    const { data: quoteData, error: quoteError } = await supabase
      .from('entries')
      .select('id, type, content, created_at, participant_id, quote_metadata(*)')
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
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Today's Featured</h1>
          <div className="flex gap-2">
            <WordChallengeTrigger />
            <Link
              href="/entries/new"
              className="bg-blue-600 text-white font-semibold px-4 py-2 rounded hover:bg-blue-700"
            >
              Create New Entry
            </Link>
          </div>
        </div>

        {/* Word of the Day */}
        {word && (
          <div className="border border-gray-300 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">Word of the Day</h2>
              <p className="text-sm text-gray-500">Submitted by {wordParticipantName}</p>
            </div>
            <p className="text-3xl font-bold mb-4">{word.content}</p>
            {word.word_metadata && word.word_metadata[0] && (
              <div className="space-y-2 text-sm">
                <p><span className="font-semibold">Pronunciation:</span> {word.word_metadata[0].pronunciation}</p>
                <p><span className="font-semibold">Part of Speech:</span> {word.word_metadata[0].part_of_speech}</p>
                <p><span className="font-semibold">Definition:</span> {word.word_metadata[0].definition}</p>
                <p><span className="font-semibold">Etymology:</span> {word.word_metadata[0].etymology}</p>
              </div>
            )}
          </div>
        )}

        {/* Quote of the Day */}
        {quote && (
          <div className="border border-gray-300 rounded p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Quote of the Day</h2>
              <p className="text-sm text-gray-500">Submitted by {quoteParticipantName}</p>
            </div>
            <p className="text-xl italic mb-4">"{quote.content}"</p>
            {quote.quote_metadata && quote.quote_metadata[0] && (
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Author:</span> {quote.quote_metadata[0].author}</p>
                <p><span className="font-semibold">Source:</span> {quote.quote_metadata[0].source}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t">
          <Link href="/entries" className="text-blue-600 hover:underline font-medium">
            View all entries →
          </Link>
        </div>
      </div>
    </div>
  );
}
