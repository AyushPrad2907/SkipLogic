import { DayOfWeek } from '@/types';
import { SupportedComponentType } from '@/lib/components.functions';

export type ImportConfidenceStatus = 'CONFIDENT' | 'NEEDS_REVIEW' | 'UNRESOLVED';

export interface RawExtractedClass {
  dayOfWeek?: DayOfWeek | null;
  startTime?: string | null;
  endTime?: string | null;
  subjectName?: string | null;
  subjectCode?: string | null;
  componentName?: string | null;
  componentType?: SupportedComponentType | null;
  room?: string | null;
  instructor?: string | null;
  sourceSheet: string;
  sourceCell: string;
}

export interface ExtractedTimetableSlot {
  id: string; // client temporary ID
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  subjectName: string;
  subjectCode?: string;
  componentName: string;
  componentType: SupportedComponentType;
  room?: string;
  instructor?: string;
  sourceSheet: string;
  sourceCell: string;

  // Matching fields
  matchedSubjectId: string | null; // null if "NEW SUBJECT"
  matchedComponentId: string | null; // null if "NEW COMPONENT"
  isNewSubject: boolean;
  isNewComponent: boolean;

  // Status & Validation
  status: ImportConfidenceStatus;
  statusReason?: string;
  hasOverlapConflict?: boolean;
  overlapConflictDetails?: string;
  isDuplicate?: boolean;
}

export interface TimetableImportSummary {
  sheetsScanned: number;
  classesDetected: number;
  subjectsDetected: number;
  componentsDetected: number;
  confidentCount: number;
  needsReviewCount: number;
  unresolvedCount: number;
  hasConflicts: boolean;
}

export type TimetableImportStrategy = 'REPLACE' | 'MERGE';
