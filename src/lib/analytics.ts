import { Subject, AttendanceLog, DayOfWeek, SubjectComponentType } from '@/types';
import { pct } from './engine';
import { parseLocalDateString, formatLocalDateString, getDayOfWeekFromDateString } from './semesterCalendar';

export type TrendStatus = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';

export type PeriodFilterOption = '7d' | '14d' | '30d' | 'SEMESTER' | 'CUSTOM';

export interface DateRangeInput {
  startDate?: string;
  endDate?: string;
}

export interface CumulativeTrendPoint {
  date: string;
  attended: number;
  delivered: number;
  cumulativeAttended: number;
  cumulativeDelivered: number;
  cumulativePercentage: number | null;
}

export interface SubjectAnalyticsItem {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  color?: string;
  currentPercentage: number | null;
  totalAttended: number;
  totalDelivered: number;
  periodAttended: number;
  periodDelivered: number;
  periodPercentage: number | null;
  previousPeriodPercentage: number | null;
  percentagePointChange: number | null;
  missedInPeriod: number;
  trend: TrendStatus;
  strongestComponent?: { name: string; percentage: number };
  weakestComponent?: { name: string; percentage: number };
}

export interface ComponentAnalyticsItem {
  componentId: string;
  subjectId: string;
  subjectName: string;
  componentType: SubjectComponentType;
  componentName?: string;
  attended: number;
  delivered: number;
  percentage: number | null;
  missed: number;
  trend: TrendStatus;
}

export interface MissedClassSummary {
  totalMissed: number;
  bySubject: { subjectId: string; subjectName: string; count: number }[];
  byComponentType: { componentType: SubjectComponentType; count: number }[];
  byWeekday: { day: DayOfWeek; count: number }[];
}

export interface PeriodComparisonResult {
  periodLabel: string;
  recentAttended: number;
  recentDelivered: number;
  recentPercentage: number | null;
  previousAttended: number;
  previousDelivered: number;
  previousPercentage: number | null;
  percentagePointChange: number | null;
  recentMissed: number;
  previousMissed: number;
}

export interface AttendanceConsistencyResult {
  score: number; // 0 - 100
  rating: 'HIGH' | 'MODERATE' | 'NEEDS_ATTENTION' | 'INSUFFICIENT_DATA';
  explanation: string;
  weeklyVariance: number;
}

export interface AttendanceInsightItem {
  id: string;
  category: 'POSITIVE' | 'WARNING' | 'INFO';
  title: string;
  message: string;
}

/**
 * Filter attendance logs by subject, component, date range, and semester.
 */
export function filterAttendanceLogs(
  logs: AttendanceLog[],
  filters: {
    semesterId?: string;
    subjectId?: string;
    componentType?: string;
    startDate?: string;
    endDate?: string;
  }
): AttendanceLog[] {
  return logs.filter((log) => {
    if (filters.semesterId && log.semesterId && log.semesterId !== filters.semesterId) {
      return false;
    }
    if (filters.subjectId && filters.subjectId !== 'ALL' && log.subjectId !== filters.subjectId) {
      return false;
    }
    if (filters.componentType && filters.componentType !== 'ALL' && log.componentType !== filters.componentType) {
      return false;
    }
    if (filters.startDate && log.date < filters.startDate) {
      return false;
    }
    if (filters.endDate && log.date > filters.endDate) {
      return false;
    }
    return true;
  });
}

/**
 * Calculates cumulative attendance progression over time.
 * Enforces SUM(attended) / SUM(delivered) raw mathematical totals.
 */
export function calculateCumulativeAttendance(logs: AttendanceLog[]): CumulativeTrendPoint[] {
  if (logs.length === 0) return [];

  // Group logs by date
  const dateMap = new Map<string, { attended: number; delivered: number }>();

  for (const log of logs) {
    if (!log.date) continue;
    const existing = dateMap.get(log.date) || { attended: 0, delivered: 0 };
    existing.delivered += 1;
    if (log.status === 'ATTENDED') {
      existing.attended += 1;
    }
    dateMap.set(log.date, existing);
  }

  const sortedDates = Array.from(dateMap.keys()).sort();

  let cumulativeAttended = 0;
  let cumulativeDelivered = 0;

  const result: CumulativeTrendPoint[] = [];

  for (const date of sortedDates) {
    const dayData = dateMap.get(date)!;
    cumulativeAttended += dayData.attended;
    cumulativeDelivered += dayData.delivered;

    const rawPct = pct(cumulativeAttended, cumulativeDelivered);
    const cumulativePercentage = rawPct !== null ? Number(rawPct.toFixed(2)) : null;

    result.push({
      date,
      attended: dayData.attended,
      delivered: dayData.delivered,
      cumulativeAttended,
      cumulativeDelivered,
      cumulativePercentage,
    });
  }

  return result;
}

/**
 * Classifies attendance trend deterministically based on percentage point diff.
 */
export function classifyTrend(
  currentPct: number | null,
  previousPct: number | null,
  deliveredCount: number
): TrendStatus {
  if (deliveredCount < 3 || currentPct === null || previousPct === null) {
    return 'INSUFFICIENT_DATA';
  }

  const diff = currentPct - previousPct;
  if (diff >= 2.0) return 'IMPROVING';
  if (diff <= -2.0) return 'DECLINING';
  return 'STABLE';
}

/**
 * Calculates subject performance analytics.
 */
export function calculateSubjectAnalytics(
  subjects: Subject[],
  logs: AttendanceLog[],
  periodDays: number = 14,
  currentDateStr?: string
): SubjectAnalyticsItem[] {
  const today = currentDateStr || formatLocalDateString(new Date());

  const periodStart = formatLocalDateString(
    new Date(parseLocalDateString(today).getTime() - (periodDays - 1) * 86400000)
  );
  const prevPeriodStart = formatLocalDateString(
    new Date(parseLocalDateString(today).getTime() - (periodDays * 2 - 1) * 86400000)
  );

  // Performance Optimization (Phase 17): Single-pass log partitioning by subject
  const subjectPeriodMap = new Map<string, { currAtt: number; currDel: number; prevAtt: number; prevDel: number }>();
  for (const l of logs) {
    if (!l.subjectId) continue;
    let entry = subjectPeriodMap.get(l.subjectId);
    if (!entry) {
      entry = { currAtt: 0, currDel: 0, prevAtt: 0, prevDel: 0 };
      subjectPeriodMap.set(l.subjectId, entry);
    }
    if (l.date >= periodStart && l.date <= today) {
      entry.currDel += 1;
      if (l.status === 'ATTENDED') entry.currAtt += 1;
    } else if (l.date >= prevPeriodStart && l.date < periodStart) {
      entry.prevDel += 1;
      if (l.status === 'ATTENDED') entry.prevAtt += 1;
    }
  }

  return subjects.map((sub) => {
    const entry = subjectPeriodMap.get(sub.id) || { currAtt: 0, currDel: 0, prevAtt: 0, prevDel: 0 };

    const periodAttended = entry.currAtt;
    const periodDelivered = entry.currDel;
    const periodPctRaw = pct(periodAttended, periodDelivered);
    const periodPercentage = periodPctRaw !== null ? Number(periodPctRaw.toFixed(2)) : null;

    const prevAttended = entry.prevAtt;
    const prevDelivered = entry.prevDel;
    const prevPctRaw = pct(prevAttended, prevDelivered);
    const previousPeriodPercentage = prevPctRaw !== null ? Number(prevPctRaw.toFixed(2)) : null;

    const percentagePointChange =
      periodPercentage !== null && previousPeriodPercentage !== null
        ? Number((periodPercentage - previousPeriodPercentage).toFixed(2))
        : null;

    const missedInPeriod = periodDelivered - periodAttended;
    const trend = classifyTrend(periodPercentage, previousPeriodPercentage, periodDelivered);

    // Component strengths/weaknesses
    let strongestComponent: { name: string; percentage: number } | undefined;
    let weakestComponent: { name: string; percentage: number } | undefined;

    if (sub.components && sub.components.length > 0) {
      const compStats = sub.components
        .map((c) => {
          const compPct = pct(c.totalAttended, c.totalDelivered);
          return {
            name: c.name || c.type,
            percentage: compPct !== null ? Number(compPct.toFixed(2)) : 100,
            delivered: c.totalDelivered,
          };
        })
        .filter((c) => c.delivered > 0);

      if (compStats.length > 0) {
        compStats.sort((a, b) => b.percentage - a.percentage);
        strongestComponent = { name: compStats[0].name, percentage: compStats[0].percentage };
        weakestComponent = {
          name: compStats[compStats.length - 1].name,
          percentage: compStats[compStats.length - 1].percentage,
        };
      }
    }

    return {
      subjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      color: sub.color,
      currentPercentage: sub.currentPercentage,
      totalAttended: sub.totalAttended,
      totalDelivered: sub.totalDelivered,
      periodAttended,
      periodDelivered,
      periodPercentage,
      previousPeriodPercentage,
      percentagePointChange,
      missedInPeriod,
      trend,
      strongestComponent,
      weakestComponent,
    };
  });
}

/**
 * Calculates component-level analytics across subjects.
 */
export function calculateComponentAnalytics(
  subjects: Subject[],
  logs: AttendanceLog[],
  periodDays: number = 14,
  currentDateStr?: string
): ComponentAnalyticsItem[] {
  const today = currentDateStr || formatLocalDateString(new Date());
  const periodStart = formatLocalDateString(
    new Date(parseLocalDateString(today).getTime() - (periodDays - 1) * 86400000)
  );
  const prevPeriodStart = formatLocalDateString(
    new Date(parseLocalDateString(today).getTime() - (periodDays * 2 - 1) * 86400000)
  );

  // Performance Optimization (Phase 17): Single-pass log partitioning by component
  const compPeriodMap = new Map<string, { currAtt: number; currDel: number; prevAtt: number; prevDel: number }>();
  for (const l of logs) {
    if (!l.componentId) continue;
    let entry = compPeriodMap.get(l.componentId);
    if (!entry) {
      entry = { currAtt: 0, currDel: 0, prevAtt: 0, prevDel: 0 };
      compPeriodMap.set(l.componentId, entry);
    }
    if (l.date >= periodStart && l.date <= today) {
      entry.currDel += 1;
      if (l.status === 'ATTENDED') entry.currAtt += 1;
    } else if (l.date >= prevPeriodStart && l.date < periodStart) {
      entry.prevDel += 1;
      if (l.status === 'ATTENDED') entry.prevAtt += 1;
    }
  }

  const items: ComponentAnalyticsItem[] = [];

  for (const sub of subjects) {
    const comps = sub.components || [];
    for (const comp of comps) {
      const entry = compPeriodMap.get(comp.id) || { currAtt: 0, currDel: 0, prevAtt: 0, prevDel: 0 };

      const periodAttended = entry.currAtt;
      const periodDelivered = entry.currDel;
      const periodPct = pct(periodAttended, periodDelivered);

      const prevAttended = entry.prevAtt;
      const prevDelivered = entry.prevDel;
      const prevPct = pct(prevAttended, prevDelivered);

      const overallPctRaw = pct(comp.totalAttended, comp.totalDelivered);
      const overallPercentage = overallPctRaw !== null ? Number(overallPctRaw.toFixed(2)) : null;

      const trend = classifyTrend(periodPct, prevPct, periodDelivered);

      items.push({
        componentId: comp.id,
        subjectId: sub.id,
        subjectName: sub.name,
        componentType: comp.type,
        componentName: comp.name,
        attended: comp.totalAttended,
        delivered: comp.totalDelivered,
        percentage: overallPercentage,
        missed: comp.totalDelivered - comp.totalAttended,
        trend,
      });
    }
  }

  return items;
}

/**
 * Calculates missed-class distribution by subject, component, and weekday.
 */
export function calculateMissedClassAnalysis(
  subjects: Subject[],
  logs: AttendanceLog[]
): MissedClassSummary {
  const missedLogs = logs.filter((l) => l.status === 'MISSED');
  const totalMissed = missedLogs.length;

  // By Subject
  const subjectMap = new Map<string, { name: string; count: number }>();
  for (const sub of subjects) {
    subjectMap.set(sub.id, { name: sub.name, count: 0 });
  }

  // By Component Type
  const compMap = new Map<SubjectComponentType, number>();
  const weekdaysMap = new Map<DayOfWeek, number>([
    ['MONDAY', 0],
    ['TUESDAY', 0],
    ['WEDNESDAY', 0],
    ['THURSDAY', 0],
    ['FRIDAY', 0],
    ['SATURDAY', 0],
    ['SUNDAY', 0],
  ]);

  for (const log of missedLogs) {
    // Subject count
    if (log.subjectId && subjectMap.has(log.subjectId)) {
      const entry = subjectMap.get(log.subjectId)!;
      entry.count += 1;
    }

    // Component count
    if (log.componentType) {
      compMap.set(log.componentType, (compMap.get(log.componentType) || 0) + 1);
    }

    // Weekday count
    if (log.date) {
      const day = getDayOfWeekFromDateString(log.date);
      weekdaysMap.set(day, (weekdaysMap.get(day) || 0) + 1);
    }
  }

  const bySubject = Array.from(subjectMap.entries())
    .map(([subjectId, { name, count }]) => ({ subjectId, subjectName: name, count }))
    .sort((a, b) => b.count - a.count);

  const byComponentType = Array.from(compMap.entries())
    .map(([componentType, count]) => ({ componentType, count }))
    .sort((a, b) => b.count - a.count);

  const byWeekday = Array.from(weekdaysMap.entries()).map(([day, count]) => ({
    day,
    count,
  }));

  return {
    totalMissed,
    bySubject,
    byComponentType,
    byWeekday,
  };
}

/**
 * Calculates side-by-side period comparison (e.g. Last 7 Days vs Previous 7 Days).
 */
export function calculatePeriodComparison(
  logs: AttendanceLog[],
  periodDays: number = 7,
  currentDateStr?: string
): PeriodComparisonResult {
  const today = currentDateStr || formatLocalDateString(new Date());

  const recentStart = formatLocalDateString(
    new Date(parseLocalDateString(today).getTime() - (periodDays - 1) * 86400000)
  );
  const previousStart = formatLocalDateString(
    new Date(parseLocalDateString(today).getTime() - (periodDays * 2 - 1) * 86400000)
  );

  const recentLogs = logs.filter((l) => l.date >= recentStart && l.date <= today);
  const previousLogs = logs.filter((l) => l.date >= previousStart && l.date < recentStart);

  const recentAttended = recentLogs.filter((l) => l.status === 'ATTENDED').length;
  const recentDelivered = recentLogs.length;
  const recentPctRaw = pct(recentAttended, recentDelivered);
  const recentPercentage = recentPctRaw !== null ? Number(recentPctRaw.toFixed(2)) : null;

  const previousAttended = previousLogs.filter((l) => l.status === 'ATTENDED').length;
  const previousDelivered = previousLogs.length;
  const previousPctRaw = pct(previousAttended, previousDelivered);
  const previousPercentage = previousPctRaw !== null ? Number(previousPctRaw.toFixed(2)) : null;

  const percentagePointChange =
    recentPercentage !== null && previousPercentage !== null
      ? Number((recentPercentage - previousPercentage).toFixed(2))
      : null;

  const recentMissed = recentDelivered - recentAttended;
  const previousMissed = previousDelivered - previousAttended;

  const periodLabel = `Last ${periodDays} Days vs Previous ${periodDays} Days`;

  return {
    periodLabel,
    recentAttended,
    recentDelivered,
    recentPercentage,
    previousAttended,
    previousDelivered,
    previousPercentage,
    percentagePointChange,
    recentMissed,
    previousMissed,
  };
}

/**
 * Calculates deterministic Attendance Consistency (Stability) score.
 * Formula: 100 - (Standard Deviation of Weekly Attendance Rates * 1.5)
 * Score is bounded strictly between 0 and 100.
 */
export function calculateAttendanceConsistency(
  logs: AttendanceLog[],
  windowDays: number = 30,
  currentDateStr?: string
): AttendanceConsistencyResult {
  if (logs.length < 5) {
    return {
      score: 100,
      rating: 'INSUFFICIENT_DATA',
      explanation: 'Not enough logged classes to evaluate consistency.',
      weeklyVariance: 0,
    };
  }

  const today = currentDateStr || formatLocalDateString(new Date());
  const windowStart = formatLocalDateString(
    new Date(parseLocalDateString(today).getTime() - (windowDays - 1) * 86400000)
  );

  const recentLogs = logs.filter((l) => l.date >= windowStart && l.date <= today);
  if (recentLogs.length < 3) {
    return {
      score: 100,
      rating: 'INSUFFICIENT_DATA',
      explanation: 'Fewer than 3 classes in recent window.',
      weeklyVariance: 0,
    };
  }

  // Group into weekly buckets
  const weeklyMap = new Map<number, { attended: number; delivered: number }>();
  for (const log of recentLogs) {
    const date = parseLocalDateString(log.date);
    if (Number.isNaN(date.getTime())) continue;

    // Week index from start
    const dayDiff = Math.floor((date.getTime() - parseLocalDateString(windowStart).getTime()) / 86400000);
    const weekIdx = Math.floor(dayDiff / 7);

    const existing = weeklyMap.get(weekIdx) || { attended: 0, delivered: 0 };
    existing.delivered += 1;
    if (log.status === 'ATTENDED') {
      existing.attended += 1;
    }
    weeklyMap.set(weekIdx, existing);
  }

  const weeklyRates: number[] = [];
  for (const w of weeklyMap.values()) {
    if (w.delivered > 0) {
      weeklyRates.push((w.attended / w.delivered) * 100);
    }
  }

  if (weeklyRates.length <= 1) {
    const overallPct = (recentLogs.filter((l) => l.status === 'ATTENDED').length / recentLogs.length) * 100;
    return {
      score: Math.round(overallPct),
      rating: overallPct >= 85 ? 'HIGH' : overallPct >= 75 ? 'MODERATE' : 'NEEDS_ATTENTION',
      explanation: 'Evaluated over single week sample.',
      weeklyVariance: 0,
    };
  }

  // Mean
  const mean = weeklyRates.reduce((sum, r) => sum + r, 0) / weeklyRates.length;

  // Standard Deviation
  const variance = weeklyRates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / weeklyRates.length;
  const stdDev = Math.sqrt(variance);

  // Consistency Score formula
  const rawScore = Math.max(0, Math.min(100, Math.round(100 - stdDev * 1.2)));
  const weeklyVariance = Number(stdDev.toFixed(2));

  let rating: 'HIGH' | 'MODERATE' | 'NEEDS_ATTENTION' | 'INSUFFICIENT_DATA' = 'HIGH';
  if (rawScore >= 85) rating = 'HIGH';
  else if (rawScore >= 70) rating = 'MODERATE';
  else rating = 'NEEDS_ATTENTION';

  const explanation = `Score of ${rawScore}% calculated from weekly attendance stability (std. dev: ${weeklyVariance}%).`;

  return {
    score: rawScore,
    rating,
    explanation,
    weeklyVariance,
  };
}

/**
 * Generates deterministic analytical insights from persisted records.
 */
export function generateAttendanceInsights(
  subjects: Subject[],
  logs: AttendanceLog[],
  periodDays: number = 14,
  currentDateStr?: string
): AttendanceInsightItem[] {
  const insights: AttendanceInsightItem[] = [];
  if (logs.length === 0 || subjects.length === 0) return insights;

  const comparison = calculatePeriodComparison(logs, periodDays, currentDateStr);

  // 1. Period attendance summary
  if (comparison.recentPercentage !== null && comparison.recentDelivered >= 3) {
    insights.push({
      id: 'ins-1',
      category: comparison.recentPercentage >= 75 ? 'POSITIVE' : 'WARNING',
      title: 'Recent Attendance Rate',
      message: `You attended ${comparison.recentPercentage}% of your classes over the last ${periodDays} days (${comparison.recentAttended} / ${comparison.recentDelivered}).`,
    });
  }

  // 2. Trend direction
  if (comparison.percentagePointChange !== null && Math.abs(comparison.percentagePointChange) >= 1) {
    const isImprovement = comparison.percentagePointChange > 0;
    insights.push({
      id: 'ins-2',
      category: isImprovement ? 'POSITIVE' : 'WARNING',
      title: isImprovement ? 'Improving Trajectory' : 'Declining Trajectory',
      message: `Your attendance has ${isImprovement ? 'improved' : 'declined'} by ${Math.abs(comparison.percentagePointChange)} percentage points compared to the previous ${periodDays} days.`,
    });
  }

  // 3. Strongest & Weakest Subjects
  const subjectAnalytics = calculateSubjectAnalytics(subjects, logs, periodDays, currentDateStr);
  const activeSubs = subjectAnalytics.filter((s) => s.totalDelivered > 0);

  if (activeSubs.length > 0) {
    const sorted = [...activeSubs].sort((a, b) => (b.currentPercentage ?? 0) - (a.currentPercentage ?? 0));
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    if (strongest.currentPercentage !== null) {
      insights.push({
        id: 'ins-3',
        category: 'POSITIVE',
        title: 'Strongest Subject',
        message: `${strongest.subjectName} is currently your highest attendance subject at ${strongest.currentPercentage}%.`,
      });
    }

    if (weakest.currentPercentage !== null && weakest.subjectId !== strongest.subjectId) {
      insights.push({
        id: 'ins-4',
        category: weakest.currentPercentage <= 75 ? 'WARNING' : 'INFO',
        title: 'Subject Needing Attention',
        message: `${weakest.subjectName} has your lowest attendance at ${weakest.currentPercentage}%.`,
      });
    }
  }

  // 4. Component Absences Breakdown
  const missedSummary = calculateMissedClassAnalysis(subjects, logs);
  if (missedSummary.byComponentType.length > 0 && missedSummary.totalMissed > 0) {
    const topComp = missedSummary.byComponentType[0];
    const compPct = Math.round((topComp.count / missedSummary.totalMissed) * 100);
    insights.push({
      id: 'ins-5',
      category: 'INFO',
      title: 'Absence Component Analysis',
      message: `${topComp.componentType} classes account for ${compPct}% (${topComp.count} classes) of your total absences.`,
    });
  }

  return insights;
}
