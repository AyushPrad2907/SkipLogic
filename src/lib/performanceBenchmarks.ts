import { calculateSubjectAttendance, bunkLimit, recoveryNeeded, calculateClassSkipImpact } from './engine';
import { walkFutureTimetable, predictSubject } from './prediction';
import { calculateSemesterCalendarSummary, formatLocalDateString } from './semesterCalendar';
import {
  calculateCumulativeAttendance,
  calculateSubjectAnalytics,
  calculateMissedClassAnalysis,
} from './analytics';
import { buildDashboardViewModel } from './dashboardViewModel';
import { sanitizeXlsxCellValue, validateImportedAttendance } from './xlsxSecurity';
import { buildCoachContext } from './ai/coachContext';
import { Subject, TimetableSlot, AttendanceLog, DayOfWeek, SemesterSettings, HolidayItem } from '@/types';
import { AnalyticsViewModel } from '@/hooks/useAnalyticsData';

export interface BenchmarkResult {
  name: string;
  datasetName: string;
  iterations: number;
  totalTimeMs: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  opsPerSecond: number;
}

export interface SyntheticDataset {
  name: string;
  subjects: Subject[];
  timetable: TimetableSlot[];
  logs: AttendanceLog[];
  settings: SemesterSettings;
  holidays: HolidayItem[];
  analytics: AnalyticsViewModel;
}

const WEEKDAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

/**
 * Generates synthetic test data of specified size.
 */
export function generateSyntheticDataset(
  name: string,
  subjectCount: number,
  componentsPerSubject: number,
  slotsPerWeek: number,
  logsCount: number
): SyntheticDataset {
  const subjects: Subject[] = [];
  const timetable: TimetableSlot[] = [];
  const logs: AttendanceLog[] = [];
  const holidays: HolidayItem[] = [];
  const holidayDateStrings: string[] = [];

  // Generate subjects & components
  for (let s = 1; s <= subjectCount; s++) {
    const subId = `subj-${s}`;
    const comps = [];
    let subAttended = 0;
    let subDelivered = 0;

    for (let c = 1; c <= componentsPerSubject; c++) {
      const compId = `comp-${s}-${c}`;
      const attended = 15 + ((s * 7 + c * 3) % 25);
      const delivered = attended + ((s * 3 + c * 2) % 10);
      subAttended += attended;
      subDelivered += delivered;

      comps.push({
        id: compId,
        subjectId: subId,
        name: c === 1 ? 'Theory' : c === 2 ? 'Lab' : 'Tutorial',
        type: (c === 1 ? 'LECTURE' : c === 2 ? 'LAB' : 'TUTORIAL') as any,
        totalAttended: attended,
        totalDelivered: delivered,
        attended,
        delivered,
        currentPercentage: delivered > 0 ? Number(((attended / delivered) * 100).toFixed(2)) : null,
      });
    }

    const pctVal = subDelivered > 0 ? Number(((subAttended / subDelivered) * 100).toFixed(2)) : 0;
    const isEligible = pctVal > 75;

    subjects.push({
      id: subId,
      name: `Subject ${s}`,
      code: `SUB${100 + s}`,
      targetThreshold: 75,
      totalAttended: subAttended,
      totalDelivered: subDelivered,
      currentPercentage: pctVal,
      status: isEligible ? 'SAFE' : 'RISKY',
      bunkLimit: bunkLimit(subAttended, subDelivered, 75),
      recoveryRequired: recoveryNeeded(subAttended, subDelivered, 75),
      components: comps,
    });
  }

  // Generate timetable slots
  for (let slotIdx = 1; slotIdx <= slotsPerWeek; slotIdx++) {
    const subIdx = slotIdx % subjectCount;
    const sub = subjects[subIdx];
    const comp = (sub.components || [])[slotIdx % (sub.components || []).length];
    const day = WEEKDAYS[slotIdx % WEEKDAYS.length];
    const hour = 8 + (slotIdx % 8);
    const startHour = hour < 10 ? `0${hour}` : `${hour}`;
    const endHour = hour + 1 < 10 ? `0${hour + 1}` : `${hour + 1}`;

    timetable.push({
      id: `slot-${slotIdx}`,
      subjectId: sub.id,
      subjectName: sub.name,
      componentId: comp?.id || `comp-${sub.id}-1`,
      componentType: comp?.type || 'LECTURE',
      componentName: comp?.name || 'Theory',
      day,
      startTime: `${startHour}:00`,
      endTime: `${endHour}:00`,
      room: `Room ${100 + (slotIdx % 20)}`,
    });
  }

  // Generate attendance logs
  for (let l = 1; l <= logsCount; l++) {
    const sub = subjects[l % subjectCount];
    const comp = (sub.components || [])[l % (sub.components || []).length];
    const dayOffset = l % 90;
    const logDate = new Date(2026, 7, 1 + dayOffset); // Aug - Nov 2026
    const dateStr = formatLocalDateString(logDate);

    logs.push({
      id: `log-${l}`,
      subjectId: sub.id,
      subjectName: sub.name,
      componentId: comp?.id || `comp-${sub.id}-1`,
      componentType: comp?.type || 'LECTURE',
      status: l % 5 === 0 ? 'MISSED' : 'ATTENDED',
      date: dateStr,
      timestamp: `${dateStr}T10:00:00Z`,
    });
  }

  // Holidays (15 realistic holidays across the semester)
  for (let h = 1; h <= 15; h++) {
    const hDate = new Date(2026, 7, h * 6);
    const dateStr = formatLocalDateString(hDate);
    holidays.push({
      id: `hol-${h}`,
      date: dateStr,
      name: `Holiday ${h}`,
    });
    holidayDateStrings.push(dateStr);
  }

  const settings: SemesterSettings = {
    id: 'sem-1',
    name: 'Fall 2026',
    startDate: '2026-08-01',
    endDate: '2026-11-30',
    targetThreshold: 75,
    workingDays: WEEKDAYS,
    holidays: holidayDateStrings,
    holidayObjects: holidays,
  };

  const analytics: AnalyticsViewModel = {
    periodDays: 14,
    filteredLogs: logs.slice(-100),
    cumulativeTrend: [],
    subjectAnalytics: [],
    componentAnalytics: [],
    missedSummary: { totalMissed: 20, bySubject: [], byComponentType: [], byWeekday: [] },
    periodComparison: {
      periodLabel: 'Last 14 days',
      recentAttended: 40,
      recentDelivered: 50,
      recentPercentage: 80,
      previousAttended: 38,
      previousDelivered: 50,
      previousPercentage: 76,
      percentagePointChange: 4,
      recentMissed: 10,
      previousMissed: 12,
    },
    consistency: { score: 85, rating: 'HIGH', explanation: 'Consistent attendance', weeklyVariance: 2.1 },
    insights: [],
    hasAttendanceData: true,
    totalAttended: 400,
    totalDelivered: 500,
    overallPercentage: 80,
    threshold: 75,
  };

  return { name, subjects, timetable, logs, settings, holidays, analytics };
}

/**
 * Standard datasets for SkipLogic benchmarks.
 */
export const DATASETS = {
  A_SMALL: generateSyntheticDataset('Dataset A (Small)', 5, 2, 30, 100),
  B_NORMAL: generateSyntheticDataset('Dataset B (Normal)', 8, 3, 50, 500),
  C_HEAVY: generateSyntheticDataset('Dataset C (Heavy History)', 10, 3, 100, 2000),
  D_STRESS: generateSyntheticDataset('Dataset D (Stress)', 20, 3, 200, 5000),
};

/**
 * Measures execution time of a synchronous operation over N iterations.
 */
export function measureBenchmark(
  name: string,
  datasetName: string,
  fn: () => void,
  iterations: number = 50
): BenchmarkResult {
  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    fn();
  }

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    const t1 = performance.now();
    times.push(t1 - t0);
  }

  const totalTimeMs = times.reduce((acc, v) => acc + v, 0);
  const avgTimeMs = totalTimeMs / iterations;
  const minTimeMs = Math.min(...times);
  const maxTimeMs = Math.max(...times);
  const opsPerSecond = avgTimeMs > 0 ? 1000 / avgTimeMs : Infinity;

  return {
    name,
    datasetName,
    iterations,
    totalTimeMs,
    avgTimeMs,
    minTimeMs,
    maxTimeMs,
    opsPerSecond,
  };
}

/**
 * Runs the full suite of benchmarks across all core engines and returns summary metrics.
 */
export function runAllBenchmarks(dataset: SyntheticDataset = DATASETS.B_NORMAL, iterations: number = 30): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  // 1. Canonical Attendance Math
  results.push(
    measureBenchmark('Phase 4: calculateSubjectAttendance', dataset.name, () => {
      for (const sub of dataset.subjects) {
        calculateSubjectAttendance(
          (sub.components || []).map((c: any) => ({
            id: c.id,
            attended: c.attended ?? c.totalAttended ?? 0,
            delivered: c.delivered ?? c.totalDelivered ?? 0,
          })),
          75
        );
      }
    }, iterations)
  );

  // 2. Skip Impact Math
  results.push(
    measureBenchmark('Phase 4: calculateClassSkipImpact', dataset.name, () => {
      for (const sub of dataset.subjects) {
        calculateClassSkipImpact(sub.totalAttended, sub.totalDelivered, 75);
      }
    }, iterations)
  );

  // 3. Timetable Walking (Prediction)
  results.push(
    measureBenchmark('Phase 10: walkFutureTimetable', dataset.name, () => {
      walkFutureTimetable({
        startDate: dataset.settings.startDate,
        endDate: dataset.settings.endDate,
        currentDate: '2026-09-15',
        workingDays: dataset.settings.workingDays,
        holidays: dataset.holidays.map((h) => h.date),
        timetableSlots: dataset.timetable.map((t) => ({
          id: t.id,
          subjectId: t.subjectId,
          componentId: t.componentId || '',
          componentType: t.componentType as any,
          dayOfWeek: t.day,
          startTime: t.startTime,
          endTime: t.endTime,
        })),
      });
    }, iterations)
  );

  // 4. Subject Prediction (Full Semester Forecast)
  results.push(
    measureBenchmark('Phase 10: predictSubject (all subjects)', dataset.name, () => {
      const walkerParams = {
        startDate: dataset.settings.startDate,
        endDate: dataset.settings.endDate,
        currentDate: '2026-09-15',
        workingDays: dataset.settings.workingDays,
        holidays: dataset.holidays.map((h) => h.date),
        timetableSlots: dataset.timetable.map((t) => ({
          id: t.id,
          subjectId: t.subjectId,
          componentId: t.componentId || '',
          componentType: t.componentType as any,
          dayOfWeek: t.day,
          startTime: t.startTime,
          endTime: t.endTime,
        })),
      };

      for (const sub of dataset.subjects) {
        predictSubject(
          sub.id,
          (sub.components || []).map((c: any) => ({
            id: c.id,
            type: c.type,
            name: c.name,
            attended: c.attended ?? c.totalAttended ?? 0,
            delivered: c.delivered ?? c.totalDelivered ?? 0,
          })),
          75,
          walkerParams
        );
      }
    }, iterations)
  );

  // 5. Semester Calendar Calculations
  results.push(
    measureBenchmark('Phase 12: calculateSemesterCalendarSummary', dataset.name, () => {
      calculateSemesterCalendarSummary(
        dataset.settings.startDate,
        dataset.settings.endDate,
        dataset.settings.workingDays,
        dataset.holidays.map((h) => h.date)
      );
    }, iterations)
  );

  // 6. Analytics: Cumulative Trend
  results.push(
    measureBenchmark('Phase 13: calculateCumulativeAttendance', dataset.name, () => {
      calculateCumulativeAttendance(dataset.logs);
    }, iterations)
  );

  // 7. Analytics: Missed Summary
  results.push(
    measureBenchmark('Phase 13: calculateMissedClassAnalysis', dataset.name, () => {
      calculateMissedClassAnalysis(dataset.subjects, dataset.logs);
    }, iterations)
  );

  // 8. Analytics: Subject Analytics
  results.push(
    measureBenchmark('Phase 13: calculateSubjectAnalytics', dataset.name, () => {
      calculateSubjectAnalytics(dataset.subjects, dataset.logs, 14);
    }, iterations)
  );

  // 9. Dashboard View Model Construction
  results.push(
    measureBenchmark('Phase 11: buildDashboardViewModel', dataset.name, () => {
      buildDashboardViewModel({
        subjects: dataset.subjects,
        timetable: dataset.timetable,
        logs: dataset.logs,
        settings: dataset.settings,
        selectedDay: 'MONDAY',
        currentDateStr: '2026-09-15',
      });
    }, iterations)
  );

  // 10. AI Coach Context Construction
  const mockDashboard = buildDashboardViewModel({
    subjects: dataset.subjects,
    timetable: dataset.timetable,
    logs: dataset.logs,
    settings: dataset.settings,
    selectedDay: 'MONDAY',
    currentDateStr: '2026-09-15',
  });

  results.push(
    measureBenchmark('Phase 14: buildCoachContext', dataset.name, () => {
      buildCoachContext(
        mockDashboard,
        dataset.analytics,
        dataset.subjects,
        dataset.timetable,
        dataset.settings,
        dataset.holidays,
        { currentDateStr: '2026-09-15' }
      );
    }, iterations)
  );

  // 11. XLSX Sanitization & Validation (1,000 cells)
  results.push(
    measureBenchmark('Phase 16: sanitizeXlsxCellValue (1,000 cells)', dataset.name, () => {
      for (let i = 0; i < 1000; i++) {
        sanitizeXlsxCellValue(i % 5 === 0 ? '=SUM(A1:A10)' : i % 7 === 0 ? '<script>alert(1)</script>Math' : 'Regular Subject Name');
        validateImportedAttendance(15, 20);
      }
    }, iterations)
  );

  return results;
}
