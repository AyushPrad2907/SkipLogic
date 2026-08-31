import { DashboardViewModel } from '@/lib/dashboardViewModel';
import { AnalyticsViewModel } from '@/hooks/useAnalyticsData';
import { Subject, TimetableSlot, SemesterSettings, HolidayItem } from '@/types';
import { formatLocalDateString, parseLocalDateString, getDayOfWeekFromDateString } from '@/lib/semesterCalendar';

export interface CoachSubjectContext {
  subjectId: string;
  subjectName: string;
  code?: string;
  percentage: number | null;
  attended: number;
  delivered: number;
  status: string;
  safetyMargin: number | null;
  bunkLimit: number;
  recoveryRequired: number;
  recoverability?: string;
  recoveryDate?: string;
}

export interface StructuredCoachContext {
  studentAttendance: {
    overallPercentage: number | null;
    totalAttended: number;
    totalDelivered: number;
    threshold: number;
    safetyMargin: number | null;
    status: string;
  };
  today: {
    date: string;
    dayOfWeek: string;
    classesCount: number;
    classes: {
      subjectName: string;
      componentType: string;
      startTime: string;
      endTime: string;
      explanation: string;
      recommendation: string;
    }[];
    mostImportantClass?: {
      subjectName: string;
      explanation: string;
    };
  };
  tomorrow?: {
    date: string;
    dayOfWeek: string;
    classesCount: number;
    classes: {
      subjectName: string;
      componentType: string;
      startTime: string;
      endTime: string;
      canBunk: boolean;
      skipImpactPct: number | null;
    }[];
  };
  subjects: CoachSubjectContext[];
  predictions?: {
    bestPossible: number | null;
    worstPossible: number | null;
  };
  analytics?: {
    recentPercentage: number | null;
    previousPercentage: number | null;
    percentagePointChange: number | null;
    missedClasses: number;
    consistencyScore: number;
    topAbsenceComponent?: string;
  };
  calendar?: {
    semesterStart?: string;
    semesterEnd?: string;
    workingDays: string[];
    upcomingHolidaysCount: number;
  };
  whatIfScenario?: {
    scenario: string;
    subjectName?: string;
    n: number;
    currentPercentage: number | null;
    simulatedPercentage: number | null;
    threshold: number;
    remainsEligible: boolean;
  };
}

export interface ContextBuildOptions {
  intent?: string;
  targetSubjectId?: string;
  whatIfMissN?: number;
  whatIfAttendN?: number;
  currentDateStr?: string;
}

/**
 * Builds structured, factual SkipLogic context for the AI Attendance Coach.
 * Consumes already-calculated values from Phase 4, 10, 11, 12, and 13.
 */
export function buildCoachContext(
  dashboard: DashboardViewModel,
  analytics: AnalyticsViewModel,
  subjects: Subject[],
  timetable: TimetableSlot[],
  settings: SemesterSettings,
  holidays: HolidayItem[],
  options?: ContextBuildOptions
): StructuredCoachContext {
  const todayStr = options?.currentDateStr || formatLocalDateString(new Date());

  // 1. Overall Student Attendance from Dashboard View Model
  const overallPercentage = dashboard.overallAttendance;
  const threshold = dashboard.threshold;
  const safetyMargin = dashboard.margin;
  const overallStatus = dashboard.overallStatus;

  // 2. Today's classes
  const todayDayOfWeek = getDayOfWeekFromDateString(todayStr);
  const todayClasses = dashboard.todayClasses.map((cls) => ({
    subjectName: cls.subjectName,
    componentType: cls.componentType,
    startTime: cls.startTime,
    endTime: cls.endTime,
    explanation: cls.explanation,
    recommendation: cls.skipImpactRecommendation,
  }));

  const mostImportantClass = dashboard.mostImportantTodayClass
    ? {
        subjectName: dashboard.mostImportantTodayClass.subjectName,
        explanation: dashboard.mostImportantTodayClass.explanation,
      }
    : undefined;

  // 3. Tomorrow's classes
  const tomorrowDate = new Date(parseLocalDateString(todayStr).getTime() + 86400000);
  const tomorrowStr = formatLocalDateString(tomorrowDate);
  const tomorrowDayOfWeek = getDayOfWeekFromDateString(tomorrowStr);

  const tomorrowSlots = timetable.filter((t) => t.day === tomorrowDayOfWeek);
  const tomorrowClasses = tomorrowSlots.map((slot) => {
    const sub = subjects.find((s) => s.id === slot.subjectId);
    const del = sub?.totalDelivered ?? 0;
    const att = sub?.totalAttended ?? 0;
    const skipImpact = del + 1 > 0 ? Number(((att / (del + 1)) * 100).toFixed(2)) : null;
    const canBunk = skipImpact !== null ? skipImpact > threshold : true;

    return {
      subjectName: sub?.name || slot.subjectName || 'Class',
      componentType: slot.componentType,
      startTime: slot.startTime,
      endTime: slot.endTime,
      canBunk,
      skipImpactPct: skipImpact,
    };
  });

  // 4. Subjects
  const subjectContexts: CoachSubjectContext[] = subjects.map((sub) => {
    const margin = sub.currentPercentage !== null ? Number((sub.currentPercentage - threshold).toFixed(2)) : null;
    return {
      subjectId: sub.id,
      subjectName: sub.name,
      code: sub.code,
      percentage: sub.currentPercentage,
      attended: sub.totalAttended,
      delivered: sub.totalDelivered,
      status: sub.status,
      safetyMargin: margin,
      bunkLimit: sub.bunkLimit,
      recoveryRequired: sub.recoveryRequired,
    };
  });

  // 5. Predictions & Forecast
  const predictions = {
    bestPossible: dashboard.semesterForecast.bestPossiblePercentage,
    worstPossible: dashboard.semesterForecast.worstPossiblePercentage,
  };

  // 6. Analytics
  const analyticsContext = {
    recentPercentage: analytics.periodComparison.recentPercentage,
    previousPercentage: analytics.periodComparison.previousPercentage,
    percentagePointChange: analytics.periodComparison.percentagePointChange,
    missedClasses: analytics.missedSummary.totalMissed,
    consistencyScore: analytics.consistency.score,
    topAbsenceComponent: analytics.missedSummary.byComponentType[0]?.componentType,
  };

  // 7. Calendar
  const calendarContext = {
    semesterStart: settings.startDate,
    semesterEnd: settings.endDate,
    workingDays: settings.workingDays || [],
    upcomingHolidaysCount: holidays.filter((h) => h.date >= todayStr).length,
  };

  // 8. What-If Simulation (if applicable)
  let whatIfScenario;
  if (options?.whatIfMissN && options.whatIfMissN > 0) {
    const n = options.whatIfMissN;
    const targetSub = options.targetSubjectId
      ? subjects.find((s) => s.id === options.targetSubjectId)
      : subjects[0];

    if (targetSub) {
      const att = targetSub.totalAttended;
      const del = targetSub.totalDelivered + n;
      const simulatedPct = del > 0 ? Number(((att / del) * 100).toFixed(2)) : null;
      const remainsEligible = simulatedPct !== null ? simulatedPct > threshold : false;

      whatIfScenario = {
        scenario: `MISS_${n}_CLASSES`,
        subjectName: targetSub.name,
        n,
        currentPercentage: targetSub.currentPercentage,
        simulatedPercentage: simulatedPct,
        threshold,
        remainsEligible,
      };
    }
  }

  return {
    studentAttendance: {
      overallPercentage,
      totalAttended: dashboard.totalAttended,
      totalDelivered: dashboard.totalDelivered,
      threshold,
      safetyMargin,
      status: overallStatus,
    },
    today: {
      date: todayStr,
      dayOfWeek: todayDayOfWeek,
      classesCount: todayClasses.length,
      classes: todayClasses,
      mostImportantClass,
    },
    tomorrow: {
      date: tomorrowStr,
      dayOfWeek: tomorrowDayOfWeek,
      classesCount: tomorrowClasses.length,
      classes: tomorrowClasses,
    },
    subjects: subjectContexts,
    predictions,
    analytics: analyticsContext,
    calendar: calendarContext,
    whatIfScenario,
  };
}
