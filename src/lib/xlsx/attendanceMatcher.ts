import { SubjectWithComponents } from '@/lib/subjects.functions';
import { RawAttendanceClass } from './attendanceParser';
import { ExtractedAttendanceRecord } from '@/types/attendanceXlsx.types';
import { matchSubject, matchComponent } from './matcher';
import { ImportConfidenceStatus } from '@/types/xlsx.types';
import { SupportedComponentType } from '@/lib/components.functions';

/**
 * Matches extracted attendance records against existing Supabase subjects & components.
 * Computes canonical percentage and flags percentage mismatches or validation errors.
 */
export function matchAndNormalizeAttendanceRecords(
  rawRecords: RawAttendanceClass[],
  existingSubjects: SubjectWithComponents[]
): ExtractedAttendanceRecord[] {
  return rawRecords.map((raw, idx) => {
    const id = `attendance-rec-${idx + 1}-${Date.now()}`;
    const subjectName = raw.subjectName.trim();
    const subjectCode = raw.subjectCode ? raw.subjectCode.trim() : undefined;
    const componentName = raw.componentName || 'Theory';
    const componentType = raw.componentType || ('PP' as SupportedComponentType);

    const attended = Number(raw.attended) || 0;
    const delivered = Number(raw.delivered) || 0;

    const calculatedPercentage = delivered > 0 ? Number(((attended / delivered) * 100).toFixed(2)) : 100;
    let hasPercentageMismatch = false;

    if (raw.reportedPercentage !== undefined && raw.reportedPercentage !== null) {
      if (Math.abs(calculatedPercentage - raw.reportedPercentage) > 0.5) {
        hasPercentageMismatch = true;
      }
    }

    // Match Subject
    const { matchedSubject, isAmbiguous, ambiguousCandidates } = matchSubject(
      subjectName,
      subjectCode,
      existingSubjects
    );

    let matchedSubjectId: string | null = null;
    let matchedComponentId: string | null = null;
    let isNewSubject = false;
    let isNewComponent = false;
    let existingAttended: number | null = null;
    let existingDelivered: number | null = null;

    if (matchedSubject) {
      matchedSubjectId = matchedSubject.id;
      const compRes = matchComponent(componentType, componentName, matchedSubject.components);
      matchedComponentId = compRes.matchedComponentId;
      isNewComponent = compRes.isNewComponent;

      if (matchedComponentId) {
        const foundComp = matchedSubject.components.find((c) => c.id === matchedComponentId);
        if (foundComp) {
          existingAttended = foundComp.attended;
          existingDelivered = foundComp.delivered;
        }
      }
    } else if (!isAmbiguous) {
      isNewSubject = true;
      isNewComponent = true;
    }

    // Validation checks
    let status: ImportConfidenceStatus = 'CONFIDENT';
    let statusReason: string | undefined;
    let validationError: string | undefined;

    if (attended < 0 || delivered < 0) {
      status = 'UNRESOLVED';
      validationError = 'Attendance counts cannot be negative.';
    } else if (attended > delivered) {
      status = 'UNRESOLVED';
      validationError = `Attended (${attended}) cannot exceed total delivered classes (${delivered}).`;
    } else if (isAmbiguous) {
      status = 'UNRESOLVED';
      const names = ambiguousCandidates.map((c) => c.name).join(' OR ');
      statusReason = `Ambiguous subject match (${names}). Select correct subject.`;
    } else if (isNewSubject) {
      status = 'NEEDS_REVIEW';
      statusReason = `Subject "${subjectName}" not found. Will be created as NEW SUBJECT.`;
    } else if (isNewComponent) {
      status = 'NEEDS_REVIEW';
      statusReason = `Component "${componentName}" (${componentType}) not found on subject. Will be created as NEW COMPONENT.`;
    } else if (hasPercentageMismatch) {
      status = 'NEEDS_REVIEW';
      statusReason = `⚠️ Spreadsheet percentage (${raw.reportedPercentage}%) differs from calculated attendance (${calculatedPercentage}%). Canonical value remains ${attended}/${delivered}.`;
    }

    return {
      id,
      subjectName,
      subjectCode,
      componentName,
      componentType,
      attended,
      delivered,
      reportedPercentage: raw.reportedPercentage,
      calculatedPercentage,
      hasPercentageMismatch,
      sourceSheet: raw.sourceSheet,
      sourceRow: raw.sourceRow,
      sourceCell: raw.sourceCell,
      matchedSubjectId,
      matchedComponentId,
      isNewSubject,
      isNewComponent,
      existingAttended,
      existingDelivered,
      status,
      statusReason,
      validationError,
    };
  });
}
