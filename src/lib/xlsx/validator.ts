import { ExtractedTimetableSlot, TimetableImportSummary } from '@/types/xlsx.types';
import { isOverlapping, parseTimeToMinutes } from '@/lib/timetable.functions';

/**
 * Validates extracted timetable slots for duplicates, invalid time ranges, and timetable overlaps.
 * Updates slot status and generates import summary.
 */
export function validateAndSummarizeImport(
  slots: ExtractedTimetableSlot[],
  sheetsScanned: number
): {
  validatedSlots: ExtractedTimetableSlot[];
  summary: TimetableImportSummary;
} {
  const validatedSlots: ExtractedTimetableSlot[] = slots.map((slot) => ({ ...slot }));

  // 1. Invalid time range check & clear old conflict flags
  for (const slot of validatedSlots) {
    slot.hasOverlapConflict = false;
    slot.overlapConflictDetails = undefined;
    slot.isDuplicate = false;

    const startMin = parseTimeToMinutes(slot.startTime);
    const endMin = parseTimeToMinutes(slot.endTime);

    if (startMin >= endMin) {
      slot.status = 'UNRESOLVED';
      slot.statusReason = `Invalid time range: start (${slot.startTime}) must be earlier than end (${slot.endTime}).`;
    }
  }

  // 2. Duplicate detection within the list
  const seenSlots = new Set<string>();
  for (const slot of validatedSlots) {
    const key = `${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}-${slot.subjectName.toLowerCase()}-${slot.componentName.toLowerCase()}`;
    if (seenSlots.has(key)) {
      slot.isDuplicate = true;
      if (slot.status !== 'UNRESOLVED') {
        slot.status = 'NEEDS_REVIEW';
        slot.statusReason = 'Duplicate timetable slot detected. Review or remove if accidental.';
      }
    } else {
      seenSlots.add(key);
    }
  }

  // 3. Overlap check among slots on the same day
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

  for (const day of days) {
    const daySlots = validatedSlots.filter((s) => s.dayOfWeek === day);

    for (let i = 0; i < daySlots.length; i++) {
      for (let j = i + 1; j < daySlots.length; j++) {
        const slotA = daySlots[i];
        const slotB = daySlots[j];

        if (isOverlapping(slotA.startTime, slotA.endTime, slotB.startTime, slotB.endTime)) {
          slotA.hasOverlapConflict = true;
          slotB.hasOverlapConflict = true;

          const conflictMsg = `Overlap conflict: (${slotA.startTime}–${slotA.endTime}) overlaps with (${slotB.startTime}–${slotB.endTime}) on ${day}.`;
          slotA.overlapConflictDetails = conflictMsg;
          slotB.overlapConflictDetails = conflictMsg;

          slotA.status = 'UNRESOLVED';
          slotB.status = 'UNRESOLVED';
        }
      }
    }
  }

  // 4. Calculate summary statistics
  const uniqueSubjects = new Set(validatedSlots.map((s) => s.subjectName.toLowerCase())).size;
  const uniqueComponents = new Set(validatedSlots.map((s) => `${s.subjectName.toLowerCase()}-${s.componentName.toLowerCase()}`)).size;

  let confidentCount = 0;
  let needsReviewCount = 0;
  let unresolvedCount = 0;
  let hasConflicts = false;

  for (const slot of validatedSlots) {
    if (slot.status === 'CONFIDENT') {
      confidentCount++;
    } else if (slot.status === 'NEEDS_REVIEW') {
      needsReviewCount++;
    } else {
      unresolvedCount++;
    }

    if (slot.hasOverlapConflict || slot.status === 'UNRESOLVED') {
      hasConflicts = true;
    }
  }

  return {
    validatedSlots,
    summary: {
      sheetsScanned,
      classesDetected: validatedSlots.length,
      subjectsDetected: uniqueSubjects,
      componentsDetected: uniqueComponents,
      confidentCount,
      needsReviewCount,
      unresolvedCount,
      hasConflicts,
    },
  };
}
