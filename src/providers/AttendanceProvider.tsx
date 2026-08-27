import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Subject,
  TimetableSlot,
  SemesterSettings,
  AttendanceLog,
  SubjectComponentType,
  AttendanceStatus
} from '@/types';

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
  addSubject: (subject: Omit<Subject, 'id' | 'currentPercentage' | 'bunkLimit' | 'recoveryRequired' | 'status'>) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
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
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

// Helper function to calculate attendance stats for a subject
export function calculateSubjectStats(
  subject: Omit<Subject, 'currentPercentage' | 'bunkLimit' | 'recoveryRequired' | 'status'>,
  targetThreshold: number
): Subject {
  const { totalAttended, totalDelivered } = subject;
  
  let currentPercentage = 100;
  let bunkLimit = 0;
  let recoveryRequired = 0;
  let status: AttendanceStatus = 'NEUTRAL';

  if (totalDelivered > 0) {
    currentPercentage = (totalAttended / totalDelivered) * 100;
    
    if (currentPercentage > targetThreshold) {
      bunkLimit = Math.max(0, Math.ceil((100 * totalAttended - targetThreshold * totalDelivered) / targetThreshold) - 1);
      recoveryRequired = 0;
      status = bunkLimit > 0 ? 'SAFE' : 'RISKY';
    } else {
      bunkLimit = 0;
      const denominator = 100 - targetThreshold;
      recoveryRequired = denominator <= 0 
        ? (totalAttended < totalDelivered ? 999 : 0) // Infinity fallback
        : Math.max(0, Math.floor((targetThreshold * totalDelivered - 100 * totalAttended) / denominator) + 1);
      status = 'MUST_ATTEND';
    }
  } else {
    currentPercentage = 100;
    bunkLimit = 0;
    recoveryRequired = 0;
    status = 'NEUTRAL';
  }

  return {
    ...subject,
    currentPercentage: Number(currentPercentage.toFixed(2)),
    bunkLimit,
    recoveryRequired,
    status,
  } as Subject;
}

// Helper to compute overall counts from components if they exist
function computeOverallCounts<T extends { components?: any[]; totalDelivered: number; totalAttended: number }>(sub: T): T {
  if (sub.components && sub.components.length > 0) {
    const totalDelivered = sub.components.reduce((acc, c) => acc + c.totalDelivered, 0);
    const totalAttended = sub.components.reduce((acc, c) => acc + c.totalAttended, 0);
    return { ...sub, totalDelivered, totalAttended };
  }
  return sub;
}

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  // 1. Initial State Loading from LocalStorage
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const saved = localStorage.getItem('skiplogic-subjects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    try {
      const saved = localStorage.getItem('skiplogic-timetable');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<SemesterSettings>(() => {
    try {
      const saved = localStorage.getItem('skiplogic-settings');
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch {
      return defaultSettings;
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

  // 2. Persistence via Effects
  useEffect(() => {
    localStorage.setItem('skiplogic-subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('skiplogic-timetable', JSON.stringify(timetable));
  }, [timetable]);

  useEffect(() => {
    localStorage.setItem('skiplogic-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('skiplogic-logs', JSON.stringify(logs));
  }, [logs]);

  // 3. Exposed State Modifying Methods

  const addSubject = useCallback((subjectData: Omit<Subject, 'id' | 'currentPercentage' | 'bunkLimit' | 'recoveryRequired' | 'status'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Ensure overall counts are computed if components exist
    const baseSubject = computeOverallCounts({
      ...subjectData,
      id,
    });

    const newSubject = calculateSubjectStats(
      baseSubject,
      baseSubject.targetThreshold || settings.targetThreshold
    );

    setSubjects((prev) => [...prev, newSubject]);
  }, [settings.targetThreshold]);

  const updateSubject = useCallback((id: string, updates: Partial<Subject>) => {
    setSubjects((prev) =>
      prev.map((sub) => {
        if (sub.id !== id) return sub;
        
        const merged = { ...sub, ...updates };
        const baseMerged = computeOverallCounts(merged);
        
        return calculateSubjectStats(
          baseMerged,
          baseMerged.targetThreshold || settings.targetThreshold
        );
      })
    );
  }, [settings.targetThreshold]);

  const deleteSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((sub) => sub.id !== id));
    setTimetable((prev) => prev.filter((slot) => slot.subjectId !== id));
    setLogs((prev) => prev.filter((log) => log.subjectId !== id));
  }, []);

  const addTimetableSlot = useCallback((slotData: Omit<TimetableSlot, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newSlot: TimetableSlot = {
      ...slotData,
      id,
    };
    setTimetable((prev) => [...prev, newSlot]);
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

    // Create the new log entry
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

    // Update subject delivered and attended counts
    setSubjects((prevSubjects) =>
      prevSubjects.map((sub) => {
        if (sub.id !== subjectId) return sub;

        let totalDelivered = sub.totalDelivered;
        let totalAttended = sub.totalAttended;
        let components = sub.components;

        if (status !== 'CANCELLED') {
          if (components && components.length > 0) {
            components = components.map((comp) => {
              if (comp.type === componentType) {
                return {
                  ...comp,
                  totalDelivered: comp.totalDelivered + 1,
                  totalAttended: comp.totalAttended + (status === 'ATTENDED' ? 1 : 0),
                };
              }
              return comp;
            });
            totalDelivered = components.reduce((acc, c) => acc + c.totalDelivered, 0);
            totalAttended = components.reduce((acc, c) => acc + c.totalAttended, 0);
          } else {
            totalDelivered += 1;
            totalAttended += (status === 'ATTENDED' ? 1 : 0);
          }
        }

        return calculateSubjectStats(
          {
            ...sub,
            totalDelivered,
            totalAttended,
            components,
          },
          sub.targetThreshold || settings.targetThreshold
        );
      })
    );
  }, [subjects, settings.targetThreshold]);

  const revertAttendanceLog = useCallback((logId: string) => {
    const log = logs.find((l) => l.id === logId);
    if (!log) return;

    const { subjectId, componentType, status } = log;

    setLogs((prev) => prev.filter((l) => l.id !== logId));

    setSubjects((prevSubjects) =>
      prevSubjects.map((sub) => {
        if (sub.id !== subjectId) return sub;

        let totalDelivered = sub.totalDelivered;
        let totalAttended = sub.totalAttended;
        let components = sub.components;

        if (status !== 'CANCELLED') {
          if (components && components.length > 0) {
            components = components.map((comp) => {
              if (comp.type === componentType) {
                return {
                  ...comp,
                  totalDelivered: Math.max(0, comp.totalDelivered - 1),
                  totalAttended: Math.max(0, comp.totalAttended - (status === 'ATTENDED' ? 1 : 0)),
                };
              }
              return comp;
            });
            totalDelivered = components.reduce((acc, c) => acc + c.totalDelivered, 0);
            totalAttended = components.reduce((acc, c) => acc + c.totalAttended, 0);
          } else {
            totalDelivered = Math.max(0, totalDelivered - 1);
            totalAttended = Math.max(0, totalAttended - (status === 'ATTENDED' ? 1 : 0));
          }
        }

        return calculateSubjectStats(
          {
            ...sub,
            totalDelivered,
            totalAttended,
            components,
          },
          sub.targetThreshold || settings.targetThreshold
        );
      })
    );
  }, [logs, settings.targetThreshold]);

  const updateSettings = useCallback((newSettings: SemesterSettings) => {
    setSettings(newSettings);
    // Recalculate stats for all subjects based on new settings threshold
    setSubjects((prev) =>
      prev.map((sub) =>
        calculateSubjectStats(sub, sub.targetThreshold || newSettings.targetThreshold)
      )
    );
  }, []);

  const resetAllData = useCallback(() => {
    setSubjects([]);
    setTimetable([]);
    setSettings(defaultSettings);
    setLogs([]);
    localStorage.removeItem('skiplogic-subjects');
    localStorage.removeItem('skiplogic-timetable');
    localStorage.removeItem('skiplogic-settings');
    localStorage.removeItem('skiplogic-logs');
  }, []);

  const loadMockData = useCallback(() => {
    const mockSettings: SemesterSettings = {
      id: 'mock-semester',
      name: 'Fall Semester 2026',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
      targetThreshold: 75,
      workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      holidays: [],
    };

    const mockSubjectsRaw = [
      {
        id: 'sub-math',
        code: 'MATH401',
        name: 'Mathematics IV',
        targetThreshold: 75,
        totalDelivered: 15,
        totalAttended: 12,
        components: [
          { id: 'comp-math-lec', subjectId: 'sub-math', name: 'Theory', type: 'LECTURE' as const, totalDelivered: 12, totalAttended: 10 },
          { id: 'comp-math-tut', subjectId: 'sub-math', name: 'Tutorial', type: 'TUTORIAL' as const, totalDelivered: 3, totalAttended: 2 },
        ],
        color: '#3b82f6',
      },
      {
        id: 'sub-dsa',
        code: 'CS301',
        name: 'Data Structures & Algorithms',
        targetThreshold: 75,
        totalDelivered: 20,
        totalAttended: 18,
        components: [
          { id: 'comp-dsa-lec', subjectId: 'sub-dsa', name: 'Theory', type: 'LECTURE' as const, totalDelivered: 15, totalAttended: 13 },
          { id: 'comp-dsa-lab', subjectId: 'sub-dsa', name: 'Lab', type: 'LAB' as const, totalDelivered: 5, totalAttended: 5 },
        ],
        color: '#10b981',
      },
      {
        id: 'sub-dbms',
        code: 'CS302',
        name: 'Database Management Systems',
        targetThreshold: 75,
        totalDelivered: 18,
        totalAttended: 13,
        components: [
          { id: 'comp-dbms-lec', subjectId: 'sub-dbms', name: 'Theory', type: 'LECTURE' as const, totalDelivered: 14, totalAttended: 10 },
          { id: 'comp-dbms-lab', subjectId: 'sub-dbms', name: 'Lab', type: 'LAB' as const, totalDelivered: 4, totalAttended: 3 },
        ],
        color: '#f59e0b',
      },
      {
        id: 'sub-os',
        code: 'CS303',
        name: 'Operating Systems',
        targetThreshold: 75,
        totalDelivered: 16,
        totalAttended: 10,
        components: [
          { id: 'comp-os-lec', subjectId: 'sub-os', name: 'Theory', type: 'LECTURE' as const, totalDelivered: 16, totalAttended: 10 },
        ],
        color: '#ef4444',
      },
      {
        id: 'sub-tc',
        code: 'HS201',
        name: 'Technical Communication',
        targetThreshold: 70,
        totalDelivered: 10,
        totalAttended: 9,
        components: [
          { id: 'comp-tc-lec', subjectId: 'sub-tc', name: 'Theory', type: 'LECTURE' as const, totalDelivered: 8, totalAttended: 7 },
          { id: 'comp-tc-sem', subjectId: 'sub-tc', name: 'Seminar', type: 'SEMINAR' as const, totalDelivered: 2, totalAttended: 2 },
        ],
        color: '#8b5cf6',
      },
    ];

    const mockTimetable: TimetableSlot[] = [
      {
        id: 'slot-1',
        subjectId: 'sub-math',
        subjectName: 'Mathematics IV',
        subjectCode: 'MATH401',
        componentType: 'LECTURE',
        day: 'MONDAY',
        startTime: '09:00',
        endTime: '10:00',
        room: 'LHC-101',
        instructor: 'Dr. R. K. Singh',
      },
      {
        id: 'slot-2',
        subjectId: 'sub-dsa',
        subjectName: 'Data Structures & Algorithms',
        subjectCode: 'CS301',
        componentType: 'LECTURE',
        day: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        room: 'CS-202',
        instructor: 'Prof. A. Prasad',
      },
      {
        id: 'slot-3',
        subjectId: 'sub-dbms',
        subjectName: 'Database Management Systems',
        subjectCode: 'CS302',
        componentType: 'LAB',
        day: 'MONDAY',
        startTime: '11:30',
        endTime: '13:30',
        room: 'Lab-3',
        instructor: 'Mr. S. Sen',
      },
      {
        id: 'slot-4',
        subjectId: 'sub-os',
        subjectName: 'Operating Systems',
        subjectCode: 'CS303',
        componentType: 'LECTURE',
        day: 'TUESDAY',
        startTime: '09:00',
        endTime: '10:00',
        room: 'CS-104',
        instructor: 'Dr. P. Gupta',
      },
      {
        id: 'slot-5',
        subjectId: 'sub-dbms',
        subjectName: 'Database Management Systems',
        subjectCode: 'CS302',
        componentType: 'LECTURE',
        day: 'TUESDAY',
        startTime: '10:00',
        endTime: '11:00',
        room: 'CS-202',
        instructor: 'Prof. M. Roy',
      },
      {
        id: 'slot-6',
        subjectId: 'sub-math',
        subjectName: 'Mathematics IV',
        subjectCode: 'MATH401',
        componentType: 'TUTORIAL',
        day: 'TUESDAY',
        startTime: '14:00',
        endTime: '15:00',
        room: 'LHC-102',
        instructor: 'Dr. R. K. Singh',
      },
      {
        id: 'slot-7',
        subjectId: 'sub-math',
        subjectName: 'Mathematics IV',
        subjectCode: 'MATH401',
        componentType: 'LECTURE',
        day: 'WEDNESDAY',
        startTime: '09:00',
        endTime: '10:00',
        room: 'LHC-101',
        instructor: 'Dr. R. K. Singh',
      },
      {
        id: 'slot-8',
        subjectId: 'sub-dsa',
        subjectName: 'Data Structures & Algorithms',
        subjectCode: 'CS301',
        componentType: 'LECTURE',
        day: 'WEDNESDAY',
        startTime: '10:00',
        endTime: '11:00',
        room: 'CS-202',
        instructor: 'Prof. A. Prasad',
      },
      {
        id: 'slot-9',
        subjectId: 'sub-dsa',
        subjectName: 'Data Structures & Algorithms',
        subjectCode: 'CS301',
        componentType: 'LAB',
        day: 'WEDNESDAY',
        startTime: '11:30',
        endTime: '13:30',
        room: 'Lab-1',
        instructor: 'Prof. A. Prasad',
      },
      {
        id: 'slot-10',
        subjectId: 'sub-os',
        subjectName: 'Operating Systems',
        subjectCode: 'CS303',
        componentType: 'LECTURE',
        day: 'THURSDAY',
        startTime: '09:00',
        endTime: '10:00',
        room: 'CS-104',
        instructor: 'Dr. P. Gupta',
      },
      {
        id: 'slot-11',
        subjectId: 'sub-dbms',
        subjectName: 'Database Management Systems',
        subjectCode: 'CS302',
        componentType: 'LECTURE',
        day: 'THURSDAY',
        startTime: '10:00',
        endTime: '11:00',
        room: 'CS-202',
        instructor: 'Prof. M. Roy',
      },
      {
        id: 'slot-12',
        subjectId: 'sub-tc',
        subjectName: 'Technical Communication',
        subjectCode: 'HS201',
        componentType: 'LECTURE',
        day: 'THURSDAY',
        startTime: '11:30',
        endTime: '12:30',
        room: 'LHC-201',
        instructor: 'Mrs. L. Mathew',
      },
      {
        id: 'slot-13',
        subjectId: 'sub-os',
        subjectName: 'Operating Systems',
        subjectCode: 'CS303',
        componentType: 'LECTURE',
        day: 'FRIDAY',
        startTime: '09:00',
        endTime: '10:00',
        room: 'CS-104',
        instructor: 'Dr. P. Gupta',
      },
      {
        id: 'slot-14',
        subjectId: 'sub-dbms',
        subjectName: 'Database Management Systems',
        subjectCode: 'CS302',
        componentType: 'LECTURE',
        day: 'FRIDAY',
        startTime: '10:00',
        endTime: '11:00',
        room: 'CS-202',
        instructor: 'Prof. M. Roy',
      },
      {
        id: 'slot-15',
        subjectId: 'sub-tc',
        subjectName: 'Technical Communication',
        subjectCode: 'HS201',
        componentType: 'SEMINAR',
        day: 'FRIDAY',
        startTime: '14:00',
        endTime: '16:00',
        room: 'Seminar Hall-1',
        instructor: 'Mrs. L. Mathew',
      },
    ];

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const mockLogs: AttendanceLog[] = [
      {
        id: 'log-1',
        subjectId: 'sub-math',
        subjectName: 'Mathematics IV',
        componentType: 'LECTURE',
        status: 'ATTENDED',
        date: twoDaysAgo.toISOString().split('T')[0],
        timestamp: new Date(twoDaysAgo.setHours(9, 30)).toISOString(),
      },
      {
        id: 'log-2',
        subjectId: 'sub-dsa',
        subjectName: 'Data Structures & Algorithms',
        componentType: 'LECTURE',
        status: 'ATTENDED',
        date: twoDaysAgo.toISOString().split('T')[0],
        timestamp: new Date(twoDaysAgo.setHours(10, 30)).toISOString(),
      },
      {
        id: 'log-3',
        subjectId: 'sub-os',
        subjectName: 'Operating Systems',
        componentType: 'LECTURE',
        status: 'BUNKED',
        date: twoDaysAgo.toISOString().split('T')[0],
        timestamp: new Date(twoDaysAgo.setHours(9, 30)).toISOString(),
      },
      {
        id: 'log-4',
        subjectId: 'sub-dbms',
        subjectName: 'Database Management Systems',
        componentType: 'LECTURE',
        status: 'CANCELLED',
        date: yesterday.toISOString().split('T')[0],
        timestamp: new Date(yesterday.setHours(10, 15)).toISOString(),
      },
      {
        id: 'log-5',
        subjectId: 'sub-tc',
        subjectName: 'Technical Communication',
        componentType: 'LECTURE',
        status: 'ATTENDED',
        date: yesterday.toISOString().split('T')[0],
        timestamp: new Date(yesterday.setHours(11, 45)).toISOString(),
      },
    ];

    // Compute mock subjects including counts from mock logs
    const calculatedMockSubjects = mockSubjectsRaw.map((subject) => {
      const subjectLogs = mockLogs.filter((l) => l.subjectId === subject.id);
      
      let updatedComponents = subject.components.map((comp) => {
        const compLogs = subjectLogs.filter((l) => l.componentType === comp.type);
        const compAttended = compLogs.filter((l) => l.status === 'ATTENDED').length;
        const compBunked = compLogs.filter((l) => l.status === 'BUNKED').length;
        return {
          ...comp,
          totalDelivered: comp.totalDelivered + compAttended + compBunked,
          totalAttended: comp.totalAttended + compAttended,
        };
      });

      const totalDelivered = updatedComponents.reduce((acc, c) => acc + c.totalDelivered, 0);
      const totalAttended = updatedComponents.reduce((acc, c) => acc + c.totalAttended, 0);
      const threshold = subject.targetThreshold || mockSettings.targetThreshold;

      return calculateSubjectStats(
        {
          ...subject,
          totalDelivered,
          totalAttended,
          components: updatedComponents,
        },
        threshold
      );
    });

    setSubjects(calculatedMockSubjects);
    setTimetable(mockTimetable);
    setSettings(mockSettings);
    setLogs(mockLogs);
  }, []);

  return (
    <AttendanceContext.Provider
      value={{
        subjects,
        timetable,
        settings,
        logs,
        addSubject,
        updateSubject,
        deleteSubject,
        addTimetableSlot,
        deleteTimetableSlot,
        logAttendance,
        revertAttendanceLog,
        updateSettings,
        loadMockData,
        resetAllData,
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
