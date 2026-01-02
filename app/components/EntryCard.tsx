import Link from 'next/link';
import { Entry } from '@/lib/supabase';
import { getParticipantName } from '@/lib/participants';

export default function EntryCard({ entry }: { entry: Entry }) {
  return (
    <Link href={`/entries/${entry.id}`}>
      <div className="border border-gray-300 rounded p-4 hover:bg-gray-50 cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm text-gray-500">{entry.type === 'word' ? 'Word of the Day' : 'Quote of the Day'}</p>
          <p className="text-xs text-gray-400">{getParticipantName(entry.submitted_by_user_id)}</p>
        </div>
        {entry.type === 'word' ? (
          <>
            <p className="text-2xl font-bold">{entry.content}</p>
            {entry.word_metadata?.[0]?.definition && (
              <p className="text-sm text-gray-600 mt-2">{entry.word_metadata[0].definition}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-lg italic">"{entry.content}"</p>
            {entry.quote_metadata?.[0]?.author && (
              <p className="text-sm text-gray-600 mt-2">— {entry.quote_metadata[0].author}</p>
            )}
          </>
        )}
        <p className="text-xs text-gray-400 mt-3">{new Date(entry.created_at).toLocaleDateString()}</p>
      </div>
    </Link>
  );
}
