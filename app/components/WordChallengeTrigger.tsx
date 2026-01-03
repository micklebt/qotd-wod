'use client';

import { useState } from 'react';
import WordChallenge from './WordChallenge';

export default function WordChallengeTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-green-700 dark:bg-[#3fb950] text-white dark:text-[#0d1117] font-bold px-3 sm:px-4 py-2 rounded hover:bg-green-800 dark:hover:bg-[#2ea043] border-2 border-green-900 dark:border-[#3fb950] text-sm sm:text-base"
      >
        Word Challenge
      </button>
      <WordChallenge isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

