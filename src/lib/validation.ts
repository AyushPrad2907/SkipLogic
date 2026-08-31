export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates attendance counters:
 * Enforces 0 <= attended <= delivered and non-negative integers.
 */
export function validateAttendanceCounts(attended: number, delivered: number): ValidationResult {
  if (typeof attended !== 'number' || typeof delivered !== 'number') {
    return { valid: false, error: 'Attended and delivered counts must be numbers.' };
  }

  if (Number.isNaN(attended) || Number.isNaN(delivered)) {
    return { valid: false, error: 'Attended and delivered counts cannot be NaN.' };
  }

  if (attended < 0 || delivered < 0) {
    return { valid: false, error: 'Attendance counts cannot be negative.' };
  }

  if (attended > delivered) {
    return { valid: false, error: 'Attended classes cannot exceed total delivered classes.' };
  }

  return { valid: true };
}

/**
 * Validates semester target threshold:
 * Enforces strictly 0 < threshold <= 100.
 */
export function validateSemesterThreshold(threshold: number): ValidationResult {
  if (typeof threshold !== 'number' || Number.isNaN(threshold)) {
    return { valid: false, error: 'Target threshold must be a valid number.' };
  }

  if (threshold <= 0 || threshold > 100) {
    return { valid: false, error: 'Target threshold must be greater than 0% and at most 100%.' };
  }

  return { valid: true };
}

/**
 * Validates semester date boundaries:
 * Enforces startDate <= endDate (YYYY-MM-DD format).
 */
export function validateDateRange(startDate: string, endDate: string): ValidationResult {
  if (!startDate || !endDate) {
    return { valid: false, error: 'Start date and end date are required.' };
  }

  if (startDate > endDate) {
    return { valid: false, error: 'Semester start date cannot be after end date.' };
  }

  return { valid: true };
}

/**
 * Validates subject input:
 * Enforces non-empty name and valid optional threshold.
 */
export function validateSubjectInput(name: string, code?: string, threshold?: number): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Subject name is required.' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'Subject name cannot exceed 100 characters.' };
  }

  if (code && code.length > 20) {
    return { valid: false, error: 'Course code cannot exceed 20 characters.' };
  }

  if (threshold !== undefined) {
    const threshRes = validateSemesterThreshold(threshold);
    if (!threshRes.valid) return threshRes;
  }

  return { valid: true };
}

/**
 * Validates timetable slot times:
 * Enforces valid "HH:MM" format and startTime < endTime.
 */
export function validateTimetableSlotInput(startTime: string, endTime: string): ValidationResult {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return { valid: false, error: 'Times must be in HH:MM 24-hour format.' };
  }

  if (startTime >= endTime) {
    return { valid: false, error: 'Class start time must be earlier than end time.' };
  }

  return { valid: true };
}

/**
 * Validates AI Coach user questions:
 * Enforces non-empty and max 1000 characters.
 */
export function validateCoachQuestion(question: string): ValidationResult {
  if (!question || question.trim().length === 0) {
    return { valid: false, error: 'Question cannot be empty.' };
  }

  if (question.length > 1000) {
    return { valid: false, error: 'Question is too long (maximum 1,000 characters).' };
  }

  return { valid: true };
}
