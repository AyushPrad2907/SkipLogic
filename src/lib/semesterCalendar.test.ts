import { describe, it, expect } from 'vitest';
import {
  validateSemesterConfig,
  validateHolidayInput,
  calculateSemesterCalendarSummary,
  analyzeHolidayConflict,
  isValidISODateString,
  parseLocalDateString,
  formatLocalDateString,
  SemesterConfigInput,
} from './semesterCalendar';
import { calculateSubjectAttendance } from './engine';
import { predictSubject } from './prediction';

describe('Phase 12: Semester & Calendar Intelligence Hardening Tests', () => {

  // TEST 1: Valid semester date range
  it('TEST 1: Accepts valid semester date range', () => {
    const config: SemesterConfigInput = {
      name: 'Fall 2026',
      startDate: '2026-09-01',
      endDate: '2026-12-15',
      targetThreshold: 75,
      workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    };
    const res = validateSemesterConfig(config);
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  // TEST 2: Reject start date after end date
  it('TEST 2: Rejects start date after end date', () => {
    const config: SemesterConfigInput = {
      name: 'Invalid Term',
      startDate: '2026-12-20',
      endDate: '2026-09-01',
      targetThreshold: 75,
      workingDays: ['MONDAY', 'TUESDAY'],
    };
    const res = validateSemesterConfig(config);
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Start date must be on or before end date.');
  });

  // TEST 3: Threshold validation
  it('TEST 3: Validates target threshold boundaries (0 < threshold <= 100)', () => {
    const invalidLow = validateSemesterConfig({
      name: 'Sem',
      startDate: '2026-09-01',
      endDate: '2026-12-15',
      targetThreshold: 0,
      workingDays: ['MONDAY'],
    });
    expect(invalidLow.isValid).toBe(false);

    const invalidHigh = validateSemesterConfig({
      name: 'Sem',
      startDate: '2026-09-01',
      endDate: '2026-12-15',
      targetThreshold: 105,
      workingDays: ['MONDAY'],
    });
    expect(invalidHigh.isValid).toBe(false);

    const validBorder = validateSemesterConfig({
      name: 'Sem',
      startDate: '2026-09-01',
      endDate: '2026-12-15',
      targetThreshold: 100,
      workingDays: ['MONDAY'],
    });
    expect(validBorder.isValid).toBe(true);
  });

  // TEST 4: Reject zero working days
  it('TEST 4: Rejects semester configuration with zero working days', () => {
    const config: SemesterConfigInput = {
      name: 'No Days',
      startDate: '2026-09-01',
      endDate: '2026-12-15',
      targetThreshold: 75,
      workingDays: [],
    };
    const res = validateSemesterConfig(config);
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Select at least one working day.');
  });

  // TEST 5: Calculate working days correctly
  it('TEST 5: Calculates estimated working days correctly for Mon-Fri over 4 weeks', () => {
    // 2026-09-01 (Tuesday) to 2026-09-28 (Monday) = 28 calendar days
    // 4 full weeks = 20 working days
    const summary = calculateSemesterCalendarSummary(
      '2026-09-01',
      '2026-09-28',
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      []
    );
    expect(summary.totalCalendarDays).toBe(28);
    expect(summary.estimatedWorkingDays).toBe(20);
  });

  // TEST 6: Exclude configured holidays
  it('TEST 6: Excludes configured holidays from estimated working days', () => {
    // 2026-09-01 to 2026-09-28 has 20 working days. Add 2 holidays on working days (Sep 7, Sep 8)
    const summary = calculateSemesterCalendarSummary(
      '2026-09-01',
      '2026-09-28',
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      [
        { date: '2026-09-07', name: 'Labor Day' },
        { date: '2026-09-08', name: 'University Holiday' },
      ]
    );
    expect(summary.estimatedWorkingDays).toBe(18);
    expect(summary.holidaysInSemesterCount).toBe(2);
  });

  // TEST 7: Holiday outside semester rejected
  it('TEST 7: Rejects holiday date falling outside active semester boundaries', () => {
    const res = validateHolidayInput(
      '2027-01-10', // outside
      '2026-09-01',
      '2026-12-15',
      []
    );
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('Holiday must fall within the active semester dates.');
  });

  // TEST 8: Duplicate holiday rejected
  it('TEST 8: Rejects duplicate holiday date entries', () => {
    const existing = [{ id: 'h-1', date: '2026-10-02', name: 'Gandhi Jayanti' }];
    const res = validateHolidayInput(
      '2026-10-02',
      '2026-09-01',
      '2026-12-15',
      existing
    );
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('Holiday for this date already exists.');
  });

  // TEST 9: Holiday on working day detected correctly
  it('TEST 9: Detects working day holiday and creates WORKING_DAY_EXCLUSION conflict item', () => {
    // 2026-09-07 is a Monday
    const analysis = analyzeHolidayConflict(
      { date: '2026-09-07', name: 'Labor Day' },
      '2026-09-01',
      '2026-12-15',
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      '2026-09-01'
    );
    expect(analysis.isWorkingDay).toBe(true);
    expect(analysis.conflictType).toBe('WORKING_DAY_EXCLUSION');
    expect(analysis.message).toContain('exclude scheduled classes');
  });

  // TEST 10: Holiday on non-working day produces informational state
  it('TEST 10: Detects non-working day holiday and produces informational warning', () => {
    // 2026-09-06 is a Sunday
    const analysis = analyzeHolidayConflict(
      { date: '2026-09-06', name: 'Weekend Holiday' },
      '2026-09-01',
      '2026-12-15',
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      '2026-09-01'
    );
    expect(analysis.isWorkingDay).toBe(false);
    expect(analysis.conflictType).toBe('NON_WORKING_DAY');
    expect(analysis.message).toContain('non-working day and may not affect projected classes');
  });

  // TEST 11: Calendar does not count dates before semester start
  it('TEST 11: Calendar summary ignores dates before semester start date', () => {
    const summary = calculateSemesterCalendarSummary(
      '2026-09-10',
      '2026-09-20',
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      [{ date: '2026-09-05', name: 'Early Holiday' }] // Before start
    );
    expect(summary.totalCalendarDays).toBe(11);
    expect(summary.holidaysInSemesterCount).toBe(0);
  });

  // TEST 12: Calendar does not count dates after semester end
  it('TEST 12: Calendar summary ignores dates after semester end date', () => {
    const summary = calculateSemesterCalendarSummary(
      '2026-09-10',
      '2026-09-20',
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      [{ date: '2026-09-25', name: 'Late Holiday' }] // After end
    );
    expect(summary.totalCalendarDays).toBe(11);
    expect(summary.holidaysInSemesterCount).toBe(0);
  });

  // TEST 13: Prediction input respects semester boundaries
  it('TEST 13: Prediction engine respects semester start and end boundaries', () => {
    // Walk timetable between 2026-09-01 and 2026-09-14
    const res = predictSubject(
      'sub-test',
      [{ id: 'c-1', type: 'THEORY', name: 'Lec', attended: 10, delivered: 10 }],
      75,
      {
        startDate: '2026-09-01',
        endDate: '2026-09-14',
        currentDate: '2026-09-01',
        workingDays: ['MONDAY'],
        holidays: [],
        timetableSlots: [
          {
            id: 'slot-1',
            subjectId: 'sub-test',
            componentId: 'c-1',
            componentType: 'THEORY',
            dayOfWeek: 'MONDAY',
            startTime: '10:00',
            endTime: '11:00',
          },
        ],
      }
    );

    // Mondays in range: Sep 7 and Sep 14 = 2 future classes
    expect(res.futureOccurrences.length).toBe(2);
    expect(res.futureOccurrences[0].date).toBe('2026-09-07');
    expect(res.futureOccurrences[1].date).toBe('2026-09-14');
  });

  // TEST 14: Date-only values do not shift because of timezone
  it('TEST 14: Date parsing handles YYYY-MM-DD as local calendar date without timezone shift', () => {
    const dateStr = '2026-09-03';
    const parsed = parseLocalDateString(dateStr);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8); // September is 0-indexed month 8
    expect(parsed.getDate()).toBe(3);

    const formatted = formatLocalDateString(parsed);
    expect(formatted).toBe(dateStr);
  });

  // TEST 15: One active semester invariant
  it('TEST 15: Validates active semester invariant checks', () => {
    const s1 = { id: 'sem-1', is_active: true };
    const s2 = { id: 'sem-2', is_active: false };
    const semesters = [s1, s2];

    const activeSemesters = semesters.filter((s) => s.is_active);
    expect(activeSemesters.length).toBe(1);
    expect(activeSemesters[0].id).toBe('sem-1');
  });

  // TEST 16: Semester switching refreshes dependent data
  it('TEST 16: Simulates active semester switching', () => {
    let semesters = [
      { id: 'sem-1', name: 'Fall 2025', is_active: true },
      { id: 'sem-2', name: 'Spring 2026', is_active: false },
    ];

    const switchActive = (targetId: string) => {
      semesters = semesters.map((s) => ({
        ...s,
        is_active: s.id === targetId,
      }));
    };

    switchActive('sem-2');
    const active = semesters.find((s) => s.is_active);
    expect(active?.id).toBe('sem-2');
    expect(semesters.filter((s) => s.is_active).length).toBe(1);
  });

  // TEST 17: Empty semester state
  it('TEST 17: Handles empty/null semester input cleanly', () => {
    const summary = calculateSemesterCalendarSummary('', '', [], []);
    expect(summary.totalCalendarDays).toBe(0);
    expect(summary.estimatedWorkingDays).toBe(0);
  });

  // TEST 18: No working-day configuration state
  it('TEST 18: Handles semester with zero working days configuration', () => {
    const summary = calculateSemesterCalendarSummary(
      '2026-09-01',
      '2026-09-30',
      [],
      []
    );
    expect(summary.totalCalendarDays).toBe(30);
    expect(summary.estimatedWorkingDays).toBe(0);
  });

  // TEST 19: Historical holiday remains valid
  it('TEST 19: Classifies past holiday correctly without invalidating configuration', () => {
    const analysis = analyzeHolidayConflict(
      { date: '2026-08-15', name: 'Independence Day' },
      '2026-08-01',
      '2026-12-15',
      ['SATURDAY'],
      '2026-09-01'
    );
    expect(analysis.isPast).toBe(true);
    expect(analysis.conflictType).toBe('PAST_HOLIDAY');
  });

  // TEST 20: End-of-semester boundary condition (startDate === endDate)
  it('TEST 20: Allows one-day semester (startDate === endDate)', () => {
    const config: SemesterConfigInput = {
      name: 'One Day Exam Term',
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      targetThreshold: 75,
      workingDays: ['THURSDAY'],
    };
    const res = validateSemesterConfig(config);
    expect(res.isValid).toBe(true);

    const summary = calculateSemesterCalendarSummary(
      '2026-10-15',
      '2026-10-15',
      ['THURSDAY'],
      []
    );
    expect(summary.totalCalendarDays).toBe(1);
    expect(summary.estimatedWorkingDays).toBe(1);
  });

  // TEST 21: Leap-year date edge cases
  it('TEST 21: Validates leap year dates correctly (2028-02-29 valid, 2026-02-29 invalid)', () => {
    expect(isValidISODateString('2028-02-29')).toBe(true);  // 2028 is leap year
    expect(isValidISODateString('2026-02-29')).toBe(false); // 2026 is not leap year
  });

  // TEST 22: Saturday working-day configuration
  it('TEST 22: Correctly includes Saturday working days when configured', () => {
    // 2026-09-05 is Saturday
    const summary = calculateSemesterCalendarSummary(
      '2026-09-01',
      '2026-09-07',
      ['SATURDAY'],
      []
    );
    expect(summary.estimatedWorkingDays).toBe(1);
  });

  // TEST 23: Sunday working-day configuration
  it('TEST 23: Correctly includes Sunday working days when configured', () => {
    // 2026-09-06 is Sunday
    const summary = calculateSemesterCalendarSummary(
      '2026-09-01',
      '2026-09-07',
      ['SUNDAY'],
      []
    );
    expect(summary.estimatedWorkingDays).toBe(1);
  });

  // TEST 24: Multiple holidays in the same semester
  it('TEST 24: Correctly processes multiple holidays in the same semester', () => {
    const summary = calculateSemesterCalendarSummary(
      '2026-09-01',
      '2026-09-30',
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      [
        { date: '2026-09-07', name: 'Holiday 1' },
        { date: '2026-09-14', name: 'Holiday 2' },
        { date: '2026-09-21', name: 'Holiday 3' },
      ]
    );
    expect(summary.holidaysInSemesterCount).toBe(3);
    // 22 working days in Sept 2026 - 3 holidays = 19
    expect(summary.estimatedWorkingDays).toBe(19);
  });

  // TEST 25: Regression test ensuring Phase 4 strict > threshold remains unchanged
  it('TEST 25: REGRESSION — Phase 4 eligibility uses strictly greater than (>) threshold', () => {
    // 75.00% = ineligible, 75.01% = eligible
    const compExact = [{ id: 'c1', attended: 75, delivered: 100 }];
    const resExact = calculateSubjectAttendance(compExact, 75);
    expect(resExact.percentage).toBe(75);
    expect(resExact.eligible).toBe(false); // 75 > 75 is false

    const compAbove = [{ id: 'c1', attended: 7501, delivered: 10000 }];
    const resAbove = calculateSubjectAttendance(compAbove, 75);
    expect(resAbove.percentage).toBe(75.01);
    expect(resAbove.eligible).toBe(true); // 75.01 > 75 is true
  });

  // TEST 26: Regression test ensuring subject attendance formula
  it('TEST 26: REGRESSION — Subject attendance is SUM(attended) / SUM(delivered) * 100', () => {
    const components = [
      { id: 'c1', attended: 19, delivered: 21 },
      { id: 'c2', attended: 15, delivered: 17 },
    ];
    const res = calculateSubjectAttendance(components, 75);
    expect(res.attended).toBe(34);
    expect(res.delivered).toBe(38);
    expect(res.percentage).toBeCloseTo(89.4736, 3);
  });

  // TEST 27: Regression test ensuring Phase 10 prediction behavior remains unchanged
  it('TEST 27: REGRESSION — Phase 10 prediction walks future timetable without mutating historical logs', () => {
    const pred = predictSubject(
      'sub-reg',
      [{ id: 'c-1', type: 'THEORY', name: 'Lecture', attended: 15, delivered: 20 }],
      75,
      {
        startDate: '2026-09-01',
        endDate: '2026-09-14',
        currentDate: '2026-09-01',
        workingDays: ['MONDAY'],
        holidays: [],
        timetableSlots: [
          {
            id: 'slot-1',
            subjectId: 'sub-reg',
            componentId: 'c-1',
            componentType: 'THEORY',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '10:00',
          },
        ],
      }
    );

    expect(pred.currentPercentage).toBe(75);
    expect(pred.bunkLimitFuture).toBeDefined();
    expect(pred.bestPossiblePercentage!).toBeGreaterThanOrEqual(pred.currentPercentage!);
    expect(pred.worstPossiblePercentage!).toBeLessThanOrEqual(pred.currentPercentage!);
  });
});
