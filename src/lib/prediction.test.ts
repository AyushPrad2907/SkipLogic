import { describe, it, expect } from 'vitest';
import {
  walkFutureTimetable,
  predictSubject,
  simulateWhatIfScenario,
  TimetableSlotInput,
} from './prediction';
import { calculateSubjectAttendance } from './engine';

describe('Phase 10: Semester Intelligence & Future Attendance Prediction Tests', () => {

  // ============================================================================
  // 1. TIMETABLE WALKER TESTS
  // ============================================================================
  describe('1. Timetable Walker', () => {
    const defaultSlots: TimetableSlotInput[] = [
      {
        id: 'slot-ds-pp-mon',
        subjectId: 'sub-ds',
        componentId: 'comp-ds-pp',
        componentType: 'PP',
        componentName: 'Theory',
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '10:00',
      },
      {
        id: 'slot-ds-pr-wed',
        subjectId: 'sub-ds',
        componentId: 'comp-ds-pr',
        componentType: 'PR',
        componentName: 'Lab',
        dayOfWeek: 'WEDNESDAY',
        startTime: '11:00',
        endTime: '13:00',
      },
    ];

    it('generates virtual occurrences on working weekdays between currentDate and endDate', () => {
      const occurrences = walkFutureTimetable({
        startDate: '2026-09-01',
        endDate: '2026-09-15', // Wed 2nd, Mon 7th, Wed 9th, Mon 14th
        currentDate: '2026-09-01',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        holidays: [],
        timetableSlots: defaultSlots,
      });

      // Sep 2026: Sep 1 is Tuesday.
      // Sep 2 (Wed), Sep 7 (Mon), Sep 9 (Wed), Sep 14 (Mon).
      expect(occurrences.length).toBe(4);
      expect(occurrences[0].date).toBe('2026-09-02');
      expect(occurrences[0].dayOfWeek).toBe('WEDNESDAY');
      expect(occurrences[1].date).toBe('2026-09-07');
      expect(occurrences[1].dayOfWeek).toBe('MONDAY');
      expect(occurrences[2].date).toBe('2026-09-09');
      expect(occurrences[2].dayOfWeek).toBe('WEDNESDAY');
      expect(occurrences[3].date).toBe('2026-09-14');
      expect(occurrences[3].dayOfWeek).toBe('MONDAY');
    });

    it('excludes dates configured in holidays array', () => {
      const occurrences = walkFutureTimetable({
        startDate: '2026-09-01',
        endDate: '2026-09-15',
        currentDate: '2026-09-01',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        holidays: ['2026-09-07'], // Holiday on Sep 7 Monday!
        timetableSlots: defaultSlots,
      });

      // Sep 7 is excluded, Sep 2 (Wed), Sep 9 (Wed), Sep 14 (Mon) remain
      expect(occurrences.length).toBe(3);
      expect(occurrences[0].date).toBe('2026-09-02');
      expect(occurrences[1].date).toBe('2026-09-09');
      expect(occurrences[2].date).toBe('2026-09-14');
    });

    it('excludes weekends if non-working', () => {
      const satSlot: TimetableSlotInput[] = [
        {
          id: 'slot-sat',
          subjectId: 'sub-ds',
          componentId: 'comp-ds-pp',
          componentType: 'PP',
          dayOfWeek: 'SATURDAY',
          startTime: '09:00',
          endTime: '10:00',
        },
      ];

      const occurrences = walkFutureTimetable({
        startDate: '2026-09-01',
        endDate: '2026-09-15',
        currentDate: '2026-09-01',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'], // SATURDAY excluded!
        holidays: [],
        timetableSlots: satSlot,
      });

      expect(occurrences.length).toBe(0);
    });

    it('returns empty list if currentDate is after endDate', () => {
      const occurrences = walkFutureTimetable({
        startDate: '2026-09-01',
        endDate: '2026-09-15',
        currentDate: '2026-09-20',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        holidays: [],
        timetableSlots: defaultSlots,
      });

      expect(occurrences.length).toBe(0);
    });
  });

  // ============================================================================
  // 2. COMPONENT PREDICTION TESTS
  // ============================================================================
  describe('2. Component-Aware Prediction', () => {
    const timetableSlots: TimetableSlotInput[] = [
      { id: 's1', subjectId: 'sub-1', componentId: 'c-pp', componentType: 'PP', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
      { id: 's2', subjectId: 'sub-1', componentId: 'c-pp', componentType: 'PP', dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '10:00' },
      { id: 's3', subjectId: 'sub-1', componentId: 'c-pr', componentType: 'PR', dayOfWeek: 'FRIDAY', startTime: '11:00', endTime: '13:00' },
    ];

    it('tracks future classes at component level independently (PP vs PR)', () => {
      const components = [
        { id: 'c-pp', type: 'PP', name: 'Theory', attended: 19, delivered: 21 },
        { id: 'c-pr', type: 'PR', name: 'Practical', attended: 15, delivered: 17 },
      ];

      const res = predictSubject('sub-1', components, 75, {
        startDate: '2026-09-01',
        endDate: '2026-09-14', // 2 weeks: 4 PP classes, 2 PR classes
        currentDate: '2026-09-01',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        holidays: [],
        timetableSlots,
      });

      expect(res.currentAttended).toBe(34);
      expect(res.currentDelivered).toBe(38);
      expect(res.currentPercentage).toBe(89.47);

      expect(res.futureClassesTotal).toBe(6);
      const ppFuture = res.futureClassesByComponent.find(c => c.componentId === 'c-pp');
      const prFuture = res.futureClassesByComponent.find(c => c.componentId === 'c-pr');

      expect(ppFuture?.futureCount).toBe(4);
      expect(prFuture?.futureCount).toBe(2);

      // Best possible: (34 + 6) / (38 + 6) = 40 / 44 = 90.91%
      expect(res.bestPossibleAttended).toBe(40);
      expect(res.bestPossibleDelivered).toBe(44);
      expect(res.bestPossiblePercentage).toBe(90.91);
    });
  });

  // ============================================================================
  // 3. RECOVERY PREDICTION & RECOVERY DATE TESTS
  // ============================================================================
  describe('3. Recovery Prediction & Date', () => {
    const timetableSlots: TimetableSlotInput[] = [
      { id: 's1', subjectId: 'sub-1', componentId: 'c1', componentType: 'PP', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
      { id: 's2', subjectId: 'sub-1', componentId: 'c1', componentType: 'PP', dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '10:00' },
      { id: 's3', subjectId: 'sub-1', componentId: 'c1', componentType: 'PP', dayOfWeek: 'FRIDAY', startTime: '09:00', endTime: '10:00' },
    ];

    it('calculates recovery date chronologically when student is below threshold', () => {
      // Current: 68 / 100 = 68.00% (Threshold = 75)
      // Needs 29 consecutive attendances to cross 75%
      const components = [{ id: 'c1', type: 'PP', name: 'Theory', attended: 68, delivered: 100 }];

      const res = predictSubject('sub-1', components, 75, {
        startDate: '2026-09-01',
        endDate: '2026-11-30', // ~39 classes total
        currentDate: '2026-09-01',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        holidays: [],
        timetableSlots,
      });

      expect(res.currentEligible).toBe(false);
      expect(res.recoverable).toBe(true);
      expect(res.recoveryClassesNeeded).toBe(29);
      expect(res.recoveryDate).toBeDefined();
      expect(typeof res.recoveryDate).toBe('string');
    });

    it('detects mathematically impossible recovery (recoverable = false, UNRECOVERABLE status)', () => {
      // Current: 40 / 100 = 40%. Threshold = 75%.
      // Only 3 classes remain in semester. Best possible: 43 / 103 = 41.75% <= 75%.
      const components = [{ id: 'c1', type: 'PP', name: 'Theory', attended: 40, delivered: 100 }];

      const res = predictSubject('sub-1', components, 75, {
        startDate: '2026-09-01',
        endDate: '2026-09-07', // Only Mon Sep 7th (1 class)
        currentDate: '2026-09-01',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        holidays: [],
        timetableSlots,
      });

      expect(res.recoverable).toBe(false);
      expect(res.status).toBe('UNRECOVERABLE');
      expect(res.recoveryDate).toBeNull();
      expect(res.bestPossiblePercentage).toBe(41.75);
    });
  });

  // ============================================================================
  // 4. STRICT THRESHOLD TESTS
  // ============================================================================
  describe('4. Strict Threshold Rule (attendance > threshold)', () => {
    it('enforces 75.00% is INELIGIBLE when threshold = 75', () => {
      const stats = calculateSubjectAttendance([{ id: 'c1', attended: 75, delivered: 100 }], 75);
      expect(stats.percentage).toBe(75.00);
      expect(stats.eligible).toBe(false); // STRICTLY GREATER THAN
    });

    it('enforces 75.01% is ELIGIBLE when threshold = 75', () => {
      const stats = calculateSubjectAttendance([{ id: 'c1', attended: 7501, delivered: 10000 }], 75);
      expect(stats.percentage).toBe(75.01);
      expect(stats.eligible).toBe(true); // STRICTLY GREATER THAN
    });
  });

  // ============================================================================
  // 5. BUNK LIMIT & SAFE BUNK PLAN TESTS
  // ============================================================================
  describe('5. Bunk Limit & Safe Bunk Plan', () => {
    const timetableSlots: TimetableSlotInput[] = [
      { id: 's1', subjectId: 'sub-1', componentId: 'c1', componentType: 'PP', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
      { id: 's2', subjectId: 'sub-1', componentId: 'c1', componentType: 'PP', dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '10:00' },
      { id: 's3', subjectId: 'sub-1', componentId: 'c1', componentType: 'PP', dayOfWeek: 'FRIDAY', startTime: '09:00', endTime: '10:00' },
    ];

    it('generates safe bunk plan for future classes maintaining attendance > threshold', () => {
      // Current: 90 / 100 = 90.00%
      const components = [{ id: 'c1', type: 'PP', name: 'Theory', attended: 90, delivered: 100 }];

      const res = predictSubject('sub-1', components, 75, {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        currentDate: '2026-09-01',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        holidays: [],
        timetableSlots,
      });

      expect(res.currentEligible).toBe(true);
      expect(res.bunkLimitFuture).toBeGreaterThan(0);
      expect(res.safeBunkPlan.length).toBe(res.bunkLimitFuture);
    });
  });

  // ============================================================================
  // 6. WHAT-IF SIMULATION TESTS
  // ============================================================================
  describe('6. What-If Simulation Helper', () => {
    const timetableSlots: TimetableSlotInput[] = [
      { id: 's1', subjectId: 'sub-1', componentId: 'c1', componentType: 'PP', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
      { id: 's2', subjectId: 'sub-1', componentId: 'c1', componentType: 'PP', dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '10:00' },
    ];

    it('simulates ATTEND_NEXT, MISS_NEXT, ATTEND_ALL, and MISS_ALL scenarios accurately', () => {
      const components = [{ id: 'c1', type: 'PP', name: 'Theory', attended: 18, delivered: 20 }]; // 90%

      const pred = predictSubject('sub-1', components, 75, {
        startDate: '2026-09-01',
        endDate: '2026-09-10', // 2 classes (Sep 2 Wed, Sep 7 Mon, Sep 9 Wed) -> 3 classes
        currentDate: '2026-09-01',
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        holidays: [],
        timetableSlots,
      });

      const attendNext = simulateWhatIfScenario(pred, { type: 'ATTEND_NEXT' });
      expect(attendNext.simulatedAttended).toBe(19);
      expect(attendNext.simulatedDelivered).toBe(21);
      expect(attendNext.simulatedPercentage).toBe(90.48);

      const missNext = simulateWhatIfScenario(pred, { type: 'MISS_NEXT' });
      expect(missNext.simulatedAttended).toBe(18);
      expect(missNext.simulatedDelivered).toBe(21);
      expect(missNext.simulatedPercentage).toBe(85.71);

      const attendAll = simulateWhatIfScenario(pred, { type: 'ATTEND_ALL' });
      expect(attendAll.simulatedAttended).toBe(21);
      expect(attendAll.simulatedDelivered).toBe(23);

      const missAll = simulateWhatIfScenario(pred, { type: 'MISS_ALL' });
      expect(missAll.simulatedAttended).toBe(18);
      expect(missAll.simulatedDelivered).toBe(23);
      expect(missAll.simulatedPercentage).toBe(78.26);
    });
  });
});
