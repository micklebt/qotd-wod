'use client';

import { useState } from 'react';
import WordChallenge from './WordChallenge';

export default function WordChallengeTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-green-700 dark:bg-green-500 text-white font-bold px-3 sm:px-4 py-2 rounded hover:bg-green-800 dark:hover:bg-green-600 border-2 border-green-900 dark:border-green-300 text-sm sm:text-base"
      >
        Word Challenge
      </button>
      <WordChallenge isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

