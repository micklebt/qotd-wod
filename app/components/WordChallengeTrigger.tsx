'use client';

import { useState } from 'react';
import WordChallenge from './WordChallenge';

export default function WordChallengeTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-green-600 text-white font-semibold px-4 py-2 rounded hover:bg-green-700 transition-colors"
      >
        Word Challenge
      </button>
      <WordChallenge isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

