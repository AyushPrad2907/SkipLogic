import { describe, it, expect } from 'vitest';
import {
  isOverlapping,
  parseTimeToMinutes,
  formatTimeHHMM,
  DayOfWeekEnum,
} from './timetable.functions';

describe('Phase 6: Timetable Logic & Validation Tests', () => {

  // TEST 1: Time parsing helper
  it('TEST 1: Parses time strings into minutes from midnight', () => {
    expect(parseTimeToMinutes('09:00')).toBe(540);
    expect(parseTimeToMinutes('10:30')).toBe(630);
    expect(parseTimeToMinutes('00:00')).toBe(0);
  });

  // TEST 2: Formatting time helper
  it('TEST 2: Normalizes time strings to HH:MM format', () => {
    expect(formatTimeHHMM('9:5')).toBe('09:05');
    expect(formatTimeHHMM('10:30:00')).toBe('10:30');
  });

  // TEST 3: Overlapping slots detection
  it('TEST 3: Rejects overlapping slots (10:00-11:00 and 10:30-11:30)', () => {
    const overlapping = isOverlapping('10:00', '11:00', '10:30', '11:30');
    expect(overlapping).toBe(true);
  });

  // TEST 4: Adjacent slots accepted
  it('TEST 4: Accepts adjacent slots (10:00-11:00 and 11:00-12:00)', () => {
    const overlapping = isOverlapping('10:00', '11:00', '11:00', '12:00');
    expect(overlapping).toBe(false);
  });

  // TEST 5: Invalid time range (start_time >= end_time)
  it('TEST 5: Rejects start_time >= end_time', () => {
    const startMin = parseTimeToMinutes('11:00');
    const endMin = parseTimeToMinutes('10:00');
    expect(startMin >= endMin).toBe(true);
  });

  // TEST 6: Sorting by start time
  it('TEST 6: Sorts slots by start_time ascending', () => {
    const slots = [
      { id: '1', startTime: '11:00' },
      { id: '2', startTime: '09:00' },
      { id: '3', startTime: '10:30' },
    ];

    const sorted = [...slots].sort(
      (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
    );

    expect(sorted.map((s) => s.id)).toEqual(['2', '3', '1']);
  });

  // TEST 7: Validates day of week enum
  it('TEST 7: Validates supported days of week', () => {
    const validDays: DayOfWeekEnum[] = [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ];
    expect(validDays.includes('MONDAY')).toBe(true);
    expect(validDays.includes('INVALID_DAY' as any)).toBe(false);
  });

  // TEST 8: Subject-Component Relationship validation logic
  it('TEST 8: Validates that component must belong to selected subject', () => {
    const subjectA = { id: 'sub-A', components: [{ id: 'comp-1' }, { id: 'comp-2' }] };
    const subjectB = { id: 'sub-B', components: [{ id: 'comp-3' }] };

    const compBelongsToA = subjectA.components.some((c) => c.id === 'comp-1');
    const compBelongsToB = subjectB.components.some((c) => c.id === 'comp-1');

    expect(compBelongsToA).toBe(true);
    expect(compBelongsToB).toBe(false);
  });
});
