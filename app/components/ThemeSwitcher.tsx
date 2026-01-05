'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useState, useEffect, useCallback } from 'react';

export default function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (resolvedTheme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, [resolvedTheme, setTheme]);

  useEffect(() => {
    // Prevent hydration mismatch - this is a valid pattern for Next.js
    // @ts-ignore - React Compiler warning is a false positive here
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="w-5 h-5 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>
    );
  }

  return (
    <button
      onClick={cycleTheme}
      className="group relative w-10 h-10 p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all active:scale-95"
      aria-label={`Switch theme (current: ${theme})`}
      title={`Current: ${theme} (Click to change)`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Sun Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-5 h-5 absolute transition-all duration-300 ${
            resolvedTheme === 'light' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364 6.364l-1.577 1.577M21 12h-2.25m-4.243 5.364l-1.577-1.577M12 18.75V21m-4.243-4.243l-1.577 1.577M3 12h2.25m4.243-4.243L7.5 6.136M12 5.25V3m4.243 4.243l1.577-1.577M18.75 12H21m-4.243 4.243l-1.577 1.577"
          />
        </svg>

        {/* Moon Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-5 h-5 absolute transition-all duration-300 ${
            resolvedTheme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      </div>
      
      {/* Indicator for 'system' theme */}
      {theme === 'system' && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent-blue rounded-full border-2 border-white dark:border-gray-950" />
      )}
    </button>
  );
}
