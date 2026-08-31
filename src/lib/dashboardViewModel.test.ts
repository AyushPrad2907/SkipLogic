import { describe, it, expect } from 'vitest';
import { buildDashboardViewModel, DashboardInput } from './dashboardViewModel';
import { Subject, TimetableSlot, SemesterSettings, AttendanceLog } from '@/types';

describe('Phase 11: Dashboard View Model & Decision Intelligence Tests', () => {
  const defaultSettings: SemesterSettings = {
    id: 'sem-1',
    name: 'Fall 2026',
    startDate: '2026-09-01',
    endDate: '2026-12-15',
    targetThreshold: 75,
    workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    holidays: [],
  };

  const sampleSubjects: Subject[] = [
    {
      id: 'sub-ds',
      name: 'Data Structures',
      code: 'CS201',
      targetThreshold: 75,
      totalAttended: 53,
      totalDelivered: 71, // 74.65% (below threshold)
      currentPercentage: 74.65,
      bunkLimit: 0,
      recoveryRequired: 1,
      status: 'MUST_ATTEND',
      components: [
        { id: 'comp-ds-pp', subjectId: 'sub-ds', type: 'LECTURE', name: 'Theory', totalAttended: 35, totalDelivered: 48 },
        { id: 'comp-ds-pr', subjectId: 'sub-ds', type: 'LAB', name: 'Lab', totalAttended: 18, totalDelivered: 23 },
      ],
    },
    {
      id: 'sub-py',
      name: 'Python DAV',
      code: 'CS202',
      targetThreshold: 75,
      totalAttended: 57,
      totalDelivered: 62, // 91.94% (safe)
      currentPercentage: 91.94,
      bunkLimit: 14,
      recoveryRequired: 0,
      status: 'SAFE',
      components: [
        { id: 'comp-py-pp', subjectId: 'sub-py', type: 'LECTURE', name: 'Theory', totalAttended: 40, totalDelivered: 44 },
        { id: 'comp-py-pr', subjectId: 'sub-py', type: 'LAB', name: 'Lab', totalAttended: 17, totalDelivered: 18 },
      ],
    },
  ];

  const sampleTimetable: TimetableSlot[] = [
    {
      id: 'slot-1',
      subjectId: 'sub-ds',
      subjectName: 'Data Structures',
      subjectCode: 'CS201',
      componentId: 'comp-ds-pp',
      componentType: 'LECTURE',
      componentName: 'Theory',
      day: 'MONDAY',
      startTime: '10:00',
      endTime: '11:00',
      room: 'L-101',
    },
    {
      id: 'slot-2',
      subjectId: 'sub-py',
      subjectName: 'Python DAV',
      subjectCode: 'CS202',
      componentId: 'comp-py-pp',
      componentType: 'LECTURE',
      componentName: 'Theory',
      day: 'MONDAY',
      startTime: '14:00',
      endTime: '15:00',
      room: 'L-102',
    },
  ];

  const sampleLogs: AttendanceLog[] = [];

  const defaultInput: DashboardInput = {
    subjects: sampleSubjects,
    timetable: sampleTimetable,
    logs: sampleLogs,
    settings: defaultSettings,
    selectedDay: 'MONDAY',
    currentDateStr: '2026-09-01',
  };

  // 1. Overall Command Center Metrics
  it('computes overall attendance, delivered/attended totals, and threshold safety margin accurately', () => {
    const vm = buildDashboardViewModel(defaultInput);

    // Total Attended: 53 + 57 = 110
    // Total Delivered: 71 + 62 = 133
    // Overall Pct: 110 / 133 = 82.7067 -> 82.71%
    expect(vm.totalAttended).toBe(110);
    expect(vm.totalDelivered).toBe(133);
    expect(vm.overallAttendance).toBe(82.71);
    expect(vm.threshold).toBe(75);
    expect(vm.margin).toBe(7.71); // 82.71 - 75
    expect(vm.overallStatus).toBe('SAFE');
  });

  // 2. Today's Decisions & Most Important Class
  it('calculates class skip impacts and deterministically selects the Most Important Class', () => {
    const vm = buildDashboardViewModel(defaultInput);

    expect(vm.todayClasses.length).toBe(2);

    const dsClass = vm.todayClasses.find((c) => c.subjectId === 'sub-ds')!;
    const pyClass = vm.todayClasses.find((c) => c.subjectId === 'sub-py')!;

    // Data Structures current: 53 / 71 = 74.65%
    // If skipped: 53 / 72 = 73.61% <= 75% -> MUST_ATTEND
    expect(dsClass.ifSkippedPercentage).toBe(73.61);
    expect(dsClass.skipImpactRecommendation).toBe('MUST_ATTEND');
    expect(dsClass.explanation).toContain('drops this subject to 73.61%');

    // Python DAV current: 57 / 62 = 91.94%
    // If skipped: 57 / 63 = 90.48% > 75% -> SAFE
    expect(pyClass.ifSkippedPercentage).toBe(90.48);
    expect(pyClass.skipImpactRecommendation).toBe('SAFE');

    // Most Important Today should be Data Structures (in danger / creates threshold breach)
    expect(vm.mostImportantTodayClass?.subjectId).toBe('sub-ds');
    expect(dsClass.isMostImportant).toBe(true);
    expect(pyClass.isMostImportant).toBe(false);
  });

  // 3. Subject Prioritization
  it('prioritizes subjects strictly by urgency (MUST_ATTEND before SAFE)', () => {
    const vm = buildDashboardViewModel(defaultInput);

    expect(vm.prioritizedSubjects.length).toBe(2);
    expect(vm.prioritizedSubjects[0].subjectId).toBe('sub-ds');
    expect(vm.prioritizedSubjects[1].subjectId).toBe('sub-py');
  });

  // 4. Recovery Alerts
  it('generates recovery alerts for subjects below threshold', () => {
    const vm = buildDashboardViewModel(defaultInput);

    expect(vm.recoveryAlerts.length).toBe(1);
    expect(vm.recoveryAlerts[0].subjectId).toBe('sub-ds');
    expect(vm.recoveryAlerts[0].recoverable).toBe(true);
    expect(vm.recoveryAlerts[0].classesNeeded).toBeGreaterThan(0);
  });

  // 5. Empty State Flags
  it('correctly sets empty state flags when data is absent', () => {
    const emptyVm = buildDashboardViewModel({
      subjects: [],
      timetable: [],
      logs: [],
      settings: defaultSettings,
      selectedDay: 'MONDAY',
      currentDateStr: '2026-09-01',
    });

    expect(emptyVm.hasActiveSemester).toBe(true);
    expect(emptyVm.hasSubjects).toBe(false);
    expect(emptyVm.hasTimetable).toBe(false);
    expect(emptyVm.hasAttendance).toBe(false);
    expect(emptyVm.overallAttendance).toBeNull();
  });
});
