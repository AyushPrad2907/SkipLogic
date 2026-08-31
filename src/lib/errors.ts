export type ErrorCategory =
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'API_ERROR'
  | 'AI_ERROR'
  | 'IMPORT_ERROR'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR';

export interface AppErrorDetails {
  category: ErrorCategory;
  code: string;
  userMessage: string;
  technicalDetails?: string;
  httpStatus?: number;
}

export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly technicalDetails?: string;
  public readonly httpStatus?: number;

  constructor(details: AppErrorDetails) {
    super(details.userMessage);
    this.name = 'AppError';
    this.category = details.category;
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.technicalDetails = details.technicalDetails;
    this.httpStatus = details.httpStatus || 400;
  }
}

/**
 * Sanitizes error messages by redacting API keys, bearer tokens, connection strings,
 * SQL queries, internal stack paths, and sensitive parameters.
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return 'An unexpected error occurred.';

  let sanitized = message;

  // Redact API keys (e.g. AIza..., AQ.Ab8...)
  sanitized = sanitized.replace(/AQ\.[A-Za-z0-9_-]{20,}/g, '[REDACTED_API_KEY]');
  sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');

  // Redact JWT tokens (eyJhbGci...)
  sanitized = sanitized.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT_TOKEN]');

  // Redact Supabase URL credentials or Postgres strings
  sanitized = sanitized.replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, '[REDACTED_SUPABASE_URL]');
  sanitized = sanitized.replace(/postgres(ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]');

  // Redact file paths (C:\Users\..., /home/..., /Users/...)
  sanitized = sanitized.replace(/([A-Z]:\\[^\s:]+|\/(?:Users|home|var|usr)[^\s:]+)/gi, '[REDACTED_FILE_PATH]');

  // Redact SQL queries and database error details
  if (sanitized.includes('PGRST') || sanitized.includes('postgres') || sanitized.includes('relation "') || sanitized.includes('SELECT') || sanitized.includes('INSERT')) {
    sanitized = 'A database query error occurred. Please try again.';
  }

  return sanitized;
}

/**
 * Normalizes any caught exception into a safe, strongly typed AppError.
 * Ensures production UIs never render raw stack traces, API keys, or SQL errors.
 */
export function normalizeError(err: unknown, fallbackCategory: ErrorCategory = 'UNKNOWN_ERROR'): AppError {
  if (err instanceof AppError) {
    return err;
  }

  const rawMessage = err instanceof Error ? err.message : String(err || '');
  const cleanMessage = sanitizeErrorMessage(rawMessage);

  // Auth errors (check auth/JWT first)
  if (
    rawMessage.includes('JWT') ||
    rawMessage.includes('token') ||
    rawMessage.includes('auth') ||
    rawMessage.includes('unauthorized') ||
    rawMessage.includes('session')
  ) {
    return new AppError({
      category: 'AUTH_ERROR',
      code: 'AUTH_SESSION_EXPIRED',
      userMessage: 'Your authentication session has expired or is invalid. Please sign in again.',
      technicalDetails: cleanMessage,
      httpStatus: 401,
    });
  }

  // Database / Supabase RLS
  if (rawMessage.includes('PGRST') || rawMessage.includes('permission denied') || rawMessage.includes('RLS') || rawMessage.includes('postgres')) {
    return new AppError({
      category: 'DATABASE_ERROR',
      code: 'DB_ACCESS_DENIED',
      userMessage: 'A database query error occurred. Please try again.',
      technicalDetails: cleanMessage,
      httpStatus: 403,
    });
  }

  // AI / Gemini errors
  if (rawMessage.includes('Gemini') || rawMessage.includes('GEMINI_API_KEY') || rawMessage.includes('AI Coach') || rawMessage.includes('API key')) {
    return new AppError({
      category: 'AI_ERROR',
      code: 'AI_SERVICE_UNAVAILABLE',
      userMessage: 'AI Attendance Coach is temporarily unavailable. Please try again in a moment.',
      technicalDetails: cleanMessage,
      httpStatus: 502,
    });
  }

  // Network / Offline errors
  const isBrowserOffline = typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'onLine' in navigator && navigator.onLine === false;

  if (
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.includes('net::ERR_') ||
    isBrowserOffline
  ) {
    return new AppError({
      category: 'NETWORK_ERROR',
      code: 'NETWORK_DISCONNECTED',
      userMessage: 'Unable to connect. Please check your internet connection and try again.',
      technicalDetails: cleanMessage,
      httpStatus: 503,
    });
  }

  return new AppError({
    category: fallbackCategory,
    code: 'UNKNOWN_FAILURE',
    userMessage: cleanMessage || 'An unexpected failure occurred. Please try again.',
    technicalDetails: rawMessage,
    httpStatus: fallbackCategory === 'DATABASE_ERROR' ? 403 : 500,
  });
}
