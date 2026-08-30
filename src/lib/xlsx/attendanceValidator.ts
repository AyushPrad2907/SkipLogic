import {
  ExtractedAttendanceRecord,
  AttendanceImportSummary,
} from '@/types/attendanceXlsx.types';

/**
 * Aggregates duplicate subject + component rows if appropriate, validates counts, and computes summary statistics.
 */
export function validateAndSummarizeAttendanceImport(
  records: ExtractedAttendanceRecord[],
  sheetsScanned: number,
  shouldAggregateDuplicates: boolean = true
): {
  validatedRecords: ExtractedAttendanceRecord[];
  summary: AttendanceImportSummary;
} {
  let list: ExtractedAttendanceRecord[] = records.map((r) => ({ ...r }));

  // Optional Component Aggregation
  if (shouldAggregateDuplicates && list.length > 1) {
    const grouped = new Map<string, ExtractedAttendanceRecord[]>();

    for (const item of list) {
      const key = item.matchedSubjectId
        ? `${item.matchedSubjectId}-${item.componentType}`
        : `${item.subjectName.toLowerCase()}-${item.componentType}`;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    }

    const aggregatedList: ExtractedAttendanceRecord[] = [];

    for (const items of grouped.values()) {
      if (items.length === 1) {
        aggregatedList.push(items[0]);
      } else {
        // Aggregate multiple rows for same component
        const first = items[0];
        let sumAttended = 0;
        let sumDelivered = 0;

        for (const it of items) {
          sumAttended += it.attended;
          sumDelivered += it.delivered;
        }

        const calcPct = sumDelivered > 0 ? Number(((sumAttended / sumDelivered) * 100).toFixed(2)) : 100;

        aggregatedList.push({
          ...first,
          id: `aggregated-${first.id}`,
          attended: sumAttended,
          delivered: sumDelivered,
          calculatedPercentage: calcPct,
          statusReason: items.some((i) => i.statusReason)
            ? items.map((i) => i.statusReason).filter(Boolean).join('; ')
            : `Aggregated ${items.length} session records into single total (${sumAttended}/${sumDelivered}).`,
        });
      }
    }

    list = aggregatedList;
  }

  // Re-verify validation rules on each record
  let confidentCount = 0;
  let needsReviewCount = 0;
  let unresolvedCount = 0;
  let totalAttended = 0;
  let totalDelivered = 0;
  let hasConflicts = false;

  const uniqueSubjects = new Set(list.map((r) => r.subjectName.toLowerCase())).size;
  const uniqueComponents = new Set(list.map((r) => `${r.subjectName.toLowerCase()}-${r.componentName.toLowerCase()}`)).size;

  for (const record of list) {
    if (record.attended < 0 || record.delivered < 0) {
      record.status = 'UNRESOLVED';
      record.validationError = 'Attendance counts cannot be negative.';
    } else if (record.attended > record.delivered) {
      record.status = 'UNRESOLVED';
      record.validationError = `Attended (${record.attended}) cannot exceed total delivered classes (${record.delivered}).`;
    }

    if (record.status === 'CONFIDENT') {
      confidentCount++;
    } else if (record.status === 'NEEDS_REVIEW') {
      needsReviewCount++;
    } else {
      unresolvedCount++;
    }

    if (record.status === 'UNRESOLVED' || record.validationError) {
      hasConflicts = true;
    }

    totalAttended += record.attended;
    totalDelivered += record.delivered;
  }

  return {
    validatedRecords: list,
    summary: {
      sheetsScanned,
      subjectsDetected: uniqueSubjects,
      componentsDetected: uniqueComponents,
      recordsDetected: list.length,
      totalAttended,
      totalDelivered,
      confidentCount,
      needsReviewCount,
      unresolvedCount,
      hasConflicts,
    },
  };
}
