import { describe, it, expect } from 'vitest';
import {
  pct,
  calculateSubjectAttendance,
  bunkLimit,
  recoveryNeeded,
  recommendation,
  projectSubjectAfter,
  calculateClassSkipImpact,
  projectSubjectWithComponentAction,
  calculateSemesterAttendance,
} from './engine';

describe('SkipLogic Canonical Attendance Engine Tests', () => {
  
  // TEST 1
  it('TEST 1: 8/10 + 7/9 component combination', () => {
    const components = [
      { id: '1', attended: 8, delivered: 10 },
      { id: '2', attended: 7, delivered: 9 },
    ];
    const result = calculateSubjectAttendance(components, 75);
    expect(result.attended).toBe(15);
    expect(result.delivered).toBe(19);
    expect(result.percentage).toBeCloseTo(78.947, 3);
    expect(result.eligible).toBe(true);
  });

  // TEST 2
  it('TEST 2: 75.00% is INELIGIBLE when threshold is 75', () => {
    const components = [{ id: '1', attended: 75, delivered: 100 }];
    const result = calculateSubjectAttendance(components, 75);
    expect(result.percentage).toBe(75);
    expect(result.eligible).toBe(false); // Strict inequality
  });

  // TEST 3
  it('TEST 3: 75.01% is ELIGIBLE when threshold is 75', () => {
    const components = [{ id: '1', attended: 7501, delivered: 10000 }];
    const result = calculateSubjectAttendance(components, 75);
    expect(result.percentage).toBe(75.01);
    expect(result.eligible).toBe(true);
  });

  // TEST 4
  it('TEST 4: 0/0 results in percentage = null', () => {
    const components = [{ id: '1', attended: 0, delivered: 0 }];
    const result = calculateSubjectAttendance(components, 75);
    expect(result.percentage).toBeNull();
    expect(result.eligible).toBe(true); // Default to true for 0 delivered classes
  });

  // TEST 5
  it('TEST 5: attended > delivered rejects invalid input', () => {
    expect(() => pct(11, 10)).toThrow();
    expect(() => calculateSubjectAttendance([{ id: '1', attended: 5, delivered: 4 }], 75)).toThrow();
  });

  // TEST 6
  it('TEST 6: bunk boundary - exact 75% limit check', () => {
    // 15/19 = 78.95%. If next is missed: 15/20 = 75%.
    // Since 75% is NOT strictly > 75%, bunk limit must NOT allow it. It should be 0.
    const limit = bunkLimit(15, 19, 75);
    expect(limit).toBe(0);
  });

  // TEST 7
  it('TEST 7: Recovery boundary - smallest integer producing attendance > threshold', () => {
    // 14/20 = 70%. Need > 75%.
    // If attend 4: 18/24 = 75% (ineligible)
    // If attend 5: 19/25 = 76% (eligible)
    // Smallest integer recoveryNeeded should be 5.
    const recovery = recoveryNeeded(14, 20, 75);
    expect(recovery).toBe(5);
  });

  // TEST 8
  it('TEST 8: Component-specific miss modifies only the affected component', () => {
    const components = [
      { id: 'PP', attended: 8, delivered: 10 },
      { id: 'TUT', attended: 7, delivered: 9 },
    ];
    // Miss PP
    const result = projectSubjectWithComponentAction(components, 'PP', 'MISS', 75);
    expect(result.attended).toBe(15);
    expect(result.delivered).toBe(20);
    expect(result.percentage).toBe(75);
    expect(result.eligible).toBe(false);
  });

  // TEST 9
  it('TEST 9: Component-specific attend modifies only the affected component', () => {
    const components = [
      { id: 'PP', attended: 8, delivered: 10 },
      { id: 'TUT', attended: 7, delivered: 9 },
    ];
    // Attend PP
    const result = projectSubjectWithComponentAction(components, 'PP', 'ATTEND', 75);
    expect(result.attended).toBe(16);
    expect(result.delivered).toBe(20);
    expect(result.percentage).toBe(80);
    expect(result.eligible).toBe(true);
  });

  // TEST 10
  it('TEST 10: Overall attendance uses raw totals, not average percentages', () => {
    const components = [
      { id: 'A', attended: 10, delivered: 12 }, // 83.33%
      { id: 'B', attended: 20, delivered: 30 }, // 66.67%
    ];
    // Combined: 30/42 = 71.43%
    const result = calculateSemesterAttendance(components, 75);
    expect(result.attended).toBe(30);
    expect(result.delivered).toBe(42);
    expect(result.percentage).toBeCloseTo(71.429, 3);
  });

  // TEST 11
  it('TEST 11: Already above threshold requires 0 recovery', () => {
    expect(recoveryNeeded(16, 20, 75)).toBe(0); // 80% > 75%
  });

  // TEST for recommendation
  it('TEST: recommendation function returns correct semantic status', () => {
    expect(recommendation(0, 0, 75)).toBe('NEUTRAL');
    expect(recommendation(15, 20, 75)).toBe('MUST_ATTEND'); // 75% <= 75%
    expect(recommendation(15, 19, 75)).toBe('RISKY'); // 78.95% > 75% but bunkLimit = 0
    expect(recommendation(16, 19, 75)).toBe('SAFE'); // 84.21% > 75% and bunkLimit = 2
  });

  // TEST 12
  it('TEST 12: Already at exactly threshold requires recovery > 0 due to strict inequality', () => {
    // 15/20 = 75%. Needs to be strictly > 75%.
    // Attend 1: 16/21 = 76.19% > 75%
    expect(recoveryNeeded(15, 20, 75)).toBe(1);
  });

  // TEST 13
  it('TEST 13: Bunk limit when exactly at threshold is 0', () => {
    expect(bunkLimit(15, 20, 75)).toBe(0);
  });

  // TEST 14
  it('TEST 14: Bunk limit when comfortably above threshold returns correct maximum integer', () => {
    // 16/19 = 84.2%.
    // Skip 1: 16/20 = 80% > 75%
    // Skip 2: 16/21 = 76.19% > 75%
    // Skip 3: 16/22 = 72.7% <= 75%
    // Max skip = 2
    expect(bunkLimit(16, 19, 75)).toBe(2);
  });

  // TEST 15
  it('TEST 15: Projection ATTEND increments both counters', () => {
    const result = projectSubjectAfter({ attended: 15, delivered: 20, threshold: 75, action: 'ATTEND' });
    expect(result.attended).toBe(16);
    expect(result.delivered).toBe(21);
    expect(result.percentage).toBeCloseTo(76.19, 2);
    expect(result.eligible).toBe(true);
  });

  // TEST 16
  it('TEST 16: Projection MISS increments only delivered counter', () => {
    const result = projectSubjectAfter({ attended: 15, delivered: 20, threshold: 75, action: 'MISS' });
    expect(result.attended).toBe(15);
    expect(result.delivered).toBe(21);
    expect(result.percentage).toBeCloseTo(71.43, 2);
    expect(result.eligible).toBe(false);
  });

  // TEST 17
  it('TEST 17: Recommendation after projected miss check', () => {
    // Current: 15/19 = 78.95%
    // Next missed: 15/20 = 75.00% (ineligible)
    // So skipping this class makes them ineligible, recommendation must be MUST_ATTEND.
    const impact = calculateClassSkipImpact(15, 19, 75);
    expect(impact.recommendation).toBe('MUST_ATTEND');
  });

  // Section 22: Property/Edge Case & Brute-Force Validation
  describe('Section 22: Property and Edge Case Testing', () => {
    const testCases = [
      { att: 0, del: 1, thresh: 75 },
      { att: 1, del: 1, thresh: 75 },
      { att: 1, del: 2, thresh: 75 },
      { att: 2, del: 3, thresh: 75 },
      { att: 3, del: 4, thresh: 75 },
      { att: 74, del: 100, thresh: 75 },
      { att: 75, del: 100, thresh: 75 },
      { att: 76, del: 100, thresh: 75 },
      { att: 99, del: 100, thresh: 75 },
      { att: 100, del: 100, thresh: 75 },
      { att: 750, del: 1000, thresh: 75 },
      { att: 751, del: 1000, thresh: 75 },
    ];

    it('validates bunkLimit and recoveryNeeded output against brute force checks', () => {
      for (const tc of testCases) {
        const calculatedBunk = bunkLimit(tc.att, tc.del, tc.thresh);
        const calculatedRec = recoveryNeeded(tc.att, tc.del, tc.thresh);

        // Brute force check bunk
        if (calculatedBunk > 0) {
          // Verify that with calculatedBunk misses, it is still > threshold
          expect((tc.att / (tc.del + calculatedBunk)) * 100).toBeGreaterThan(tc.thresh);
          // Verify that one more miss drops it to <= threshold
          expect((tc.att / (tc.del + calculatedBunk + 1)) * 100).toBeLessThanOrEqual(tc.thresh);
        } else {
          // Verify that 1 miss indeed drops it or keeps it below threshold
          expect((tc.att / (tc.del + 1)) * 100).toBeLessThanOrEqual(tc.thresh);
        }

        // Brute force check recovery
        if (calculatedRec > 0) {
          // Verify that with calculatedRec attends, it is > threshold
          expect(((tc.att + calculatedRec) / (tc.del + calculatedRec)) * 100).toBeGreaterThan(tc.thresh);
          // Verify that with 1 less attend, it is <= threshold
          expect(((tc.att + calculatedRec - 1) / (tc.del + calculatedRec - 1)) * 100).toBeLessThanOrEqual(tc.thresh);
        } else {
          // Verify that current attendance is already > threshold
          expect((tc.att / tc.del) * 100).toBeGreaterThan(tc.thresh);
        }
      }
    });

    it('rejects invalid/edge inputs properly', () => {
      // Negative inputs
      expect(() => bunkLimit(-1, 10, 75)).toThrow();
      expect(() => recoveryNeeded(5, -10, 75)).toThrow();

      // NaN
      expect(() => bunkLimit(NaN, 10, 75)).toThrow();

      // Infinite values
      expect(() => bunkLimit(5, Infinity, 75)).toThrow();

      // Attended > delivered
      expect(() => bunkLimit(11, 10, 75)).toThrow();
    });

    it('handles threshold of 100 properly', () => {
      // recoveryNeeded should return 999 or equivalent fallback when target is 100 (which is unreachable strictly)
      expect(recoveryNeeded(90, 100, 100)).toBe(999);
    });
  });
});
