/**
 * Centralized logging utility for consistent error handling and debugging.
 *
 * This provides a consistent interface for logging across the application,
 * making it easy to control log levels and potentially integrate with
 * external logging services in the future.
 */

// Log levels available: 'debug' | 'info' | 'warn' | 'error'

interface LogOptions {
  /** Additional context to include with the log */
  context?: Record<string, unknown>;
  /** Whether this is an expected/normal error (e.g., API key not configured) */
  expected?: boolean;
}

/**
 * Check if we're in development mode
 */
const isDev = process.env.NODE_ENV === 'development';

/**
 * Format a log message with optional context
 */
function formatMessage(message: string, options?: LogOptions): string {
  if (options?.context) {
    return `${message} ${JSON.stringify(options.context)}`;
  }
  return message;
}

/**
 * Centralized logger with consistent formatting and level control
 */
export const logger = {
  /**
   * Debug-level logging (only in development)
   */
  debug(message: string, options?: LogOptions): void {
    if (isDev) {
      console.log(`[DEBUG] ${formatMessage(message, options)}`);
    }
  },

  /**
   * Info-level logging
   */
  info(message: string, options?: LogOptions): void {
    console.log(`[INFO] ${formatMessage(message, options)}`);
  },

  /**
   * Warning-level logging for recoverable issues
   */
  warn(message: string, options?: LogOptions): void {
    if (options?.expected) {
      // Expected warnings (like missing API keys) are only shown in dev
      if (isDev) {
        console.warn(`[WARN] ${formatMessage(message, options)}`);
      }
    } else {
      console.warn(`[WARN] ${formatMessage(message, options)}`);
    }
  },

  /**
   * Error-level logging for failures
   */
  error(message: string, error?: unknown, options?: LogOptions): void {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message }
      : error;

    if (options?.expected) {
      // Expected errors are only shown in dev
      if (isDev) {
        console.error(`[ERROR] ${formatMessage(message, options)}`, errorDetails);
      }
    } else {
      console.error(`[ERROR] ${formatMessage(message, options)}`, errorDetails);
    }
  },

  /**
   * Log API call results (useful for debugging external API integrations)
   */
  apiCall(service: string, success: boolean, details?: Record<string, unknown>): void {
    if (isDev) {
      const status = success ? 'SUCCESS' : 'FAILED';
      console.log(`[API] ${service}: ${status}`, details || '');
    }
  },
};

export default logger;
