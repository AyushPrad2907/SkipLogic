import { useMemo, useState } from 'react';
import { useAttendance } from '@/providers/AttendanceProvider';
import {
  filterAttendanceLogs,
  calculateCumulativeAttendance,
  calculateSubjectAnalytics,
  calculateComponentAnalytics,
  calculateMissedClassAnalysis,
  calculatePeriodComparison,
  calculateAttendanceConsistency,
  generateAttendanceInsights,
  PeriodFilterOption,
  CumulativeTrendPoint,
  SubjectAnalyticsItem,
  ComponentAnalyticsItem,
  MissedClassSummary,
  PeriodComparisonResult,
  AttendanceConsistencyResult,
  AttendanceInsightItem,
} from '@/lib/analytics';
import { pct } from '@/lib/engine';
import { formatLocalDateString, parseLocalDateString } from '@/lib/semesterCalendar';

export interface UseAnalyticsDataResult {
  viewModel: AnalyticsViewModel;
  selectedPeriod: PeriodFilterOption;
  setSelectedPeriod: (period: PeriodFilterOption) => void;
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  selectedComponentType: string;
  setSelectedComponentType: (type: string) => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  isLoading: boolean;
  refetch: () => void;
}

export interface AnalyticsViewModel {
  periodDays: number;
  filteredLogs: ReturnType<typeof filterAttendanceLogs>;
  cumulativeTrend: CumulativeTrendPoint[];
  subjectAnalytics: SubjectAnalyticsItem[];
  componentAnalytics: ComponentAnalyticsItem[];
  missedSummary: MissedClassSummary;
  periodComparison: PeriodComparisonResult;
  consistency: AttendanceConsistencyResult;
  insights: AttendanceInsightItem[];
  hasAttendanceData: boolean;
  totalAttended: number;
  totalDelivered: number;
  overallPercentage: number | null;
  threshold: number;
}

export function useAnalyticsData(): UseAnalyticsDataResult {
  const { subjects, logs, settings, isLoading, refreshData } = useAttendance();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilterOption>('14d');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const [selectedComponentType, setSelectedComponentType] = useState<string>('ALL');

  const todayStr = useMemo(() => formatLocalDateString(new Date()), []);
  const [customStartDate, setCustomStartDate] = useState<string>(settings.startDate || todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(settings.endDate || todayStr);

  const periodDays = useMemo(() => {
    if (selectedPeriod === '7d') return 7;
    if (selectedPeriod === '14d') return 14;
    if (selectedPeriod === '30d') return 30;
    if (selectedPeriod === 'SEMESTER') {
      if (settings.startDate && settings.endDate) {
        const start = parseLocalDateString(settings.startDate).getTime();
        const end = parseLocalDateString(todayStr).getTime();
        const diff = Math.max(1, Math.ceil((end - start) / 86400000));
        return diff;
      }
      return 60;
    }
    if (selectedPeriod === 'CUSTOM') {
      const start = parseLocalDateString(customStartDate).getTime();
      const end = parseLocalDateString(customEndDate).getTime();
      const diff = Math.max(1, Math.ceil((end - start) / 86400000));
      return diff;
    }
    return 14;
  }, [selectedPeriod, settings.startDate, settings.endDate, todayStr, customStartDate, customEndDate]);

  const startDateFilter = useMemo(() => {
    if (selectedPeriod === 'CUSTOM') return customStartDate;
    if (selectedPeriod === 'SEMESTER') return settings.startDate;
    const start = new Date(parseLocalDateString(todayStr).getTime() - (periodDays - 1) * 86400000);
    return formatLocalDateString(start);
  }, [selectedPeriod, periodDays, todayStr, customStartDate, settings.startDate]);

  const endDateFilter = useMemo(() => {
    if (selectedPeriod === 'CUSTOM') return customEndDate;
    return todayStr;
  }, [selectedPeriod, todayStr, customEndDate]);

  const viewModel = useMemo<AnalyticsViewModel>(() => {
    const activeSemLogs = logs.filter((l) => !l.semesterId || l.semesterId === settings.id);

    const filteredLogs = filterAttendanceLogs(activeSemLogs, {
      semesterId: settings.id,
      subjectId: selectedSubjectId,
      componentType: selectedComponentType,
      startDate: startDateFilter,
      endDate: endDateFilter,
    });

    const cumulativeTrend = calculateCumulativeAttendance(filteredLogs);
    const subjectAnalytics = calculateSubjectAnalytics(subjects, activeSemLogs, periodDays, todayStr);
    const componentAnalytics = calculateComponentAnalytics(subjects, activeSemLogs, periodDays, todayStr);
    const missedSummary = calculateMissedClassAnalysis(subjects, filteredLogs);
    const periodComparison = calculatePeriodComparison(activeSemLogs, periodDays, todayStr);
    const consistency = calculateAttendanceConsistency(activeSemLogs, Math.max(14, periodDays), todayStr);
    const insights = generateAttendanceInsights(subjects, activeSemLogs, periodDays, todayStr);

    const totalAttended = subjects.reduce((sum, s) => sum + s.totalAttended, 0);
    const totalDelivered = subjects.reduce((sum, s) => sum + s.totalDelivered, 0);
    const overallPctRaw = pct(totalAttended, totalDelivered);
    const overallPercentage = overallPctRaw !== null ? Number(overallPctRaw.toFixed(2)) : null;

    const hasAttendanceData = activeSemLogs.length > 0 || totalDelivered > 0;

    return {
      periodDays,
      filteredLogs,
      cumulativeTrend,
      subjectAnalytics,
      componentAnalytics,
      missedSummary,
      periodComparison,
      consistency,
      insights,
      hasAttendanceData,
      totalAttended,
      totalDelivered,
      overallPercentage,
      threshold: settings.targetThreshold || 75,
    };
  }, [
    subjects,
    logs,
    settings,
    selectedSubjectId,
    selectedComponentType,
    startDateFilter,
    endDateFilter,
    periodDays,
    todayStr,
  ]);

  return {
    viewModel,
    selectedPeriod,
    setSelectedPeriod,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedComponentType,
    setSelectedComponentType,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    isLoading,
    refetch: refreshData,
  };
}
