import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';

export default function Navigation() {
  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        {/* Heading Row */}
        <div className="flex items-center mb-2 sm:mb-0">
          <Link href="/" className="text-lg sm:text-xl font-bold text-gray-900 hover:text-gray-700">
            QOTD & WOD
          </Link>
          <span className="text-xs text-gray-500 font-mono hidden sm:inline ml-2 sm:ml-3">v{APP_VERSION}</span>
        </div>
        
        {/* Navigation Menu - Always on separate line */}
        <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 font-medium text-sm sm:text-base py-1"
          >
            Home
          </Link>
          <Link
            href="/entries"
            className="text-gray-600 hover:text-gray-900 font-medium text-sm sm:text-base py-1"
          >
            All Entries
          </Link>
          <Link
            href="/calendar"
            className="text-gray-600 hover:text-gray-900 font-medium text-sm sm:text-base py-1"
          >
            Calendar
          </Link>
          <Link
            href="/entries/new"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base py-1"
          >
            New Entry
          </Link>
        </div>
      </div>
    </nav>
  );
}

