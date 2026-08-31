import { logger } from './logger';

export interface EnvValidationResult {
  valid: boolean;
  missingVariables: string[];
  warnings: string[];
}

/**
 * Validates client-side environment configuration without exposing secret keys.
 */
export function validateClientEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    missing.push('VITE_SUPABASE_URL');
  }

  if (!supabaseKey) {
    missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  } else if (supabaseKey.includes('service_role')) {
    warnings.push('VITE_SUPABASE_PUBLISHABLE_KEY appears to contain a service_role key!');
  }

  const valid = missing.length === 0;

  if (!valid) {
    logger.error('Client environment configuration is invalid', { missingVariables: missing });
  }

  return {
    valid,
    missingVariables: missing,
    warnings,
  };
}

/**
 * Validates server-side environment variables (such as GEMINI_API_KEY).
 * Redacts actual key values in status logs.
 */
export function validateServerEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey || geminiKey.trim() === '') {
    missing.push('GEMINI_API_KEY');
    warnings.push('GEMINI_API_KEY is not set on the server. AI Attendance Coach will operate in fallback mode.');
  }

  const valid = missing.length === 0;

  if (valid) {
    logger.info('Server environment validation passed: GEMINI_API_KEY is configured [REDACTED]');
  } else {
    logger.warn('Server environment validation notice', { missingVariables: missing });
  }

  return {
    valid,
    missingVariables: missing,
    warnings,
  };
}
