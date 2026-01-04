import Link from 'next/link';
import { Entry } from '@/lib/supabase';
import { getParticipantName } from '@/lib/participants';

export default function EntryCard({ entry }: { entry: Entry }) {
  return (
    <Link href={`/entries/${entry.id}`}>
      <div className="border-2 border-black dark:border-[#333333] rounded p-3 sm:p-4 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] cursor-pointer active:bg-gray-200 dark:active:bg-[#1a1a1a] transition-colors bg-white dark:bg-[#0a0a0a]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
          <p className="text-xs sm:text-sm text-black dark:text-[#b0b0b0] font-semibold">{entry.type === 'word' ? 'Word of the Day' : 'Quote of the Day'}</p>
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
        <p className="text-xs text-black dark:text-[#b0b0b0] font-semibold mt-2 sm:mt-3">{new Date(entry.created_at).toLocaleDateString()}</p>
      </div>
    </Link>
  );
}
