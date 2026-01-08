'use client';

import { useState, useEffect } from 'react';
import WordPractice from './WordPractice';

export default function WordPracticeTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpenPractice = () => {
      setIsOpen(true);
    };

    window.addEventListener('openWordPractice', handleOpenPractice);
    return () => {
      window.removeEventListener('openWordPractice', handleOpenPractice);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-accent-blue text-white font-bold px-3 sm:px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 border border-blue-900 dark:border-blue-300 text-sm sm:text-base"
      >
        Practice Words
      </button>
      <WordPractice isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}


