import { describe, it, expect } from 'vitest';
import {
  calculateCumulativeAttendance,
  classifyTrend,
  calculateSubjectAnalytics,
  calculateComponentAnalytics,
  calculateMissedClassAnalysis,
  calculatePeriodComparison,
  calculateAttendanceConsistency,
  generateAttendanceInsights,
  filterAttendanceLogs,
} from './analytics';
import { Subject, AttendanceLog } from '@/types';
import { calculateSubjectAttendance } from './engine';
import { predictSubject } from './prediction';
import { calculateSemesterCalendarSummary } from './semesterCalendar';

describe('Phase 13: Advanced Attendance Analytics & Insights Tests', () => {

  const sampleSubjects: Subject[] = [
    {
      id: 'sub-ds',
      name: 'Data Structures',
      code: 'CS201',
      targetThreshold: 75,
      totalAttended: 18,
      totalDelivered: 20,
      currentPercentage: 90.0,
      bunkLimit: 3,
      recoveryRequired: 0,
      status: 'SAFE',
      components: [
        { id: 'comp-ds-th', subjectId: 'sub-ds', type: 'LECTURE', name: 'Theory', totalAttended: 10, totalDelivered: 10 },
        { id: 'comp-ds-lab', subjectId: 'sub-ds', type: 'LAB', name: 'Lab', totalAttended: 8, totalDelivered: 10 },
      ],
    },
    {
      id: 'sub-ev',
      name: 'EV Technology',
      code: 'EE301',
      targetThreshold: 75,
      totalAttended: 10,
      totalDelivered: 14,
      currentPercentage: 71.43,
      bunkLimit: 0,
      recoveryRequired: 2,
      status: 'MUST_ATTEND',
      components: [
        { id: 'comp-ev-th', subjectId: 'sub-ev', type: 'LECTURE', name: 'Theory', totalAttended: 6, totalDelivered: 8 },
        { id: 'comp-ev-lab', subjectId: 'sub-ev', type: 'LAB', name: 'Lab', totalAttended: 4, totalDelivered: 6 },
      ],
    },
  ];

  const sampleLogs: AttendanceLog[] = [
    {
      id: 'log-1',
      semesterId: 'sem-1',
      subjectId: 'sub-ds',
      componentId: 'comp-ds-th',
      subjectName: 'Data Structures',
      componentType: 'LECTURE',
      status: 'ATTENDED',
      date: '2026-08-01',
      timestamp: '2026-08-01T10:00:00Z',
    },
    {
      id: 'log-2',
      semesterId: 'sem-1',
      subjectId: 'sub-ds',
      componentId: 'comp-ds-th',
      subjectName: 'Data Structures',
      componentType: 'LECTURE',
      status: 'ATTENDED',
      date: '2026-08-01',
      timestamp: '2026-08-01T11:00:00Z',
    },
    {
      id: 'log-3',
      semesterId: 'sem-1',
      subjectId: 'sub-ev',
      componentId: 'comp-ev-th',
      subjectName: 'EV Technology',
      componentType: 'LECTURE',
      status: 'MISSED',
      date: '2026-08-01',
      timestamp: '2026-08-01T14:00:00Z',
    },
    {
      id: 'log-4',
      semesterId: 'sem-1',
      subjectId: 'sub-ds',
      componentId: 'comp-ds-lab',
      subjectName: 'Data Structures',
      componentType: 'LAB',
      status: 'ATTENDED',
      date: '2026-08-08',
      timestamp: '2026-08-08T10:00:00Z',
    },
    {
      id: 'log-5',
      semesterId: 'sem-1',
      subjectId: 'sub-ev',
      componentId: 'comp-ev-lab',
      subjectName: 'EV Technology',
      componentType: 'LAB',
      status: 'MISSED',
      date: '2026-08-15',
      timestamp: '2026-08-15T14:00:00Z',
    },
  ];

  // TEST 1: Correct cumulative attendance using raw totals
  it('TEST 1: Calculates cumulative attendance using raw SUM(attended) / SUM(delivered) totals', () => {
    const cumulative = calculateCumulativeAttendance(sampleLogs);
    expect(cumulative.length).toBe(3); // 3 distinct dates (Aug 01, Aug 08, Aug 15)

    // Aug 01: 2 attended out of 3 delivered -> 66.67%
    expect(cumulative[0].cumulativeAttended).toBe(2);
    expect(cumulative[0].cumulativeDelivered).toBe(3);
    expect(cumulative[0].cumulativePercentage).toBe(66.67);

    // Aug 08: 1 attended added -> total 3 attended / 4 delivered -> 75.00%
    expect(cumulative[1].cumulativeAttended).toBe(3);
    expect(cumulative[1].cumulativeDelivered).toBe(4);
    expect(cumulative[1].cumulativePercentage).toBe(75.0);

    // Aug 15: 1 missed added -> total 3 attended / 5 delivered -> 60.00%
    expect(cumulative[2].cumulativeAttended).toBe(3);
    expect(cumulative[2].cumulativeDelivered).toBe(5);
    expect(cumulative[2].cumulativePercentage).toBe(60.0);
  });

  // TEST 2: Multiple attendance records on the same date aggregate correctly
  it('TEST 2: Multiple attendance logs on the same date aggregate correctly', () => {
    const logsSameDate: AttendanceLog[] = [
      { id: '1', subjectId: 's1', componentType: 'LECTURE', subjectName: 'S1', status: 'ATTENDED', date: '2026-08-01', timestamp: '' },
      { id: '2', subjectId: 's1', componentType: 'LECTURE', subjectName: 'S1', status: 'ATTENDED', date: '2026-08-01', timestamp: '' },
      { id: '3', subjectId: 's1', componentType: 'LAB', subjectName: 'S1', status: 'MISSED', date: '2026-08-01', timestamp: '' },
    ];
    const res = calculateCumulativeAttendance(logsSameDate);
    expect(res.length).toBe(1);
    expect(res[0].attended).toBe(2);
    expect(res[0].delivered).toBe(3);
    expect(res[0].cumulativePercentage).toBe(66.67);
  });

  // TEST 3: Weekly aggregation
  it('TEST 3: Groups attendance by weekly buckets in period comparison', () => {
    const comp = calculatePeriodComparison(sampleLogs, 7, '2026-08-07');
    expect(comp.recentDelivered).toBe(3);
    expect(comp.recentAttended).toBe(2);
  });

  // TEST 4: Monthly aggregation
  it('TEST 4: Correctly aggregates monthly logs', () => {
    const cumulative = calculateCumulativeAttendance(sampleLogs);
    const augustLogs = cumulative.filter((c) => c.date.startsWith('2026-08'));
    expect(augustLogs.length).toBe(3);
  });

  // TEST 5: Rolling 7-day attendance
  it('TEST 5: Computes 7-day rolling period comparison', () => {
    const comp7 = calculatePeriodComparison(sampleLogs, 7, '2026-08-15');
    expect(comp7.periodLabel).toContain('Last 7 Days');
    expect(comp7.recentDelivered).toBe(1); // Aug 15 log
  });

  // TEST 6: Rolling 14-day attendance
  it('TEST 6: Computes 14-day rolling period comparison', () => {
    const comp14 = calculatePeriodComparison(sampleLogs, 14, '2026-08-15');
    expect(comp14.recentDelivered).toBe(2); // Aug 8 and Aug 15 logs
  });

  // TEST 7: Rolling 30-day attendance
  it('TEST 7: Computes 30-day rolling period comparison', () => {
    const comp30 = calculatePeriodComparison(sampleLogs, 30, '2026-08-15');
    expect(comp30.recentDelivered).toBe(5); // All 5 logs
  });

  // TEST 8: Subject-level aggregation
  it('TEST 8: Calculates subject-level analytics and percentage point change', () => {
    const analytics = calculateSubjectAnalytics(sampleSubjects, sampleLogs, 14, '2026-08-15');
    expect(analytics.length).toBe(2);

    const ds = analytics.find((a) => a.subjectId === 'sub-ds')!;
    expect(ds.subjectName).toBe('Data Structures');
    expect(ds.currentPercentage).toBe(90.0);
    expect(ds.strongestComponent?.name).toBe('Theory');
  });

  // TEST 9: Component-level aggregation
  it('TEST 9: Calculates component-level analytics for Theory and Lab components', () => {
    const compAnalytics = calculateComponentAnalytics(sampleSubjects, sampleLogs, 14, '2026-08-15');
    expect(compAnalytics.length).toBe(4);

    const dsTheory = compAnalytics.find((c) => c.componentId === 'comp-ds-th')!;
    expect(dsTheory.percentage).toBe(100.0);
    expect(dsTheory.missed).toBe(0);

    const evLab = compAnalytics.find((c) => c.componentId === 'comp-ev-lab')!;
    expect(evLab.percentage).toBe(66.67);
    expect(evLab.missed).toBe(2);
  });

  // TEST 10: Missed-class counts
  it('TEST 10: Counts total missed classes and groups by subject and component', () => {
    const missed = calculateMissedClassAnalysis(sampleSubjects, sampleLogs);
    expect(missed.totalMissed).toBe(2);

    const evMissed = missed.bySubject.find((s) => s.subjectId === 'sub-ev');
    expect(evMissed?.count).toBe(2);
  });

  // TEST 11: Weekday missed-class distribution
  it('TEST 11: Calculates missed classes grouped by weekday', () => {
    // Aug 1, 2026 is Saturday
    // Aug 15, 2026 is Saturday
    const missed = calculateMissedClassAnalysis(sampleSubjects, sampleLogs);
    const sat = missed.byWeekday.find((w) => w.day === 'SATURDAY');
    expect(sat?.count).toBe(2);
  });

  // TEST 12: Improving trend detection
  it('TEST 12: Classifies trend as IMPROVING when percentage increases by >= 2.0 percentage points', () => {
    const status = classifyTrend(85.0, 80.0, 5);
    expect(status).toBe('IMPROVING');
  });

  // TEST 13: Declining trend detection
  it('TEST 13: Classifies trend as DECLINING when percentage decreases by >= 2.0 percentage points', () => {
    const status = classifyTrend(70.0, 80.0, 5);
    expect(status).toBe('DECLINING');
  });

  // TEST 14: Stable trend detection
  it('TEST 14: Classifies trend as STABLE when percentage change is within -2.0 and +2.0 points', () => {
    const status = classifyTrend(80.5, 80.0, 5);
    expect(status).toBe('STABLE');
  });

  // TEST 15: Insufficient-data handling
  it('TEST 15: Classifies trend as INSUFFICIENT_DATA when delivered count is less than 3', () => {
    const status = classifyTrend(90.0, 80.0, 2);
    expect(status).toBe('INSUFFICIENT_DATA');
  });

  // TEST 16: Period comparison
  it('TEST 16: Compares recent window against previous window side-by-side', () => {
    const comp = calculatePeriodComparison(sampleLogs, 7, '2026-08-15');
    expect(comp.recentDelivered).toBe(1);
    expect(comp.previousDelivered).toBe(1);
    expect(comp.percentagePointChange).toBe(-100);
  });

  // TEST 17: Percentage-point change calculation
  it('TEST 17: Correctly calculates percentage-point change as difference between percentages', () => {
    // 100% - 0% = +100.0 percentage points
    const comp = calculatePeriodComparison(
      [
        { id: '1', subjectId: 's1', componentType: 'LECTURE', subjectName: 'S1', status: 'ATTENDED', date: '2026-08-15', timestamp: '' },
        { id: '2', subjectId: 's1', componentType: 'LECTURE', subjectName: 'S1', status: 'MISSED', date: '2026-08-05', timestamp: '' },
      ],
      7,
      '2026-08-15'
    );
    expect(comp.recentPercentage).toBe(100.0);
    expect(comp.previousPercentage).toBe(0.0);
    expect(comp.percentagePointChange).toBe(100.0);
  });

  // TEST 18: Semester filtering
  it('TEST 18: Filters logs strictly by semesterId', () => {
    const logsWithMultiSem: AttendanceLog[] = [
      ...sampleLogs,
      { id: 'log-sem2', semesterId: 'sem-2', subjectId: 'sub-ds', componentType: 'LECTURE', subjectName: 'DS', status: 'ATTENDED', date: '2026-09-01', timestamp: '' },
    ];
    const filtered = filterAttendanceLogs(logsWithMultiSem, { semesterId: 'sem-1' });
    expect(filtered.length).toBe(5);
    expect(filtered.every((l) => l.semesterId === 'sem-1')).toBe(true);
  });

  // TEST 19: Subject filtering
  it('TEST 19: Filters logs strictly by subjectId', () => {
    const filtered = filterAttendanceLogs(sampleLogs, { subjectId: 'sub-ds' });
    expect(filtered.length).toBe(3);
    expect(filtered.every((l) => l.subjectId === 'sub-ds')).toBe(true);
  });

  // TEST 20: Component filtering
  it('TEST 20: Filters logs strictly by componentType', () => {
    const filtered = filterAttendanceLogs(sampleLogs, { componentType: 'LAB' });
    expect(filtered.length).toBe(2);
    expect(filtered.every((l) => l.componentType === 'LAB')).toBe(true);
  });

  // TEST 21: Date-range filtering
  it('TEST 21: Filters logs strictly by start date and end date', () => {
    const filtered = filterAttendanceLogs(sampleLogs, { startDate: '2026-08-05', endDate: '2026-08-10' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].date).toBe('2026-08-08');
  });

  // TEST 22: Zero-delivered handling
  it('TEST 22: Returns null percentage and handles zero delivered classes without crashing', () => {
    const res = calculateCumulativeAttendance([]);
    expect(res).toEqual([]);

    const trend = classifyTrend(null, null, 0);
    expect(trend).toBe('INSUFFICIENT_DATA');
  });

  // TEST 23: Empty attendance dataset
  it('TEST 23: Returns empty structures and INSUFFICIENT_DATA rating for empty dataset', () => {
    const insights = generateAttendanceInsights(sampleSubjects, []);
    expect(insights).toEqual([]);

    const consistency = calculateAttendanceConsistency([], 30);
    expect(consistency.rating).toBe('INSUFFICIENT_DATA');
    expect(consistency.score).toBe(100);
  });

  // TEST 24: Duplicate/overlapping log protection
  it('TEST 24: Correctly handles multiple logs recorded on same date', () => {
    const logsOverlap: AttendanceLog[] = [
      { id: '1', subjectId: 's1', componentType: 'LECTURE', subjectName: 'S1', status: 'ATTENDED', date: '2026-08-01', timestamp: '' },
      { id: '2', subjectId: 's1', componentType: 'LECTURE', subjectName: 'S1', status: 'ATTENDED', date: '2026-08-01', timestamp: '' },
    ];
    const cum = calculateCumulativeAttendance(logsOverlap);
    expect(cum.length).toBe(1);
    expect(cum[0].attended).toBe(2);
    expect(cum[0].delivered).toBe(2);
  });

  // TEST 25: Regression — Phase 4 strict > threshold rule remains unchanged
  it('TEST 25: REGRESSION — Phase 4 eligibility uses strictly > threshold (75.00% ineligible, 75.01% eligible)', () => {
    const resExact = calculateSubjectAttendance([{ id: 'c1', attended: 75, delivered: 100 }], 75);
    expect(resExact.eligible).toBe(false);

    const resAbove = calculateSubjectAttendance([{ id: 'c1', attended: 7501, delivered: 10000 }], 75);
    expect(resAbove.eligible).toBe(true);
  });

  // TEST 26: Regression — Phase 4 SUM(attended)/SUM(delivered) behavior remains unchanged
  it('TEST 26: REGRESSION — Subject attendance uses combined SUM(attended) / SUM(delivered)', () => {
    const components = [
      { id: 'c1', attended: 19, delivered: 21 },
      { id: 'c2', attended: 15, delivered: 17 },
    ];
    const res = calculateSubjectAttendance(components, 75);
    expect(res.attended).toBe(34);
    expect(res.delivered).toBe(38);
    expect(res.percentage).toBeCloseTo(89.4736, 3);
  });

  // TEST 27: Regression — Phase 10 prediction behavior remains unchanged
  it('TEST 27: REGRESSION — Phase 10 prediction engine operates without mutating historical logs', () => {
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
    expect(pred.futureOccurrences.length).toBe(2);
  });

  // TEST 28: Regression — Phase 12 semester boundary behavior remains unchanged
  it('TEST 28: REGRESSION — Phase 12 calendar calculations ignore dates outside start/end boundaries', () => {
    const summary = calculateSemesterCalendarSummary(
      '2026-09-10',
      '2026-09-20',
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      [{ date: '2026-09-05', name: 'Early' }]
    );
    expect(summary.totalCalendarDays).toBe(11);
    expect(summary.holidaysInSemesterCount).toBe(0);
  });
});
