'use client';

import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';
import ThemeSwitcher from './ThemeSwitcher';

export default function Navigation() {
  return (
    <nav className="border-b border-black dark:border-white bg-white dark:bg-black sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        {/* Heading Row */}
        <div className="flex items-center justify-between mb-2 sm:mb-0">
          <div className="flex items-center">
            <Link href="/" className="text-lg sm:text-xl font-bold text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300">
              QOTD & WOD
            </Link>
            <span className="text-xs text-gray-700 dark:text-gray-300 font-mono hidden sm:inline ml-2 sm:ml-3">v{APP_VERSION}</span>
          </div>
          <ThemeSwitcher />
        </div>
        
        {/* Navigation Menu - Always on separate line */}
        <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          <Link
            href="/"
            className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 font-semibold text-sm sm:text-base py-1"
          >
            Home
          </Link>
          <Link
            href="/entries"
            className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 font-semibold text-sm sm:text-base py-1"
          >
            All Entries
          </Link>
          <Link
            href="/calendar"
            className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 font-semibold text-sm sm:text-base py-1"
          >
            Calendar
          </Link>
          <Link
            href="/entries/new"
            className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-semibold text-sm sm:text-base py-1"
          >
            New Entry
          </Link>
        </div>
      </div>
    </nav>
  );
}

