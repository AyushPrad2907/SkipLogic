import { SupportedComponentType } from '@/lib/components.functions';
import { ImportConfidenceStatus } from '@/types/xlsx.types';

export interface ExtractedAttendanceRecord {
  id: string; // client temporary ID
  subjectName: string;
  subjectCode?: string;
  componentName: string;
  componentType: SupportedComponentType;
  attended: number;
  delivered: number;
  reportedPercentage?: number | null;
  calculatedPercentage: number;
  hasPercentageMismatch: boolean;

  sourceSheet: string;
  sourceRow: number;
  sourceCell: string;

  // Matching fields
  matchedSubjectId: string | null;
  matchedComponentId: string | null;
  isNewSubject: boolean;
  isNewComponent: boolean;

  // Existing DB state for reconciliation
  existingAttended?: number | null;
  existingDelivered?: number | null;

  // Status & Validation
  status: ImportConfidenceStatus;
  statusReason?: string;
  validationError?: string;
}

export interface AttendanceImportSummary {
  sheetsScanned: number;
  subjectsDetected: number;
  componentsDetected: number;
  recordsDetected: number;
  totalAttended: number;
  totalDelivered: number;
  confidentCount: number;
  needsReviewCount: number;
  unresolvedCount: number;
  hasConflicts: boolean;
}

export type AttendanceReconciliationStrategy = 'SET_TO_IMPORTED';
