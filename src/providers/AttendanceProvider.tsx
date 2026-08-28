import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Subject,
  TimetableSlot,
  SemesterSettings,
  AttendanceLog,
  SubjectComponentType,
  AttendanceStatus
} from '@/types';

import {
  bunkLimit as engineBunkLimit,
  recoveryNeeded as engineRecoveryNeeded,
  recommendation as engineRecommendation,
  calculateSubjectAttendance,
} from '@/lib/engine';
import { supabase } from '@/lib/supabase';
import { getActiveSemester } from '@/lib/semesters.functions';
import { listSubjects, createSubject, updateSubject, deleteSubject } from '@/lib/subjects.functions';
import { createComponent, updateComponent, deleteComponent } from '@/lib/components.functions';

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
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => void;
  deleteTimetableSlot: (id: string) => void;
  logAttendance: (
    subjectId: string,
    componentType: SubjectComponentType,
    status: 'ATTENDED' | 'BUNKED' | 'CANCELLED',
    date: string
  ) => void;
  revertAttendanceLog: (logId: string) => void;
  updateSettings: (settings: SemesterSettings) => void;
  loadMockData: () => void;
  resetAllData: () => void;
  refreshData: () => Promise<void>;
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
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SemesterSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    try {
      const saved = localStorage.getItem('skiplogic-timetable');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [logs, setLogs] = useState<AttendanceLog[]>(() => {
    try {
      const saved = localStorage.getItem('skiplogic-logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save timetable & logs to localStorage as fallback
  useEffect(() => {
    localStorage.setItem('skiplogic-timetable', JSON.stringify(timetable));
  }, [timetable]);

  useEffect(() => {
    localStorage.setItem('skiplogic-logs', JSON.stringify(logs));
  }, [logs]);

  // Main data sync function with Supabase
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Unauthenticated fallback to localStorage if available
        const saved = localStorage.getItem('skiplogic-subjects');
        setSubjects(saved ? JSON.parse(saved) : []);
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
    } catch (err) {
      console.warn('AttendanceProvider sync warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Listen to Auth state changes to re-sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshData]);

  // Methods
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
    setSubjects((prev) => prev.filter((sub) => sub.id !== id));
    setTimetable((prev) => prev.filter((slot) => slot.subjectId !== id));
    setLogs((prev) => prev.filter((log) => log.subjectId !== id));
    await refreshData();
  }, [activeSemesterId, refreshData]);

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

  const addTimetableSlot = useCallback((slotData: Omit<TimetableSlot, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setTimetable((prev) => [...prev, { ...slotData, id }]);
  }, []);

  const deleteTimetableSlot = useCallback((id: string) => {
    setTimetable((prev) => prev.filter((slot) => slot.id !== id));
  }, []);

  const logAttendance = useCallback((
    subjectId: string,
    componentType: SubjectComponentType,
    status: 'ATTENDED' | 'BUNKED' | 'CANCELLED',
    date: string
  ) => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) return;

    const newLog: AttendanceLog = {
      id: Math.random().toString(36).substring(2, 9),
      subjectId,
      subjectName: subject.name,
      componentType,
      status,
      date,
      timestamp: new Date().toISOString(),
    };

    setLogs((prev) => [newLog, ...prev]);

    // Update state locally & push component update to DB if component exists
    if (status !== 'CANCELLED' && subject.components && subject.components.length > 0) {
      const targetComp = subject.components.find((c) => c.type === componentType) || subject.components[0];
      if (targetComp) {
        const nextAttended = targetComp.totalAttended + (status === 'ATTENDED' ? 1 : 0);
        const nextDelivered = targetComp.totalDelivered + 1;
        updateComponent(targetComp.id, {
          attended: nextAttended,
          delivered: nextDelivered,
        }).then(() => refreshData());
      }
    }
  }, [subjects, refreshData]);

  const revertAttendanceLog = useCallback((logId: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  }, []);

  const updateSettings = useCallback((newSettings: SemesterSettings) => {
    setSettings(newSettings);
  }, []);

  const loadMockData = useCallback(() => {
    // Legacy mock loader
  }, []);

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
        addTimetableSlot,
        deleteTimetableSlot,
        logAttendance,
        revertAttendanceLog,
        updateSettings,
        loadMockData,
        resetAllData,
        refreshData,
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
