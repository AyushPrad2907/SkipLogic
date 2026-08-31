import { DayOfWeek } from '@/types';
import { SupportedComponentType } from '@/lib/components.functions';

const DAY_MAP: Record<string, DayOfWeek> = {
  MONDAY: 'MONDAY',
  MON: 'MONDAY',
  M: 'MONDAY',
  TUESDAY: 'TUESDAY',
  TUE: 'TUESDAY',
  TUES: 'TUESDAY',
  TU: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  WED: 'WEDNESDAY',
  W: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  THU: 'THURSDAY',
  THUR: 'THURSDAY',
  THURS: 'THURSDAY',
  TH: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  FRI: 'FRIDAY',
  F: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SAT: 'SATURDAY',
  SA: 'SATURDAY',
  SUNDAY: 'SUNDAY',
  SUN: 'SUNDAY',
  SU: 'SUNDAY',
};

/**
 * Normalizes day of week text to canonical DayOfWeek enum.
 */
export function normalizeDayOfWeek(input?: string | null): DayOfWeek | null {
  if (!input) return null;
  const clean = input.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (DAY_MAP[clean]) return DAY_MAP[clean];

  for (const [key, val] of Object.entries(DAY_MAP)) {
    if (key.length > 2 && clean.startsWith(key)) {
      return val;
    }
  }
  return null;
}

/**
 * Converts Excel numeric time (fraction of a 24h day) to HH:MM string.
 * Example: 0.3958333333333333 -> "09:30"
 */
export function excelTimeToString(serial: number): string {
  let totalMinutes = Math.round(serial * 24 * 60);
  // Handle full date serials
  if (serial > 1) {
    totalMinutes = Math.round((serial % 1) * 24 * 60);
  }
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Parses individual 12h/24h time string like "9:30 AM", "14:30", "9:30" to minutes from midnight.
 */
export function parseSingleTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;

  let s = timeStr.trim().toUpperCase();

  // Reject strings that are period labels, ordinal numbers, or generic text
  if (/PERIOD|DAYS|SLOT|CLASS|ROOM|SEM|RECESS|LUNCH|BREAK/i.test(s)) return null;
  if (/^\d+(?:ST|ND|RD|TH)\b/i.test(s)) return null;

  const isPM = s.includes('PM');
  const isAM = s.includes('AM');
  const hasColon = s.includes(':') || s.includes('.');

  // If there's no colon and no AM/PM, require exact pure digits representing an hour (e.g. "9", "14")
  if (!hasColon && !isAM && !isPM) {
    if (!/^\d{1,2}$/.test(s)) return null;
  }

  s = s.replace(/(AM|PM)/gi, '').trim();
  const parts = s.split(/[:.]/).map((p) => parseInt(p, 10));

  if (parts.some((p) => isNaN(p))) return null;

  let hours = parts[0];
  const minutes = parts[1] || 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight back to HH:MM format.
 */
export function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Normalizes start and end time strings or time range text like "9:30 - 10:30".
 */
export function parseTimeRange(
  startTimeInput?: string | number | null,
  endTimeInput?: string | number | null
): { startTime: string | null; endTime: string | null } {
  // If start is an Excel serial number
  if (typeof startTimeInput === 'number') {
    const s = excelTimeToString(startTimeInput);
    if (typeof endTimeInput === 'number') {
      return { startTime: s, endTime: excelTimeToString(endTimeInput) };
    }
    return { startTime: s, endTime: null };
  }

  const str = (startTimeInput || '').toString().trim();
  if (!str) return { startTime: null, endTime: null };

  // Reject generic non-time headers
  if (/^(DAYS|DAY|PERIOD|PERIODS|SLOT|SLOTS|RECESS|LUNCH|BREAK|FREE|LEGEND)/i.test(str)) {
    return { startTime: null, endTime: null };
  }

  // Check if string contains a range separator ("-", "TO", "TIL", "UNTIL", "–")
  const rangeMatch = str.split(/[-–—]|(?:\s+TO\s+)/i);
  if (rangeMatch.length >= 2) {
    const startMins = parseSingleTimeToMinutes(rangeMatch[0]);
    const endMins = parseSingleTimeToMinutes(rangeMatch[1]);

    if (startMins !== null && endMins !== null) {
      return {
        startTime: minutesToHHMM(startMins),
        endTime: minutesToHHMM(endMins),
      };
    }
  }

  // Parse separate start and end parameters
  const startMins = parseSingleTimeToMinutes(str);
  let endMins = endTimeInput ? parseSingleTimeToMinutes(endTimeInput.toString()) : null;

  // If no end time given, only consider it a time if it has colon or AM/PM
  if (startMins !== null && endMins === null) {
    if (str.includes(':') || str.includes('.') || /AM|PM/i.test(str)) {
      endMins = startMins + 60;
    } else {
      return { startTime: null, endTime: null };
    }
  }

  return {
    startTime: startMins !== null ? minutesToHHMM(startMins) : null,
    endTime: endMins !== null ? minutesToHHMM(endMins) : null,
  };
}

/**
 * Extracts subject code and subject name from a string like "CUCS1002 - Data Structures" or "Data Structures".
 */
export function extractSubjectCodeAndName(input: string): { code?: string; name: string } {
  if (!input) return { name: '' };

  const text = input.trim();
  // Regex to detect codes like CUCS1002, CUTM1018, CS101, ECE-202
  const codeRegex = /\b([A-Z]{2,6}[ -]?[0-9]{3,5}[A-Z]?)\b/i;
  const match = text.match(codeRegex);

  if (match) {
    const code = match[1].replace(/\s+/g, '').toUpperCase();
    let name = text.replace(match[0], '').replace(/^[-:\s()|]+|[-:\s()|]+$/g, '').replace(/\s+/g, ' ').trim();

    // If name became empty, use code as name as fallback
    if (!name) name = code;

    return { code, name };
  }

  return { name: text.replace(/\s+/g, ' ') };
}

/**
 * Normalizes component type and component name.
 * Component keywords: PP, PR, TUT, LAB, THEORY, LECTURE, PRACTICAL, TUTORIAL, SEMINAR, CUSTOM
 */
export function normalizeComponent(
  input?: string | null
): { type: SupportedComponentType; name: string } {
  if (!input) return { type: 'PP', name: 'Theory' };

  const s = input.trim().toUpperCase();

  if (s.includes('PRACTICAL') || /\bPR\b/.test(s) || s.includes('PRACT') || s.includes('PRAC')) {
    return { type: 'PR', name: 'Practical' };
  }

  if (s.includes('LAB') || s.includes('LABORATORY')) {
    return { type: 'LAB', name: 'Lab' };
  }

  if (s.includes('TUTORIAL') || /\bTUT\b/.test(s) || s.includes('TUTR')) {
    return { type: 'TUT', name: 'Tutorial' };
  }

  if (s.includes('LECTURE') || s.includes('THEORY') || /\bPP\b/.test(s) || /\bTH\b/.test(s) || /\bLEC\b/.test(s)) {
    return { type: 'PP', name: 'Theory' };
  }

  if (s.includes('SEMINAR') || s.includes('PROJECT')) {
    return { type: 'CUSTOM', name: input.trim() };
  }

  return { type: 'CUSTOM', name: input.trim() };
}
