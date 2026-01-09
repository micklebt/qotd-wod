'use client';

import { useState } from 'react';
import WordChallenge from './WordChallenge';

export default function WordChallengeTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 font-bold px-3 sm:px-4 py-2 rounded hover:bg-green-200 dark:hover:bg-green-800 border border-green-700 dark:border-green-300 text-sm sm:text-base transition-colors"
      >
        Flash Cards
      </button>
      <WordChallenge isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

