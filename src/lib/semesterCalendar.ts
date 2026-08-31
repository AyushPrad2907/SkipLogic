import { DayOfWeek } from '@/types';

export interface SemesterConfigInput {
  name: string;
  startDate: string;
  endDate: string;
  targetThreshold: number;
  workingDays: DayOfWeek[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface HolidayInput {
  id?: string;
  semesterId?: string;
  date: string;
  name?: string | null;
  description?: string | null;
}

export interface HolidayValidationResult {
  isValid: boolean;
  error?: string;
}

export type HolidayConflictType =
  | 'NON_WORKING_DAY'
  | 'WORKING_DAY_EXCLUSION'
  | 'TODAY_HOLIDAY'
  | 'PAST_HOLIDAY'
  | 'OUTSIDE_SEMESTER';

export interface HolidayConflictAnalysis {
  holidayId?: string;
  date: string;
  name: string;
  dayOfWeek: DayOfWeek;
  isWorkingDay: boolean;
  isPast: boolean;
  isToday: boolean;
  isInsideSemester: boolean;
  conflictType: HolidayConflictType;
  message: string;
}

export interface SemesterCalendarSummary {
  startDate: string;
  endDate: string;
  totalCalendarDays: number;
  configuredWorkingDaysCount: number;
  configuredHolidaysCount: number;
  holidaysInSemesterCount: number;
  estimatedWorkingDays: number;
  upcomingExcludedDates: string[];
  conflicts: HolidayConflictAnalysis[];
}

const WEEKDAYS_MAP: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

/**
 * Parses YYYY-MM-DD string into local midnight Date object without timezone shift.
 */
export function parseLocalDateString(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date(NaN);
  }
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) {
    return new Date(NaN);
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return new Date(NaN);
  }
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Formats a Date object into YYYY-MM-DD string using local calendar numbers.
 */
export function formatLocalDateString(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Strictly checks if a date string is a valid YYYY-MM-DD calendar date.
 */
export function isValidISODateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const date = parseLocalDateString(dateStr);
  if (Number.isNaN(date.getTime())) return false;

  const [y, m, d] = dateStr.split('-').map(Number);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

/**
 * Returns DayOfWeek enum string for a given YYYY-MM-DD date.
 */
export function getDayOfWeekFromDateString(dateStr: string): DayOfWeek {
  const date = parseLocalDateString(dateStr);
  if (Number.isNaN(date.getTime())) return 'MONDAY';
  return WEEKDAYS_MAP[date.getDay()];
}

/**
 * Validates semester configuration rules.
 */
export function validateSemesterConfig(input: SemesterConfigInput): ValidationResult {
  const errors: string[] = [];

  if (!input.name || !input.name.trim()) {
    errors.push('Semester name is required.');
  }

  if (!isValidISODateString(input.startDate)) {
    errors.push('Start date must be a valid date in YYYY-MM-DD format.');
  }

  if (!isValidISODateString(input.endDate)) {
    errors.push('End date must be a valid date in YYYY-MM-DD format.');
  }

  if (
    isValidISODateString(input.startDate) &&
    isValidISODateString(input.endDate)
  ) {
    if (input.startDate > input.endDate) {
      errors.push('Start date must be on or before end date.');
    }
  }

  if (
    typeof input.targetThreshold !== 'number' ||
    Number.isNaN(input.targetThreshold) ||
    input.targetThreshold <= 0 ||
    input.targetThreshold > 100
  ) {
    errors.push('Attendance threshold must be greater than 0 and less than or equal to 100.');
  }

  if (!input.workingDays || input.workingDays.length === 0) {
    errors.push('Select at least one working day.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates holiday input against semester boundaries and existing holidays.
 */
export function validateHolidayInput(
  holidayDate: string,
  semesterStartDate: string,
  semesterEndDate: string,
  existingHolidays: (HolidayInput | string)[],
  currentHolidayId?: string
): HolidayValidationResult {
  if (!isValidISODateString(holidayDate)) {
    return { isValid: false, error: 'Holiday date must be a valid date in YYYY-MM-DD format.' };
  }

  if (!isValidISODateString(semesterStartDate) || !isValidISODateString(semesterEndDate)) {
    return { isValid: false, error: 'Active semester dates are invalid.' };
  }

  if (holidayDate < semesterStartDate || holidayDate > semesterEndDate) {
    return { isValid: false, error: 'Holiday must fall within the active semester dates.' };
  }

  // Duplicate date check
  const isDuplicate = existingHolidays.some((h) => {
    if (typeof h === 'string') {
      return h === holidayDate;
    }
    if (currentHolidayId && h.id === currentHolidayId) {
      return false;
    }
    return h.date === holidayDate;
  });

  if (isDuplicate) {
    return { isValid: false, error: 'Holiday for this date already exists.' };
  }

  return { isValid: true };
}

/**
 * Analyzes a holiday for calendar conflicts and informational state.
 */
export function analyzeHolidayConflict(
  holiday: HolidayInput | string,
  startDate: string,
  endDate: string,
  workingDays: DayOfWeek[],
  currentDateStr?: string
): HolidayConflictAnalysis {
  const dateStr = typeof holiday === 'string' ? holiday : holiday.date;
  const name = typeof holiday === 'string' ? 'Holiday' : holiday.name || holiday.description || 'Holiday';
  const holidayId = typeof holiday === 'string' ? undefined : holiday.id;

  const today = currentDateStr || formatLocalDateString(new Date());

  const dayOfWeek = getDayOfWeekFromDateString(dateStr);
  const isWorkingDay = workingDays.includes(dayOfWeek);
  const isInsideSemester = dateStr >= startDate && dateStr <= endDate;
  const isPast = dateStr < today;
  const isToday = dateStr === today;

  let conflictType: HolidayConflictType = 'WORKING_DAY_EXCLUSION';
  let message = 'This holiday will exclude scheduled classes from future predictions for this date.';

  if (!isInsideSemester) {
    conflictType = 'OUTSIDE_SEMESTER';
    message = 'Holiday falls outside active semester boundaries.';
  } else if (isToday) {
    conflictType = 'TODAY_HOLIDAY';
    message = 'Today is a holiday.';
  } else if (!isWorkingDay) {
    conflictType = 'NON_WORKING_DAY';
    message = 'This holiday falls on a configured non-working day and may not affect projected classes.';
  } else if (isPast) {
    conflictType = 'PAST_HOLIDAY';
    message = 'Past holiday (historical exclusion).';
  } else {
    conflictType = 'WORKING_DAY_EXCLUSION';
    message = 'This holiday will exclude scheduled classes from future predictions for this date.';
  }

  return {
    holidayId,
    date: dateStr,
    name,
    dayOfWeek,
    isWorkingDay,
    isPast,
    isToday,
    isInsideSemester,
    conflictType,
    message,
  };
}

/**
 * Computes semester calendar summary including total days, working days, and holiday exclusions.
 */
export function calculateSemesterCalendarSummary(
  startDate: string,
  endDate: string,
  workingDays: DayOfWeek[],
  holidays: (HolidayInput | string)[],
  currentDateStr?: string
): SemesterCalendarSummary {
  const today = currentDateStr || formatLocalDateString(new Date());

  if (
    !isValidISODateString(startDate) ||
    !isValidISODateString(endDate) ||
    startDate > endDate
  ) {
    return {
      startDate,
      endDate,
      totalCalendarDays: 0,
      configuredWorkingDaysCount: workingDays.length,
      configuredHolidaysCount: holidays.length,
      holidaysInSemesterCount: 0,
      estimatedWorkingDays: 0,
      upcomingExcludedDates: [],
      conflicts: [],
    };
  }

  const holidayDateSet = new Set<string>();
  const conflicts: HolidayConflictAnalysis[] = [];

  for (const h of holidays) {
    const dStr = typeof h === 'string' ? h : h.date;
    if (isValidISODateString(dStr)) {
      holidayDateSet.add(dStr);
      conflicts.push(analyzeHolidayConflict(h, startDate, endDate, workingDays, today));
    }
  }

  let totalCalendarDays = 0;
  let estimatedWorkingDays = 0;
  let holidaysInSemesterCount = 0;

  const start = parseLocalDateString(startDate);
  const end = parseLocalDateString(endDate);

  const curr = new Date(start);
  while (curr <= end) {
    totalCalendarDays++;
    const currStr = formatLocalDateString(curr);
    const dayOfWeek = getDayOfWeekFromDateString(currStr);
    const isWorkingDay = workingDays.includes(dayOfWeek);
    const isHoliday = holidayDateSet.has(currStr);

    if (isHoliday) {
      holidaysInSemesterCount++;
    }

    if (isWorkingDay && !isHoliday) {
      estimatedWorkingDays++;
    }

    curr.setDate(curr.getDate() + 1);
  }

  // Upcoming excluded dates (holidays on working days on or after today)
  const upcomingExcludedDates = conflicts
    .filter((c) => c.isInsideSemester && c.isWorkingDay && !c.isPast)
    .map((c) => c.date)
    .sort();

  return {
    startDate,
    endDate,
    totalCalendarDays,
    configuredWorkingDaysCount: workingDays.length,
    configuredHolidaysCount: holidays.length,
    holidaysInSemesterCount,
    estimatedWorkingDays,
    upcomingExcludedDates,
    conflicts,
  };
}
