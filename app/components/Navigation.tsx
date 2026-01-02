import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';

export default function Navigation() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-gray-700">
              QOTD & WOD
            </Link>
            <span className="text-xs text-gray-500 font-mono">v{APP_VERSION}</span>
          </div>
          <div className="flex gap-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Home
            </Link>
            <Link
              href="/entries"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              All Entries
            </Link>
            <Link
              href="/calendar"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Calendar
            </Link>
            <Link
              href="/entries/new"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              New Entry
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

