import {
  Subject,
  TimetableSlot,
  SemesterSettings,
  AttendanceLog,
  SubjectComponentType,
  DayOfWeek,
} from '@/types';
import {
  pct,
  calculateClassSkipImpact,
  Recommendation,
} from './engine';
import {
  predictSubject,
  SubjectPredictionResult,
  FutureClassOccurrence,
} from './prediction';

export interface TodayDecisionItem {
  slotId: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  componentId: string;
  componentType: SubjectComponentType;
  componentName?: string;
  startTime: string;
  endTime: string;
  room?: string;
  faculty?: string;
  currentPercentage: number | null;
  currentAttended: number;
  currentDelivered: number;
  ifAttendedPercentage: number;
  ifSkippedPercentage: number;
  skipImpactRecommendation: Recommendation;
  explanation: string;
  currentStatus: 'ATTENDED' | 'MISSED' | null;
  isMostImportant: boolean;
}

export interface SubjectRiskSummary {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  color?: string;
  currentPercentage: number | null;
  currentAttended: number;
  currentDelivered: number;
  threshold: number;
  status: 'SAFE' | 'RISKY' | 'MUST_ATTEND' | 'UNRECOVERABLE' | 'NEUTRAL';
  safeBunksCount: number;
  recoveryNeededCount: number;
  forecastPercentage: number | null;
  prediction: SubjectPredictionResult;
}

export interface RecoveryAlertItem {
  subjectId: string;
  subjectName: string;
  currentPercentage: number | null;
  threshold: number;
  classesNeeded: number;
  recoveryDate: string | null;
  recoverable: boolean;
  bestPossiblePercentage: number | null;
}

export interface SafeBunkOpportunityItem {
  subjectId: string;
  subjectName: string;
  safeBunkCount: number;
  opportunities: FutureClassOccurrence[];
}

export interface SemesterForecastSummary {
  currentPercentage: number | null;
  bestPossiblePercentage: number | null;
  worstPossiblePercentage: number | null;
  threshold: number;
}

export interface DashboardViewModel {
  // Command Center Top Stats
  overallAttendance: number | null;
  totalAttended: number;
  totalDelivered: number;
  threshold: number;
  overallStatus: 'SAFE' | 'RISKY' | 'MUST_ATTEND';
  margin: number;

  // Subject counters
  totalSubjects: number;
  safeSubjectsCount: number;
  riskySubjectsCount: number;
  mustAttendSubjectsCount: number;
  unrecoverableSubjectsCount: number;

  // Today's Decision Center
  todayClasses: TodayDecisionItem[];
  mostImportantTodayClass: TodayDecisionItem | null;
  selectedDay: DayOfWeek;

  // Prioritized Subjects Overview
  prioritizedSubjects: SubjectRiskSummary[];

  // Recovery & Safe Bunk Cards
  recoveryAlerts: RecoveryAlertItem[];
  safeBunkOpportunities: SafeBunkOpportunityItem[];

  // Semester Forecast
  semesterForecast: SemesterForecastSummary;

  // State Flags
  hasActiveSemester: boolean;
  hasSubjects: boolean;
  hasTimetable: boolean;
  hasAttendance: boolean;
}

export interface DashboardInput {
  subjects: Subject[];
  timetable: TimetableSlot[];
  logs: AttendanceLog[];
  settings: SemesterSettings;
  selectedDay: DayOfWeek;
  currentDateStr?: string;
}

/**
 * Pure dashboard view model builder aggregating Phase 4 canonical engine math
 * and Phase 10 prediction results once for coherent presentation.
 */
export function buildDashboardViewModel(input: DashboardInput): DashboardViewModel {
  const { subjects, timetable, logs, settings, selectedDay } = input;
  const currentDateStr = input.currentDateStr || new Date().toISOString().split('T')[0];
  const threshold = settings.targetThreshold || 75;

  // 1. Empty state checks
  const hasActiveSemester = !!settings && !!settings.id;
  const hasSubjects = subjects.length > 0;
  const hasTimetable = timetable.length > 0;
  const hasAttendance = logs.length > 0 || subjects.some((s) => s.totalDelivered > 0);

  if (!hasSubjects) {
    return {
      overallAttendance: null,
      totalAttended: 0,
      totalDelivered: 0,
      threshold,
      overallStatus: 'SAFE',
      margin: 0,
      totalSubjects: 0,
      safeSubjectsCount: 0,
      riskySubjectsCount: 0,
      mustAttendSubjectsCount: 0,
      unrecoverableSubjectsCount: 0,
      todayClasses: [],
      mostImportantTodayClass: null,
      selectedDay,
      prioritizedSubjects: [],
      recoveryAlerts: [],
      safeBunkOpportunities: [],
      semesterForecast: {
        currentPercentage: null,
        bestPossiblePercentage: null,
        worstPossiblePercentage: null,
        threshold,
      },
      hasActiveSemester,
      hasSubjects: false,
      hasTimetable,
      hasAttendance,
    };
  }

  // 2. Aggregate Overall Totals (Phase 4 canonical SUM / SUM)
  const totalAttended = subjects.reduce((sum, s) => sum + s.totalAttended, 0);
  const totalDelivered = subjects.reduce((sum, s) => sum + s.totalDelivered, 0);
  const overallPctRaw = pct(totalAttended, totalDelivered);
  const overallAttendance = overallPctRaw !== null ? Number(overallPctRaw.toFixed(2)) : null;

  const margin = overallAttendance !== null ? Number((overallAttendance - threshold).toFixed(2)) : 0;

  // Overall status determination
  let overallStatus: 'SAFE' | 'RISKY' | 'MUST_ATTEND' = 'SAFE';
  if (overallAttendance === null || overallAttendance > threshold + 5) {
    overallStatus = 'SAFE';
  } else if (overallAttendance > threshold) {
    overallStatus = 'RISKY';
  } else {
    overallStatus = 'MUST_ATTEND';
  }

  // Prepare walker params for Phase 10 predictions
  const walkerParams = {
    startDate: settings.startDate,
    endDate: settings.endDate,
    currentDate: currentDateStr,
    workingDays: settings.workingDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    holidays: settings.holidays || [],
    timetableSlots: timetable
      .filter((slot) => !!slot.componentId)
      .map((slot) => ({
        id: slot.id,
        subjectId: slot.subjectId,
        componentId: slot.componentId!,
        componentType: slot.componentType as any,
        componentName: slot.componentName,
        dayOfWeek: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
        faculty: slot.instructor,
        slotOrder: slot.slotOrder,
      })),
  };

  // 3. Subject Predictions & Summaries
  let totalBestAttended = totalAttended;
  let totalBestDelivered = totalDelivered;
  let totalWorstAttended = totalAttended;
  let totalWorstDelivered = totalDelivered;

  const subjectSummaries: SubjectRiskSummary[] = [];
  const recoveryAlerts: RecoveryAlertItem[] = [];
  const safeBunkOpportunities: SafeBunkOpportunityItem[] = [];

  let safeSubjectsCount = 0;
  let riskySubjectsCount = 0;
  let mustAttendSubjectsCount = 0;
  let unrecoverableSubjectsCount = 0;

  for (const subject of subjects) {
    const rawComponents = subject.components?.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      attended: c.totalAttended,
      delivered: c.totalDelivered,
    })) || [
      {
        id: `comp-${subject.id}`,
        type: 'LECTURE',
        name: 'Theory',
        attended: subject.totalAttended,
        delivered: subject.totalDelivered,
      },
    ];

    const pred = predictSubject(subject.id, rawComponents, threshold, walkerParams);

    totalBestAttended += pred.bestPossibleAttended - pred.currentAttended;
    totalBestDelivered += pred.bestPossibleDelivered - pred.currentDelivered;
    totalWorstAttended += pred.worstPossibleAttended - pred.currentAttended;
    totalWorstDelivered += pred.worstPossibleDelivered - pred.currentDelivered;

    if (pred.status === 'UNRECOVERABLE') unrecoverableSubjectsCount++;
    else if (pred.status === 'MUST_ATTEND') mustAttendSubjectsCount++;
    else if (pred.status === 'RISKY') riskySubjectsCount++;
    else if (pred.status === 'SAFE') safeSubjectsCount++;

    const summary: SubjectRiskSummary = {
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      color: subject.color,
      currentPercentage: pred.currentPercentage,
      currentAttended: pred.currentAttended,
      currentDelivered: pred.currentDelivered,
      threshold,
      status: pred.status,
      safeBunksCount: pred.bunkLimitFuture,
      recoveryNeededCount: pred.recoveryClassesNeeded,
      forecastPercentage: pred.bestPossiblePercentage,
      prediction: pred,
    };
    subjectSummaries.push(summary);

    // Recovery Alert check
    if (!pred.currentEligible || !pred.recoverable) {
      recoveryAlerts.push({
        subjectId: subject.id,
        subjectName: subject.name,
        currentPercentage: pred.currentPercentage,
        threshold,
        classesNeeded: pred.recoveryClassesNeeded,
        recoveryDate: pred.recoveryDate,
        recoverable: pred.recoverable,
        bestPossiblePercentage: pred.bestPossiblePercentage,
      });
    }

    // Safe Bunk Opportunity check
    if (pred.currentEligible && pred.bunkLimitFuture > 0 && pred.safeBunkPlan.length > 0) {
      safeBunkOpportunities.push({
        subjectId: subject.id,
        subjectName: subject.name,
        safeBunkCount: pred.bunkLimitFuture,
        opportunities: pred.safeBunkPlan.slice(0, 3), // Top 3 safe upcoming opportunities
      });
    }
  }

  // 4. Prioritize Subjects (UNRECOVERABLE -> MUST_ATTEND -> RISKY -> SAFE, then lowest margin)
  const statusPriorityMap: Record<string, number> = {
    UNRECOVERABLE: 1,
    MUST_ATTEND: 2,
    RISKY: 3,
    SAFE: 4,
    NEUTRAL: 5,
  };

  const prioritizedSubjects = [...subjectSummaries].sort((a, b) => {
    const pA = statusPriorityMap[a.status] || 99;
    const pB = statusPriorityMap[b.status] || 99;
    if (pA !== pB) return pA - pB;

    const marginA = (a.currentPercentage ?? 0) - threshold;
    const marginB = (b.currentPercentage ?? 0) - threshold;
    return marginA - marginB;
  });

  // 5. Build Today's Decision Items
  const dailySlots = timetable.filter((s) => s.day === selectedDay);
  const sortedSlots = [...dailySlots].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayClasses: TodayDecisionItem[] = [];

  for (const slot of sortedSlots) {
    const subject = subjects.find((s) => s.id === slot.subjectId);
    if (!subject) continue;

    // Check existing attendance log for today
    const existingLog = logs.find(
      (l) =>
        (l.slotId && l.slotId === slot.id) ||
        (l.componentId && l.componentId === slot.componentId && l.date === currentDateStr)
    );
    const currentLogStatus = existingLog ? (existingLog.status === 'ATTENDED' ? 'ATTENDED' : 'MISSED') : null;

    const currentAttended = subject.totalAttended;
    const currentDelivered = subject.totalDelivered;

    const ifAttendedRaw = pct(currentAttended + 1, currentDelivered + 1) ?? 100;
    const ifSkippedRaw = pct(currentAttended, currentDelivered + 1) ?? 0;

    const ifAttendedPercentage = Number(ifAttendedRaw.toFixed(2));
    const ifSkippedPercentage = Number(ifSkippedRaw.toFixed(2));

    const skipImpact = calculateClassSkipImpact(currentAttended, currentDelivered, threshold);

    // Formulate explanation
    let explanation = '';
    if (skipImpact.recommendation === 'SAFE') {
      explanation = `Skipping this class keeps your attendance at ${ifSkippedPercentage}%, strictly above the ${threshold}% threshold.`;
    } else if (skipImpact.recommendation === 'RISKY') {
      explanation = `Skipping reduces your safety margin down to ${ifSkippedPercentage}%.`;
    } else {
      explanation = `Skipping drops this subject to ${ifSkippedPercentage}%, below the required ${threshold}% threshold.`;
    }

    todayClasses.push({
      slotId: slot.id,
      subjectId: slot.subjectId,
      subjectName: slot.subjectName || subject.name,
      subjectCode: slot.subjectCode || subject.code,
      componentId: slot.componentId || '',
      componentType: slot.componentType,
      componentName: slot.componentName,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      faculty: slot.instructor,
      currentPercentage: subject.currentPercentage,
      currentAttended,
      currentDelivered,
      ifAttendedPercentage,
      ifSkippedPercentage,
      skipImpactRecommendation: skipImpact.recommendation,
      explanation,
      currentStatus: currentLogStatus,
      isMostImportant: false,
    });
  }

  // 6. Select "Most Important Class" Deterministically
  let mostImportantTodayClass: TodayDecisionItem | null = null;
  if (todayClasses.length > 0) {
    const candidates = [...todayClasses].sort((a, b) => {
      // 1. Causes threshold breach or is currently MUST_ATTEND
      const breachA = a.skipImpactRecommendation === 'MUST_ATTEND' ? 1 : 0;
      const breachB = b.skipImpactRecommendation === 'MUST_ATTEND' ? 1 : 0;
      if (breachA !== breachB) return breachB - breachA;

      // 2. Lowest resulting percentage if skipped
      if (a.ifSkippedPercentage !== b.ifSkippedPercentage) {
        return a.ifSkippedPercentage - b.ifSkippedPercentage;
      }

      // 3. Earliest slot time
      return a.startTime.localeCompare(b.startTime);
    });

    mostImportantTodayClass = candidates[0];
    const target = todayClasses.find((c) => c.slotId === mostImportantTodayClass!.slotId);
    if (target) {
      target.isMostImportant = true;
    }
  }

  // 7. Overall Semester Forecast
  const bestPctRaw = pct(totalBestAttended, totalBestDelivered);
  const worstPctRaw = pct(totalWorstAttended, totalWorstDelivered);

  const semesterForecast: SemesterForecastSummary = {
    currentPercentage: overallAttendance,
    bestPossiblePercentage: bestPctRaw !== null ? Number(bestPctRaw.toFixed(2)) : null,
    worstPossiblePercentage: worstPctRaw !== null ? Number(worstPctRaw.toFixed(2)) : null,
    threshold,
  };

  return {
    overallAttendance,
    totalAttended,
    totalDelivered,
    threshold,
    overallStatus,
    margin,
    totalSubjects: subjects.length,
    safeSubjectsCount,
    riskySubjectsCount,
    mustAttendSubjectsCount,
    unrecoverableSubjectsCount,
    todayClasses,
    mostImportantTodayClass,
    selectedDay,
    prioritizedSubjects,
    recoveryAlerts,
    safeBunkOpportunities,
    semesterForecast,
    hasActiveSemester,
    hasSubjects,
    hasTimetable,
    hasAttendance,
  };
}
