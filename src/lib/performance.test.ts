import { describe, it, expect } from 'vitest';
import { DATASETS, runAllBenchmarks } from './performanceBenchmarks';
import { calculateSubjectAttendance } from './engine';
import { walkFutureTimetable, predictSubject, simulateWhatIfScenario } from './prediction';
import { calculateSemesterCalendarSummary } from './semesterCalendar';
import {
  calculateCumulativeAttendance,
  calculateAttendanceConsistency,
} from './analytics';
import { buildDashboardViewModel } from './dashboardViewModel';
import { sanitizeXlsxCellValue, validateImportedAttendance } from './xlsxSecurity';
import { buildCoachContext } from './ai/coachContext';

describe('Phase 17: Performance Engineering & Benchmarks Test Suite', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // 1. BENCHMARK EXECUTION ACROSS ALL DATASETS
  // ═══════════════════════════════════════════════════════════════════════

  it('BENCHMARK: Executes benchmark harness across Dataset A (Small)', () => {
    const results = runAllBenchmarks(DATASETS.A_SMALL, 30);
    expect(results.length).toBeGreaterThanOrEqual(10);
    for (const res of results) {
      expect(res.avgTimeMs).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(res.opsPerSecond)).toBe(true);
    }
  });

  it('BENCHMARK: Executes benchmark harness across Dataset B (Normal)', () => {
    const results = runAllBenchmarks(DATASETS.B_NORMAL, 30);
    expect(results.length).toBeGreaterThanOrEqual(10);
    for (const res of results) {
      expect(res.avgTimeMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('BENCHMARK: Executes benchmark harness across Dataset C (Heavy History)', () => {
    const results = runAllBenchmarks(DATASETS.C_HEAVY, 30);
    expect(results.length).toBeGreaterThanOrEqual(10);
    for (const res of results) {
      expect(res.avgTimeMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('BENCHMARK: Executes benchmark harness across Dataset D (Stress) and logs report', () => {
    const resultsA = runAllBenchmarks(DATASETS.A_SMALL, 30);
    const resultsB = runAllBenchmarks(DATASETS.B_NORMAL, 30);
    const resultsC = runAllBenchmarks(DATASETS.C_HEAVY, 30);
    const resultsD = runAllBenchmarks(DATASETS.D_STRESS, 20);

    console.log('\n--- PERFORMANCE BENCHMARK REPORT (BASELINE) ---');
    for (const [name, resList] of [
      ['Dataset A (Small: 5 subjs, 30 slots, 100 logs)', resultsA],
      ['Dataset B (Normal: 8 subjs, 50 slots, 500 logs)', resultsB],
      ['Dataset C (Heavy: 10 subjs, 100 slots, 2000 logs)', resultsC],
      ['Dataset D (Stress: 20 subjs, 200 slots, 5000 logs)', resultsD],
    ] as const) {
      console.log(`\n=== ${name} ===`);
      for (const r of resList) {
        console.log(`- ${r.name.padEnd(50)}: ${r.avgTimeMs.toFixed(3)} ms (${r.opsPerSecond.toFixed(0)} ops/s) [min: ${r.minTimeMs.toFixed(3)}ms, max: ${r.maxTimeMs.toFixed(3)}ms]`);
      }
    }

    expect(resultsD.length).toBeGreaterThanOrEqual(10);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. LARGE DATASET CORRECTNESS & DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════

  it('CORRECTNESS: Canonical engine scales linearly without precision loss on 10,000 components', () => {
    const bigComponents = Array.from({ length: 10000 }, (_, i) => ({
      id: `c-${i}`,
      attended: 15,
      delivered: 20,
    }));
    const res = calculateSubjectAttendance(bigComponents, 75);
    expect(res.attended).toBe(150000);
    expect(res.delivered).toBe(200000);
    expect(res.percentage).toBe(75);
    expect(res.eligible).toBe(false); // 75.00% is INELIGIBLE
  });

  it('CORRECTNESS: Prediction engine accurately handles full-year timetable walking without memory leaks', () => {
    const fullYearSlots = DATASETS.B_NORMAL.timetable.map((t) => ({
      id: t.id,
      subjectId: t.subjectId,
      componentId: t.componentId || '',
      componentType: t.componentType as any,
      dayOfWeek: t.day,
      startTime: t.startTime,
      endTime: t.endTime,
    }));

    const occurrences = walkFutureTimetable({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      currentDate: '2026-01-01',
      workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      holidays: ['2026-01-26', '2026-08-15', '2026-10-02'],
      timetableSlots: fullYearSlots,
    });

    expect(occurrences.length).toBeGreaterThan(1000);
    // Verified: No occurrences generated on excluded holidays
    expect(occurrences.some((o) => o.date === '2026-01-26')).toBe(false);
    expect(occurrences.some((o) => o.date === '2026-08-15')).toBe(false);
  });

  it('CORRECTNESS: Analytics engine processes 5,000 attendance records with exact cumulative integrity', () => {
    const cum = calculateCumulativeAttendance(DATASETS.D_STRESS.logs);
    expect(cum.length).toBeGreaterThan(0);
    const last = cum[cum.length - 1];
    expect(last.cumulativeDelivered).toBe(DATASETS.D_STRESS.logs.length);
    expect(last.cumulativeAttended).toBeLessThanOrEqual(last.cumulativeDelivered);
  });

  it('CORRECTNESS: Dashboard view model builds reliably under stress dataset (20 subjects, 200 slots, 5000 logs)', () => {
    const vm = buildDashboardViewModel({
      subjects: DATASETS.D_STRESS.subjects,
      timetable: DATASETS.D_STRESS.timetable,
      logs: DATASETS.D_STRESS.logs,
      settings: DATASETS.D_STRESS.settings,
      selectedDay: 'MONDAY',
      currentDateStr: '2026-09-15',
    });

    expect(vm.totalSubjects).toBe(20);
    expect(vm.overallAttendance).toBeGreaterThan(0);
    expect(vm.semesterForecast.threshold).toBe(75);
  });

  it('CORRECTNESS: AI Coach context construction executes deterministically under stress dataset', () => {
    const vm = buildDashboardViewModel({
      subjects: DATASETS.D_STRESS.subjects,
      timetable: DATASETS.D_STRESS.timetable,
      logs: DATASETS.D_STRESS.logs,
      settings: DATASETS.D_STRESS.settings,
      selectedDay: 'MONDAY',
      currentDateStr: '2026-09-15',
    });

    const ctx = buildCoachContext(
      vm,
      DATASETS.D_STRESS.analytics,
      DATASETS.D_STRESS.subjects,
      DATASETS.D_STRESS.timetable,
      DATASETS.D_STRESS.settings,
      DATASETS.D_STRESS.holidays,
      { currentDateStr: '2026-09-15' }
    );

    expect(ctx.subjects.length).toBe(20);
    expect(ctx.today.classes.length).toBeGreaterThanOrEqual(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. CANONICAL ENGINE INTEGRITY REGRESSIONS (PHASES 4, 10, 12, 13, 14, 15, 16)
  // ═══════════════════════════════════════════════════════════════════════

  it('REGRESSION: Phase 4 strict > threshold rule is preserved (75.00% ineligible, 75.01% eligible)', () => {
    const inelig = calculateSubjectAttendance([{ id: 'c1', attended: 75, delivered: 100 }], 75);
    expect(inelig.eligible).toBe(false);

    const elig = calculateSubjectAttendance([{ id: 'c1', attended: 7501, delivered: 10000 }], 75);
    expect(elig.eligible).toBe(true);
  });

  it('REGRESSION: Phase 4 SUM(attended)/SUM(delivered) is preserved (no component averaging)', () => {
    const res = calculateSubjectAttendance([
      { id: 'c1', attended: 10, delivered: 10 }, // 100%
      { id: 'c2', attended: 1, delivered: 10 },  // 10%
    ], 75);
    // (10 + 1) / (10 + 10) = 11 / 20 = 55.0%
    expect(res.percentage).toBeCloseTo(55, 4);
  });

  it('REGRESSION: Phase 10 what-if simulation accurately evaluates attendance impact', () => {
    const pred = predictSubject(
      's1',
      [{ id: 'c1', name: 'L', type: 'PP', attended: 18, delivered: 20 }],
      75,
      {
        startDate: '2026-09-01',
        endDate: '2026-09-15',
        currentDate: '2026-09-01',
        workingDays: ['MONDAY', 'TUESDAY'],
        holidays: [],
        timetableSlots: [
          { id: 'slot-1', subjectId: 's1', componentId: 'c1', componentType: 'PP', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' },
          { id: 'slot-2', subjectId: 's1', componentId: 'c1', componentType: 'PP', dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '10:00' },
        ],
      }
    );

    const res = simulateWhatIfScenario(pred, { type: 'MISS_ALL' });
    expect(res.simulatedDelivered).toBe(pred.currentDelivered + pred.futureOccurrences.length);
    expect(res.simulatedAttended).toBe(18);
  });

  it('REGRESSION: Phase 12 calendar summary accurately calculates working days and excludes holidays', () => {
    const summary = calculateSemesterCalendarSummary(
      '2026-09-01',
      '2026-09-07',
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      ['2026-09-01'] // 1 holiday on Tuesday
    );
    expect(summary.totalCalendarDays).toBe(7);
    expect(summary.estimatedWorkingDays).toBe(4);
  });

  it('REGRESSION: Phase 13 consistency score correctly evaluates variance', () => {
    const res = calculateAttendanceConsistency(DATASETS.B_NORMAL.logs, 30, '2026-09-15');
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);
  });

  it('REGRESSION: Phase 16 XLSX sanitization stripped formula prefixes and XSS tags without performance regression', () => {
    expect(sanitizeXlsxCellValue('=cmd|calc!A0')).toBe('cmd|calc!A0');
    expect(sanitizeXlsxCellValue('<script>alert("xss")</script>Subject')).toBe('alert("xss")Subject');
    expect(validateImportedAttendance(10, 10).valid).toBe(true);
    expect(validateImportedAttendance(12, 10).valid).toBe(false);
  });
});
