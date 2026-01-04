'use client';

import { useState } from 'react';
import WordChallenge from './WordChallenge';

export default function WordChallengeTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-green-700 dark:bg-[#22c55e] text-white dark:text-[#1a1a1a] font-bold px-3 sm:px-4 py-2 rounded hover:bg-green-800 dark:hover:bg-[#16a34a] border-2 border-green-900 dark:border-[#22c55e] text-sm sm:text-base"
      >
        Word Challenge
      </button>
      <WordChallenge isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

