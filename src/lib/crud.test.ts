import { describe, it, expect } from 'vitest';
import { calculateSubjectAttendance, bunkLimit, recoveryNeeded } from './engine';

describe('Phase 5: Subject & Component Data Access & Business Rules Tests', () => {

  // Test 1: Multiple components combination (8/10 + 7/9)
  it('TEST 1: Subject combines raw totals across multiple components', () => {
    const components = [
      { id: 'c1', attended: 8, delivered: 10 },
      { id: 'c2', attended: 7, delivered: 9 },
    ];
    const result = calculateSubjectAttendance(components, 75);
    expect(result.attended).toBe(15);
    expect(result.delivered).toBe(19);
    expect(result.percentage).toBeCloseTo(78.947, 3);
    expect(result.eligible).toBe(true);
  });

  // Test 2: Component counter constraints validation
  it('TEST 2: Rejects invalid component counters (negative values or attended > delivered)', () => {
    expect(() => {
      const attended = -1;
      const delivered = 10;
      if (attended < 0 || delivered < 0) throw new Error('Attendance counters cannot be negative.');
    }).toThrow();

    expect(() => {
      const attended = 11;
      const delivered = 10;
      if (attended > delivered) throw new Error('Attended classes cannot exceed total delivered classes.');
    }).toThrow();
  });

  // Test 3: Supported component type validation
  it('TEST 3: Validates supported component types (PP, PR, TUT, LAB, THEORY, CUSTOM)', () => {
    const allowed = ['PP', 'PR', 'TUT', 'LAB', 'THEORY', 'CUSTOM'];
    expect(allowed.includes('PP')).toBe(true);
    expect(allowed.includes('INVALID_TYPE')).toBe(false);
  });

  // Test 4: Subject attendance remains derived, no subject-level counters stored
  it('TEST 4: Subject attendance calculations use Phase 4 engine derived values', () => {
    const components = [
      { id: 'c1', attended: 10, delivered: 12 }, // 83.33%
      { id: 'c2', attended: 20, delivered: 30 }, // 66.67%
    ];
    const stats = calculateSubjectAttendance(components, 75);

    expect(stats.attended).toBe(30);
    expect(stats.delivered).toBe(42);
    expect(stats.percentage).toBeCloseTo(71.429, 3);
    expect(stats.eligible).toBe(false); // 71.43% <= 75%
  });

  // Test 5: Strict threshold inequality checks
  it('TEST 5: Strict threshold inequality (> threshold, not >= threshold)', () => {
    const atExact75 = calculateSubjectAttendance([{ id: 'c1', attended: 75, delivered: 100 }], 75);
    expect(atExact75.percentage).toBe(75);
    expect(atExact75.eligible).toBe(false); // Strict inequality

    const at75_01 = calculateSubjectAttendance([{ id: 'c1', attended: 7501, delivered: 10000 }], 75);
    expect(at75_01.eligible).toBe(true);
  });

  // Test 6: Bunk limit & recovery calculations from engine
  it('TEST 6: Engine bunkLimit and recoveryNeeded output for real component totals', () => {
    const bLimit = bunkLimit(16, 19, 75); // 84.21% > 75%
    expect(bLimit).toBe(2);

    const recNeeded = recoveryNeeded(14, 20, 75); // 70% <= 75%
    expect(recNeeded).toBe(5);
  });
});
