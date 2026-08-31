export type AttendanceStatus = 'SAFE' | 'RISKY' | 'MUST_ATTEND' | 'NEUTRAL';

export type SubjectComponentType = 'LECTURE' | 'LAB' | 'TUTORIAL' | 'SEMINAR' | 'OTHER';

export interface SubjectComponent {
  id: string;
  subjectId: string;
  name: string; // e.g. "Theory", "Lab"
  type: SubjectComponentType;
  totalDelivered: number;
  totalAttended: number;
  weightage?: number;
}

export interface Subject {
  id: string;
  code?: string;
  name: string;
  targetThreshold: number; // e.g. 75
  totalDelivered: number;
  totalAttended: number;
  currentPercentage: number;
  bunkLimit: number; // Classes can safely skip
  recoveryRequired: number; // Classes must attend consecutively to reach threshold
  status: AttendanceStatus;
  components?: SubjectComponent[];
  color?: string;
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface TimetableSlot {
  id: string;
  subjectId: string;
  componentId?: string;
  subjectName: string;
  subjectCode?: string;
  componentType: SubjectComponentType;
  componentName?: string;
  day: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  room?: string;
  instructor?: string;
  slotOrder?: number;
}

export interface HolidayItem {
  id: string;
  semesterId?: string;
  semester_id?: string;
  date: string;
  name?: string | null;
}

export interface SemesterSettings {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetThreshold: number; // Default 75%
  workingDays: DayOfWeek[];
  holidays: string[]; // ISO date strings
  holidayObjects?: HolidayItem[];
}

export interface AttendanceDecision {
  subjectId: string;
  subjectName: string;
  componentType: SubjectComponentType;
  time: string;
  currentPercentage: number;
  ifAttendedPercentage: number;
  ifSkippedPercentage: number;
  recommendation: AttendanceStatus;
  reason?: string;
}

export interface AttendanceLog {
  id: string;
  semesterId?: string;
  subjectId: string;
  componentId?: string;
  slotId?: string | null;
  subjectName: string;
  componentType: SubjectComponentType;
  componentName?: string;
  status: 'ATTENDED' | 'MISSED' | 'BUNKED' | 'CANCELLED';
  date: string; // ISO date string (YYYY-MM-DD)
  timestamp: string; // full ISO string
  time?: string;
  room?: string;
}
