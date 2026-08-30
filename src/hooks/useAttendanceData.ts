import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAttendanceLogs,
  getAttendanceForDate,
  markAttendance,
  updateAttendanceStatus,
  deleteAttendanceLog,
  MarkAttendanceInput,
  ListAttendanceLogsFilters,
  AttendanceStatusType,
} from '@/lib/attendance.functions';

/**
 * Hook to fetch attendance logs for a semester with optional filters.
 */
export function useAttendanceLogs(
  semesterId?: string,
  filters?: ListAttendanceLogsFilters
) {
  return useQuery({
    queryKey: ['attendance_logs', semesterId, filters],
    queryFn: () => listAttendanceLogs(semesterId, filters),
    enabled: !!semesterId,
  });
}

/**
 * Hook to fetch attendance logs for a specific date in a semester.
 */
export function useAttendanceForDate(semesterId?: string, date?: string) {
  return useQuery({
    queryKey: ['attendance_for_date', semesterId, date],
    queryFn: () => getAttendanceForDate(semesterId!, date!),
    enabled: !!semesterId && !!date,
  });
}

/**
 * Hook to mark attendance (ATTENDED or MISSED) for a component/slot.
 * Invalidates attendance logs, subjects, components, and timetable queries on success.
 */
export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MarkAttendanceInput) => markAttendance(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance_for_date'] });
      queryClient.invalidateQueries({ queryKey: ['subjects', data.semester_id] });
      queryClient.invalidateQueries({ queryKey: ['subject', data.subject_id] });
      queryClient.invalidateQueries({ queryKey: ['components', data.subject_id] });
      queryClient.invalidateQueries({ queryKey: ['timetable', data.semester_id] });
    },
  });
}

/**
 * Hook to update an existing attendance log status.
 */
export function useUpdateAttendanceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ logId, newStatus }: { logId: string; newStatus: AttendanceStatusType }) =>
      updateAttendanceStatus(logId, newStatus),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance_for_date'] });
      queryClient.invalidateQueries({ queryKey: ['subjects', data.semester_id] });
      queryClient.invalidateQueries({ queryKey: ['subject', data.subject_id] });
      queryClient.invalidateQueries({ queryKey: ['components', data.subject_id] });
      queryClient.invalidateQueries({ queryKey: ['timetable', data.semester_id] });
    },
  });
}

/**
 * Hook to delete/unmark an attendance log entry.
 */
export function useDeleteAttendanceLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ logId }: { logId: string; semesterId?: string; subjectId?: string }) =>
      deleteAttendanceLog(logId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance_for_date'] });
      if (variables.semesterId) {
        queryClient.invalidateQueries({ queryKey: ['subjects', variables.semesterId] });
        queryClient.invalidateQueries({ queryKey: ['timetable', variables.semesterId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['subjects'] });
      }
      if (variables.subjectId) {
        queryClient.invalidateQueries({ queryKey: ['subject', variables.subjectId] });
        queryClient.invalidateQueries({ queryKey: ['components', variables.subjectId] });
      }
    },
  });
}
