/**
 * Sanitizes cell string values from XLSX imports to prevent formula injection.
 * Strips leading characters that spreadsheet applications interpret as formulas.
 */
export function sanitizeXlsxCellValue(value: string): string {
  if (!value || typeof value !== 'string') return '';

  // Strip HTML/XML tags to prevent XSS when rendering imported values
  let cleaned = value.trim().replace(/<[^>]*>/g, '');

  // Strip formula injection prefixes: =, +, -, @, |, \t, \r, \n
  if (/^[=+\-@|]/.test(cleaned)) {
    cleaned = cleaned.replace(/^[=+\-@|]+/, '').trim();
  }

  return cleaned;
}

/**
 * Validates imported attendance values from XLSX to prevent impossible data.
 */
export function validateImportedAttendance(attended: number, delivered: number): {
  valid: boolean;
  error?: string;
} {
  if (typeof attended !== 'number' || typeof delivered !== 'number') {
    return { valid: false, error: 'Attendance values must be numbers.' };
  }

  if (Number.isNaN(attended) || Number.isNaN(delivered)) {
    return { valid: false, error: 'Attendance values cannot be NaN.' };
  }

  if (!Number.isFinite(attended) || !Number.isFinite(delivered)) {
    return { valid: false, error: 'Attendance values must be finite numbers.' };
  }

  if (attended < 0 || delivered < 0) {
    return { valid: false, error: 'Attendance values cannot be negative.' };
  }

  if (attended > delivered) {
    return { valid: false, error: 'Attended cannot exceed delivered.' };
  }

  if (delivered > 10000) {
    return { valid: false, error: 'Delivered count exceeds reasonable limit.' };
  }

  return { valid: true };
}
