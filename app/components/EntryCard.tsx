import Link from 'next/link';
import { Entry } from '@/lib/supabase';
import { getParticipantName } from '@/lib/participants';

export default function EntryCard({ entry }: { entry: Entry }) {
  return (
    <Link href={`/entries/${entry.id}`}>
      <div className="border border-gray-300 rounded p-3 sm:p-4 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
          <p className="text-xs sm:text-sm text-gray-500">{entry.type === 'word' ? 'Word of the Day' : 'Quote of the Day'}</p>
          <p className="text-xs text-gray-400">{getParticipantName(entry.participant_id)}</p>
        </div>
        {entry.type === 'word' ? (
          <>
            <p className="text-xl sm:text-2xl font-bold break-words">{entry.content}</p>
            {entry.word_metadata?.[0]?.definition && (
              <p className="text-xs sm:text-sm text-gray-600 mt-2 break-words">{entry.word_metadata[0].definition}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-base sm:text-lg italic break-words">"{entry.content}"</p>
            {entry.quote_metadata?.[0]?.author && (
              <p className="text-xs sm:text-sm text-gray-600 mt-2">— {entry.quote_metadata[0].author}</p>
            )}
          </>
        )}
        <p className="text-xs text-gray-400 mt-2 sm:mt-3">{new Date(entry.created_at).toLocaleDateString()}</p>
      </div>
    </Link>
  );
}
