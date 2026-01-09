'use client';

import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';
import ThemeSwitcher from './ThemeSwitcher';

export default function Navigation() {
  return (
    <nav className="border-b border-black dark:border-[#333333] bg-white dark:bg-[#000000] sticky top-0 z-40">
      <div className="w-full">
        {/* App Name - Left aligned to margin */}
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-lg sm:text-xl font-bold text-black dark:text-[#ffffff] hover:text-gray-700 dark:hover:text-[#e5e5e5]">
                QOTD & WOD
              </Link>
              <span className="text-xs text-gray-700 dark:text-[#b0b0b0] font-mono ml-2 sm:ml-3" key={APP_VERSION}>v{APP_VERSION}</span>
            </div>
            <ThemeSwitcher />
          </div>
        </div>
        
        {/* Navigation Menu - Centered */}
        <div className="flex justify-center pb-2 sm:pb-3">
          <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <Link
              href="/"
              className="text-black dark:text-[#ffffff] hover:text-gray-700 dark:hover:text-[#e5e5e5] font-semibold text-sm sm:text-base py-1"
            >
              Home
            </Link>
            <Link
              href="/entries"
              className="text-black dark:text-[#ffffff] hover:text-gray-700 dark:hover:text-[#e5e5e5] font-semibold text-sm sm:text-base py-1"
            >
              All Entries
            </Link>
            <Link
              href="/calendar"
              className="text-black dark:text-[#ffffff] hover:text-gray-700 dark:hover:text-[#e5e5e5] font-semibold text-sm sm:text-base py-1"
            >
              Calendar
            </Link>
            <Link
              href="/competition"
              className="text-black dark:text-[#ffffff] hover:text-gray-700 dark:hover:text-[#e5e5e5] font-semibold text-sm sm:text-base py-1"
            >
              Competition
            </Link>
            <Link
              href="/entries/new"
              className="text-blue-700 dark:text-[#3b82f6] hover:text-blue-900 dark:hover:text-[#60a5fa] font-semibold text-sm sm:text-base py-1"
            >
              New Entry
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

