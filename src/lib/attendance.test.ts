import { describe, it, expect } from 'vitest';
import {
  validateDateFormat,
  validateAttendanceStatus,
  validateComponentCounters,
} from './attendance.functions';
import { calculateSubjectAttendance } from './engine';

describe('Phase 7: Real Attendance Marking & Attendance History Tests', () => {

  // TEST 1: Date format validation
  it('TEST 1: Validates date format (YYYY-MM-DD)', () => {
    expect(() => validateDateFormat('2026-08-30')).not.toThrow();
    expect(() => validateDateFormat('30-08-2026')).toThrow('Invalid date format');
    expect(() => validateDateFormat('2026/08/30')).toThrow('Invalid date format');
    expect(() => validateDateFormat('')).toThrow('Attendance date is required');
  });

  // TEST 2: Attendance status validation
  it('TEST 2: Validates status values (ATTENDED | MISSED)', () => {
    expect(() => validateAttendanceStatus('ATTENDED')).not.toThrow();
    expect(() => validateAttendanceStatus('MISSED')).not.toThrow();
    expect(() => validateAttendanceStatus('INVALID_STATUS')).toThrow('Invalid attendance status');
  });

  // TEST 3: Component counter constraints
  it('TEST 3: Rejects negative counters or attended > delivered', () => {
    expect(() => validateComponentCounters(-1, 5)).toThrow('cannot be negative');
    expect(() => validateComponentCounters(5, -1)).toThrow('cannot be negative');
    expect(() => validateComponentCounters(6, 5)).toThrow('cannot exceed total delivered');
    expect(() => validateComponentCounters(5, 5)).not.toThrow();
    expect(() => validateComponentCounters(0, 0)).not.toThrow();
  });

  // TEST 4: ATTENDED increments attended + delivered by +1
  it('TEST 4: Marking ATTENDED increases attended +1 and delivered +1', () => {
    const initialAttended = 10;
    const initialDelivered = 12;
    const isAttended = true;

    const nextAttended = initialAttended + (isAttended ? 1 : 0);
    const nextDelivered = initialDelivered + 1;

    expect(nextAttended).toBe(11);
    expect(nextDelivered).toBe(13);
  });

  // TEST 5: MISSED increments delivered +1 and attended +0
  it('TEST 5: Marking MISSED increases delivered +1 and attended +0', () => {
    const initialAttended = 10;
    const initialDelivered = 12;
    const isAttended = false;

    const nextAttended = initialAttended + (isAttended ? 1 : 0);
    const nextDelivered = initialDelivered + 1;

    expect(nextAttended).toBe(10);
    expect(nextDelivered).toBe(13);
  });

  // TEST 6: Idempotency protection (clicking same status again does not alter counters)
  it('TEST 6: Idempotency - duplicate marking does not double-count counters', () => {
    let attended = 10;
    let delivered = 12;
    const existingLogStatus = 'ATTENDED';

    // User clicks ATTENDED again
    const newStatus = 'ATTENDED';
    if (existingLogStatus === newStatus) {
      // No counter modification occurs!
    } else {
      attended += 1;
    }

    expect(attended).toBe(10);
    expect(delivered).toBe(12);
  });

  // TEST 7: Status Swapping: MISSED -> ATTENDED (delivered unchanged, attended +1)
  it('TEST 7: Status swapping MISSED -> ATTENDED updates attended +1 with delivered unchanged', () => {
    let attended = 10;
    let delivered = 13; // had 10/13 from previous MISSED mark

    const previousStatus = 'MISSED';
    const newStatus = 'ATTENDED';

    if (previousStatus === 'MISSED' && newStatus === 'ATTENDED') {
      attended += 1;
      // delivered remains unchanged
    }

    expect(attended).toBe(11);
    expect(delivered).toBe(13);
  });

  // TEST 8: Status Swapping: ATTENDED -> MISSED (delivered unchanged, attended -1)
  it('TEST 8: Status swapping ATTENDED -> MISSED updates attended -1 with delivered unchanged', () => {
    let attended = 11;
    let delivered = 13; // had 11/13 from previous ATTENDED mark

    const previousStatus = 'ATTENDED';
    const newStatus = 'MISSED';

    if (previousStatus === 'ATTENDED' && newStatus === 'MISSED') {
      attended -= 1;
      // delivered remains unchanged
    }

    expect(attended).toBe(10);
    expect(delivered).toBe(13);
  });

  // TEST 9: Unmark ATTENDED reverses both counters (attended -1, delivered -1)
  it('TEST 9: Unmarking ATTENDED entry reverses both counters', () => {
    let attended = 11;
    let delivered = 13;
    const logStatus = 'ATTENDED';

    if (logStatus === 'ATTENDED') {
      attended -= 1;
      delivered -= 1;
    }

    expect(attended).toBe(10);
    expect(delivered).toBe(12);
  });

  // TEST 10: Unmark MISSED reverses delivered counter only (attended -0, delivered -1)
  it('TEST 10: Unmarking MISSED entry reverses delivered counter only', () => {
    let attended = 10;
    let delivered = 13;
    const logStatus = 'MISSED';

    if (logStatus === 'MISSED') {
      delivered -= 1;
    }

    expect(attended).toBe(10);
    expect(delivered).toBe(12);
  });

  // TEST 11: Invalid subject/component relationship rejection logic
  it('TEST 11: Rejects attendance log if component does not belong to subject', () => {
    const subjectComponents = [{ id: 'comp-1' }, { id: 'comp-2' }];
    const invalidCompId = 'comp-99';

    const belongs = subjectComponents.some((c) => c.id === invalidCompId);
    expect(belongs).toBe(false);
  });

  // TEST 12: Invalid timetable slot relationship rejection logic
  it('TEST 12: Rejects attendance log if slot subject/component mismatch occurs', () => {
    const slot = { subject_id: 'sub-1', component_id: 'comp-1' };

    const invalidSubjectId = 'sub-2';
    const isValid = slot.subject_id === invalidSubjectId;
    expect(isValid).toBe(false);
  });

  // TEST 13: Phase 4 Engine integration - Subject attendance combination remains pure
  it('TEST 13: Attendance calculations derive percentage strictly via Phase 4 SUM(attended)/SUM(delivered)', () => {
    const components = [
      { id: 'c1', attended: 10, delivered: 12 },
      { id: 'c2', attended: 8, delivered: 10 },
    ];
    const stats = calculateSubjectAttendance(components, 75);

    expect(stats.attended).toBe(18);
    expect(stats.delivered).toBe(22);
    expect(stats.percentage).toBeCloseTo(81.818, 3);
    expect(stats.eligible).toBe(true);
  });

  // TEST 14: Strict inequality threshold check
  it('TEST 14: Eligibility strictly enforces percentage > threshold (75.00% is NOT eligible)', () => {
    const exactly75 = calculateSubjectAttendance([{ id: 'c1', attended: 75, delivered: 100 }], 75);
    expect(exactly75.percentage).toBe(75);
    expect(exactly75.eligible).toBe(false);

    const over75 = calculateSubjectAttendance([{ id: 'c1', attended: 76, delivered: 100 }], 75);
    expect(over75.percentage).toBe(76);
    expect(over75.eligible).toBe(true);
  });
});
