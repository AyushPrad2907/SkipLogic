import { useMemo, useState } from 'react';
import { useAttendance } from '@/providers/AttendanceProvider';
import { buildDashboardViewModel, DashboardViewModel } from '@/lib/dashboardViewModel';
import { DayOfWeek } from '@/types';

export interface UseDashboardDataResult {
  viewModel: DashboardViewModel;
  selectedDay: DayOfWeek;
  setSelectedDay: (day: DayOfWeek) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  logAttendance: (
    subjectId: string,
    componentType: any,
    status: 'ATTENDED' | 'MISSED' | 'BUNKED' | 'CANCELLED',
    date: string,
    slotId?: string | null,
    componentId?: string
  ) => Promise<void>;
  revertAttendanceLog: (logId: string) => Promise<void>;
  loadMockData: () => void;
}

/**
 * Custom React hook that aggregates raw AttendanceContext state into a unified,
 * memoized DashboardViewModel once per render cycle.
 */
export function useDashboardData(): UseDashboardDataResult {
  const {
    subjects,
    timetable,
    logs,
    settings,
    isLoading,
    logAttendance,
    revertAttendanceLog,
    loadMockData,
  } = useAttendance();

  const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const todayIndex = new Date().getDay();
    return days[todayIndex] === 'SUNDAY' || days[todayIndex] === 'SATURDAY' ? 'MONDAY' : days[todayIndex];
  });

  const currentDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute coherent view model ONCE per state change
  const viewModel = useMemo(() => {
    return buildDashboardViewModel({
      subjects,
      timetable,
      logs,
      settings,
      selectedDay,
      currentDateStr,
    });
  }, [subjects, timetable, logs, settings, selectedDay, currentDateStr]);

  return {
    viewModel,
    selectedDay,
    setSelectedDay,
    isLoading,
    isError: false,
    error: null,
    refetch: () => {},
    logAttendance,
    revertAttendanceLog,
    loadMockData,
  };
}
