import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Subject,
  TimetableSlot,
  SemesterSettings,
  AttendanceLog,
  SubjectComponentType,
  AttendanceStatus,
  DayOfWeek
} from '@/types';

import {
  bunkLimit as engineBunkLimit,
  recoveryNeeded as engineRecoveryNeeded,
  recommendation as engineRecommendation,
  calculateSubjectAttendance,
  predictSubject as enginePredictSubject,
} from '@/lib/engine';
import { supabase } from '@/lib/supabase';
import { getActiveSemester } from '@/lib/semesters.functions';
import { listSubjects, createSubject, updateSubject, deleteSubject } from '@/lib/subjects.functions';
import { createComponent, updateComponent, deleteComponent } from '@/lib/components.functions';
import {
  listTimetableSlots,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  DayOfWeekEnum,
  formatTimeHHMM
} from '@/lib/timetable.functions';
import {
  listAttendanceLogs,
  markAttendance as apiMarkAttendance,
  updateAttendanceStatus as apiUpdateAttendanceStatus,
  deleteAttendanceLog as apiDeleteAttendanceLog,
  AttendanceStatusType,
} from '@/lib/attendance.functions';

// Default Fallback Settings
const defaultSettings: SemesterSettings = {
  id: 'default',
  name: 'Current Semester',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 120 days from now
  targetThreshold: 75,
  workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  holidays: [],
};

// Interface for the context value
interface AttendanceContextType {
  subjects: Subject[];
  timetable: TimetableSlot[];
  settings: SemesterSettings;
  logs: AttendanceLog[];
  activeSemesterId: string | null;
  isLoading: boolean;
  addSubject: (subject: { name: string; code?: string; color?: string; targetThreshold?: number }) => Promise<void>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addComponent: (subjectId: string, type: string, name?: string, attended?: number, delivered?: number) => Promise<void>;
  updateComponent: (componentId: string, subjectId: string, updates: { type?: string; name?: string; attended?: number; delivered?: number }) => Promise<void>;
  deleteComponent: (componentId: string, subjectId: string) => Promise<void>;
  addTimetableSlot: (input: {
    subjectId: string;
    componentId: string;
    day: DayOfWeek;
    startTime: string;
    endTime: string;
    room?: string;
    instructor?: string;
    slotOrder?: number;
  }) => Promise<void>;
  updateTimetableSlot: (
    slotId: string,
    updates: {
      subjectId?: string;
      componentId?: string;
      day?: DayOfWeek;
      startTime?: string;
      endTime?: string;
      room?: string;
      instructor?: string;
      slotOrder?: number;
    }
  ) => Promise<void>;
  deleteTimetableSlot: (id: string) => Promise<void>;
  logAttendance: (
    subjectId: string,
    componentType: SubjectComponentType,
    status: 'ATTENDED' | 'MISSED' | 'BUNKED' | 'CANCELLED',
    date: string,
    slotId?: string | null,
    componentId?: string
  ) => Promise<void>;
  markAttendance: (input: {
    semesterId?: string;
    subjectId: string;
    componentId: string;
    date: string;
    status: 'ATTENDED' | 'MISSED';
    slotId?: string | null;
  }) => Promise<void>;
  updateAttendanceStatus: (logId: string, newStatus: 'ATTENDED' | 'MISSED') => Promise<void>;
  revertAttendanceLog: (logId: string) => Promise<void>;
  updateSettings: (settings: SemesterSettings) => void;
  loadMockData: () => void;
  resetAllData: () => void;
  refreshData: () => Promise<void>;
  getSubjectPrediction: (subjectId: string) => any;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

/**
 * Calculates subject stats using Phase 4 canonical engine.
 */
export function calculateSubjectStats(
  subject: Omit<Subject, 'currentPercentage' | 'bunkLimit' | 'recoveryRequired' | 'status'>,
  targetThreshold: number
): Subject {
  const components = subject.components || [];
  const engineComponents = components.map((c) => ({
    id: c.id,
    attended: c.totalAttended,
    delivered: c.totalDelivered,
  }));

  const result = calculateSubjectAttendance(engineComponents, targetThreshold);
  const bLimit = engineBunkLimit(result.attended, result.delivered, targetThreshold);
  const recNeeded = engineRecoveryNeeded(result.attended, result.delivered, targetThreshold);
  const status = engineRecommendation(result.attended, result.delivered, targetThreshold);

  return {
    ...subject,
    totalAttended: result.attended,
    totalDelivered: result.delivered,
    currentPercentage: result.percentage === null ? 100 : Number(result.percentage.toFixed(2)),
    bunkLimit: bLimit,
    recoveryRequired: recNeeded,
    status: status as AttendanceStatus,
    targetThreshold,
    components,
  } as Subject;
}

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SemesterSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);

  // Main data sync function with Supabase
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const activeSem = await getActiveSemester();
      setActiveSemesterId(activeSem.id);

      const semSettings: SemesterSettings = {
        id: activeSem.id,
        name: activeSem.name,
        startDate: activeSem.start_date,
        endDate: activeSem.end_date,
        targetThreshold: Number(activeSem.threshold) || 75,
        workingDays: (activeSem.working_days as any) || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        holidays: [],
      };
      setSettings(semSettings);

      // Fetch subjects & components
      const rawSubjects = await listSubjects(activeSem.id);
      const formattedSubjects: Subject[] = rawSubjects.map((sub) => {
        const comps = (sub.components || []).map((c) => ({
          id: c.id,
          subjectId: sub.id,
          name: c.name || c.type,
          type: c.type as any,
          totalAttended: c.attended,
          totalDelivered: c.delivered,
        }));

        const rawSub = {
          id: sub.id,
          name: sub.name,
          code: sub.code || undefined,
          color: sub.color || '#818cf8',
          targetThreshold: semSettings.targetThreshold,
          totalAttended: 0,
          totalDelivered: 0,
          components: comps,
        };

        return calculateSubjectStats(rawSub, semSettings.targetThreshold);
      });

      setSubjects(formattedSubjects);

      // Fetch timetable slots
      const rawSlots = await listTimetableSlots(activeSem.id);
      const formattedSlots: TimetableSlot[] = rawSlots.map((slot) => {
        const sub = formattedSubjects.find((s) => s.id === slot.subject_id);
        const comp = sub?.components?.find((c) => c.id === slot.component_id);

        return {
          id: slot.id,
          subjectId: slot.subject_id,
          componentId: slot.component_id || undefined,
          subjectName: slot.subjects?.name || sub?.name || 'Unknown Subject',
          subjectCode: slot.subjects?.code || sub?.code || undefined,
          componentType: (slot.components?.type || comp?.type || 'LECTURE') as any,
          componentName: slot.components?.name || comp?.name || undefined,
          day: slot.day_of_week as DayOfWeek,
          startTime: formatTimeHHMM(slot.start_time),
          endTime: formatTimeHHMM(slot.end_time),
          room: slot.room || undefined,
          instructor: slot.faculty || undefined,
          slotOrder: slot.slot_order || undefined,
        };
      });

      setTimetable(formattedSlots);

      // Fetch real attendance logs from Supabase
      const rawLogs = await listAttendanceLogs(activeSem.id);
      const formattedLogs: AttendanceLog[] = rawLogs.map((log) => {
        const sub = formattedSubjects.find((s) => s.id === log.subject_id);
        const comp = sub?.components?.find((c) => c.id === log.component_id);
        const slot = rawSlots.find((s) => s.id === log.slot_id);

        return {
          id: log.id,
          semesterId: log.semester_id,
          subjectId: log.subject_id,
          componentId: log.component_id,
          slotId: log.slot_id,
          subjectName: log.subjects?.name || sub?.name || 'Unknown Subject',
          componentType: (log.components?.type || comp?.type || 'LECTURE') as any,
          componentName: log.components?.name || comp?.name || undefined,
          status: (log.status === 'ATTENDED' ? 'ATTENDED' : 'MISSED') as any,
          date: log.date,
          timestamp: log.created_at,
          time: slot ? `${formatTimeHHMM(slot.start_time)} - ${formatTimeHHMM(slot.end_time)}` : log.timetable_slots ? `${formatTimeHHMM(log.timetable_slots.start_time)} - ${formatTimeHHMM(log.timetable_slots.end_time)}` : undefined,
          room: slot?.room || log.timetable_slots?.room || undefined,
        };
      });

      setLogs(formattedLogs);
    } catch (err) {
      console.warn('AttendanceProvider sync warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshData]);

  // Subject methods
  const handleAddSubject = useCallback(async (subjectData: { name: string; code?: string; color?: string; targetThreshold?: number }) => {
    let targetSemId = activeSemesterId;
    if (!targetSemId) {
      const activeSem = await getActiveSemester();
      targetSemId = activeSem.id;
      setActiveSemesterId(activeSem.id);
    }

    await createSubject({
      semesterId: targetSemId,
      name: subjectData.name,
      code: subjectData.code,
      color: subjectData.color,
    });

    await refreshData();
  }, [activeSemesterId, refreshData]);

  const handleUpdateSubject = useCallback(async (id: string, updates: Partial<Subject>) => {
    await updateSubject(id, {
      name: updates.name,
      code: updates.code,
      color: updates.color,
    });

    await refreshData();
  }, [refreshData]);

  const handleDeleteSubject = useCallback(async (id: string) => {
    if (activeSemesterId) {
      await deleteSubject(id);
    }
    await refreshData();
  }, [activeSemesterId, refreshData]);

  // Component methods
  const handleAddComponent = useCallback(async (
    subjectId: string,
    type: string,
    name?: string,
    attended: number = 0,
    delivered: number = 0
  ) => {
    await createComponent({
      subjectId,
      type: type as any,
      name,
      attended,
      delivered,
    });
    await refreshData();
  }, [refreshData]);

  const handleUpdateComponent = useCallback(async (
    componentId: string,
    _subjectId: string,
    updates: { type?: string; name?: string; attended?: number; delivered?: number }
  ) => {
    await updateComponent(componentId, {
      type: updates.type as any,
      name: updates.name,
      attended: updates.attended,
      delivered: updates.delivered,
    });
    await refreshData();
  }, [refreshData]);

  const handleDeleteComponent = useCallback(async (componentId: string, _subjectId: string) => {
    await deleteComponent(componentId);
    await refreshData();
  }, [refreshData]);

  // Timetable methods
  const handleAddTimetableSlot = useCallback(async (input: {
    subjectId: string;
    componentId: string;
    day: DayOfWeek;
    startTime: string;
    endTime: string;
    room?: string;
    instructor?: string;
    slotOrder?: number;
  }) => {
    let targetSemId = activeSemesterId;
    if (!targetSemId) {
      const activeSem = await getActiveSemester();
      targetSemId = activeSem.id;
      setActiveSemesterId(activeSem.id);
    }

    await createTimetableSlot({
      semesterId: targetSemId,
      subjectId: input.subjectId,
      componentId: input.componentId,
      dayOfWeek: input.day as DayOfWeekEnum,
      startTime: input.startTime,
      endTime: input.endTime,
      room: input.room,
      faculty: input.instructor,
      slotOrder: input.slotOrder,
    });

    await refreshData();
  }, [activeSemesterId, refreshData]);

  const handleUpdateTimetableSlot = useCallback(async (
    slotId: string,
    updates: {
      subjectId?: string;
      componentId?: string;
      day?: DayOfWeek;
      startTime?: string;
      endTime?: string;
      room?: string;
      instructor?: string;
      slotOrder?: number;
    }
  ) => {
    await updateTimetableSlot(slotId, {
      subjectId: updates.subjectId,
      componentId: updates.componentId,
      dayOfWeek: updates.day as DayOfWeekEnum,
      startTime: updates.startTime,
      endTime: updates.endTime,
      room: updates.room,
      faculty: updates.instructor,
      slotOrder: updates.slotOrder,
    });

    await refreshData();
  }, [refreshData]);

  const handleDeleteTimetableSlot = useCallback(async (slotId: string) => {
    await deleteTimetableSlot(slotId);
    await refreshData();
  }, [refreshData]);

  // Attendance marking methods
  const handleMarkAttendance = useCallback(async (input: {
    semesterId?: string;
    subjectId: string;
    componentId: string;
    date: string;
    status: 'ATTENDED' | 'MISSED';
    slotId?: string | null;
  }) => {
    let targetSemId = input.semesterId || activeSemesterId;
    if (!targetSemId) {
      const activeSem = await getActiveSemester();
      targetSemId = activeSem.id;
      setActiveSemesterId(activeSem.id);
    }

    await apiMarkAttendance({
      semesterId: targetSemId,
      subjectId: input.subjectId,
      componentId: input.componentId,
      date: input.date,
      status: input.status,
      slotId: input.slotId,
    });

    await refreshData();
  }, [activeSemesterId, refreshData]);

  const handleLogAttendance = useCallback(async (
    subjectId: string,
    componentType: SubjectComponentType,
    status: 'ATTENDED' | 'MISSED' | 'BUNKED' | 'CANCELLED',
    date: string,
    slotId?: string | null,
    componentId?: string
  ) => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) return;

    const targetComp = componentId
      ? subject.components?.find((c) => c.id === componentId)
      : subject.components?.find((c) => c.type === componentType) || subject.components?.[0];

    if (!targetComp) {
      throw new Error('No valid component found for attendance entry.');
    }

    const actualStatus: AttendanceStatusType = status === 'ATTENDED' ? 'ATTENDED' : 'MISSED';

    await handleMarkAttendance({
      semesterId: activeSemesterId || undefined,
      subjectId,
      componentId: targetComp.id,
      date,
      status: actualStatus,
      slotId: slotId || null,
    });
  }, [subjects, activeSemesterId, handleMarkAttendance]);

  const handleUpdateAttendanceStatus = useCallback(async (logId: string, newStatus: 'ATTENDED' | 'MISSED') => {
    await apiUpdateAttendanceStatus(logId, newStatus);
    await refreshData();
  }, [refreshData]);

  const revertAttendanceLog = useCallback(async (logId: string) => {
    await apiDeleteAttendanceLog(logId);
    await refreshData();
  }, [refreshData]);

  const getSubjectPrediction = useCallback((subjectId: string) => {
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const timetableSlotInputs = timetable.map((slot) => ({
      id: slot.id,
      subjectId: slot.subjectId,
      componentId: slot.componentId || '',
      componentType: slot.componentType as any,
      componentName: slot.componentName,
      dayOfWeek: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      faculty: slot.instructor,
    }));

    const comps = (sub.components || []).map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      attended: c.totalAttended,
      delivered: c.totalDelivered,
    }));

    return enginePredictSubject(
      sub.id,
      comps,
      settings.targetThreshold,
      {
        startDate: settings.startDate,
        endDate: settings.endDate,
        currentDate: todayStr,
        workingDays: settings.workingDays,
        holidays: settings.holidays,
        timetableSlots: timetableSlotInputs,
      }
    );
  }, [subjects, timetable, settings]);

  const updateSettings = useCallback((newSettings: SemesterSettings) => {
    setSettings(newSettings);
  }, []);

  const loadMockData = useCallback(() => {}, []);

  const resetAllData = useCallback(() => {
    setSubjects([]);
    setTimetable([]);
    setLogs([]);
  }, []);

  return (
    <AttendanceContext.Provider
      value={{
        subjects,
        timetable,
        settings,
        logs,
        activeSemesterId,
        isLoading,
        addSubject: handleAddSubject,
        updateSubject: handleUpdateSubject,
        deleteSubject: handleDeleteSubject,
        addComponent: handleAddComponent,
        updateComponent: handleUpdateComponent,
        deleteComponent: handleDeleteComponent,
        addTimetableSlot: handleAddTimetableSlot,
        updateTimetableSlot: handleUpdateTimetableSlot,
        deleteTimetableSlot: handleDeleteTimetableSlot,
        logAttendance: handleLogAttendance,
        markAttendance: handleMarkAttendance,
        updateAttendanceStatus: handleUpdateAttendanceStatus,
        revertAttendanceLog,
        updateSettings,
        loadMockData,
        resetAllData,
        refreshData,
        getSubjectPrediction,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}
