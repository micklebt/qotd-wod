'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const WordPractice = dynamic(() => import('./WordPractice'), {
  ssr: false,
  loading: () => <span className="text-sm text-gray-500 dark:text-gray-400">Loading…</span>,
});

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
        className="bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 font-bold px-3 sm:px-4 py-2 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800 border border-yellow-700 dark:border-yellow-300 text-sm sm:text-base transition-colors"
      >
        Problem Words
      </button>
      <WordPractice isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}


