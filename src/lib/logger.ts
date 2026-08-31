import { sanitizeErrorMessage } from './errors';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /authorization/i,
  /bearer/i,
  /jwt/i,
  /gemini/i,
  /supabase[_-]?(key|secret)/i,
];

/**
 * Recursively redacts sensitive fields and values from log context payloads.
 */
export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return sanitizeErrorMessage(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const redactedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const isSensitiveKey = SECRET_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        redactedObj[key] = '[REDACTED]';
      } else {
        redactedObj[key] = redactSensitiveData(value);
      }
    }
    return redactedObj;
  }

  return data;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const cleanMessage = sanitizeErrorMessage(message);
    const cleanContext = context ? (redactSensitiveData(context) as Record<string, unknown>) : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: cleanMessage,
      context: cleanContext,
    };

    if (level === 'error') {
      console.error(`[${entry.timestamp}] [ERROR] ${entry.message}`, cleanContext || '');
    } else if (level === 'warn') {
      console.warn(`[${entry.timestamp}] [WARN] ${entry.message}`, cleanContext || '');
    } else if (level === 'info') {
      console.info(`[${entry.timestamp}] [INFO] ${entry.message}`, cleanContext || '');
    } else if (this.isDevelopment) {
      console.debug(`[${entry.timestamp}] [DEBUG] ${entry.message}`, cleanContext || '');
    }
  }

  public debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  public info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  public warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  public error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
