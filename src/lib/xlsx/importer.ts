import {
  ExtractedTimetableSlot,
  TimetableImportStrategy,
} from '@/types/xlsx.types';
import { createSubject, listSubjects, SubjectWithComponents } from '@/lib/subjects.functions';
import { createComponent, listComponents } from '@/lib/components.functions';
import {
  createTimetableSlot,
  listTimetableSlots,
  deleteTimetableSlot,
  DayOfWeekEnum,
  formatTimeHHMM,
} from '@/lib/timetable.functions';

export interface ExecuteImportResult {
  slotsImported: number;
  subjectsCreated: number;
  componentsCreated: number;
}

/**
 * Executes final writing of confirmed timetable slots into Supabase database.
 * Never deletes or modifies attendance_log historical records.
 */
export async function executeTimetableImport(
  semesterId: string,
  slots: ExtractedTimetableSlot[],
  strategy: TimetableImportStrategy
): Promise<ExecuteImportResult> {
  if (!semesterId) {
    throw new Error('Active semester ID is required for timetable import.');
  }

  if (slots.length === 0) {
    throw new Error('No timetable slots provided for import.');
  }

  // Check for unresolved slots or overlap conflicts
  const unresolved = slots.filter((s) => s.status === 'UNRESOLVED' || s.hasOverlapConflict);
  if (unresolved.length > 0) {
    throw new Error(`Cannot import timetable with ${unresolved.length} unresolved mapping(s) or conflict(s).`);
  }

  let subjectsCreatedCount = 0;
  let componentsCreatedCount = 0;

  // Step 1: If REPLACE strategy, clear existing timetable slots
  if (strategy === 'REPLACE') {
    const existingSlots = await listTimetableSlots(semesterId);
    for (const slot of existingSlots) {
      await deleteTimetableSlot(slot.id);
    }
  }

  // Fetch current subjects in semester
  let currentSubjects: SubjectWithComponents[] = await listSubjects(semesterId);

  // Map to keep track of subject name -> subject ID
  const subjectMap = new Map<string, string>();
  for (const sub of currentSubjects) {
    subjectMap.set(sub.name.trim().toLowerCase(), sub.id);
    if (sub.code) {
      subjectMap.set(sub.code.trim().toUpperCase(), sub.id);
    }
  }

  // Step 2: Ensure all subjects exist
  for (const slot of slots) {
    let subId = slot.matchedSubjectId;

    if (!subId) {
      const nameKey = slot.subjectName.trim().toLowerCase();
      const codeKey = slot.subjectCode?.trim().toUpperCase();

      if (codeKey && subjectMap.has(codeKey)) {
        subId = subjectMap.get(codeKey)!;
      } else if (subjectMap.has(nameKey)) {
        subId = subjectMap.get(nameKey)!;
      } else {
        // Create new subject
        const newSub = await createSubject({
          semesterId,
          name: slot.subjectName.trim(),
          code: slot.subjectCode?.trim() || null,
        });

        subId = newSub.id;
        subjectsCreatedCount++;
        subjectMap.set(nameKey, subId);
        if (slot.subjectCode) subjectMap.set(slot.subjectCode.trim().toUpperCase(), subId);

        // Update list
        currentSubjects.push(newSub);
      }

      slot.matchedSubjectId = subId;
    }
  }

  // Map to keep track of subjectId + componentType/Name -> component ID
  const componentMap = new Map<string, string>();

  // Fetch current components for all subjects
  for (const sub of currentSubjects) {
    const comps = await listComponents(sub.id);
    for (const c of comps) {
      componentMap.set(`${sub.id}-${c.type}`, c.id);
      if (c.name) {
        componentMap.set(`${sub.id}-${c.name.trim().toLowerCase()}`, c.id);
      }
    }
  }

  // Step 3: Ensure all components exist
  for (const slot of slots) {
    const subId = slot.matchedSubjectId!;
    let compId = slot.matchedComponentId;

    if (!compId) {
      const typeKey = `${subId}-${slot.componentType}`;
      const nameKey = `${subId}-${slot.componentName.trim().toLowerCase()}`;

      if (componentMap.has(nameKey)) {
        compId = componentMap.get(nameKey)!;
      } else if (componentMap.has(typeKey)) {
        compId = componentMap.get(typeKey)!;
      } else {
        // Create new component
        const newComp = await createComponent({
          subjectId: subId,
          type: slot.componentType,
          name: slot.componentName.trim(),
          attended: 0,
          delivered: 0,
        });

        compId = newComp.id;
        componentsCreatedCount++;
        componentMap.set(typeKey, compId);
        componentMap.set(nameKey, compId);
      }

      slot.matchedComponentId = compId;
    }
  }

  // Step 4: Create timetable slots in Supabase
  let slotsImportedCount = 0;

  // Fetch remaining slots if MERGE strategy to avoid duplicate slot creation
  let existingSlotsInSem = strategy === 'MERGE' ? await listTimetableSlots(semesterId) : [];

  for (const slot of slots) {
    const startTimeHHMM = formatTimeHHMM(slot.startTime);
    const endTimeHHMM = formatTimeHHMM(slot.endTime);

    if (strategy === 'MERGE') {
      const isAlreadySaved = existingSlotsInSem.some(
        (e) =>
          e.subject_id === slot.matchedSubjectId &&
          e.component_id === slot.matchedComponentId &&
          e.day_of_week === slot.dayOfWeek &&
          formatTimeHHMM(e.start_time) === startTimeHHMM &&
          formatTimeHHMM(e.end_time) === endTimeHHMM
      );

      if (isAlreadySaved) {
        continue;
      }
    }

    await createTimetableSlot({
      semesterId,
      subjectId: slot.matchedSubjectId!,
      componentId: slot.matchedComponentId!,
      dayOfWeek: slot.dayOfWeek as DayOfWeekEnum,
      startTime: startTimeHHMM,
      endTime: endTimeHHMM,
      room: slot.room || null,
      faculty: slot.instructor || null,
    });

    slotsImportedCount++;
  }

  return {
    slotsImported: slotsImportedCount,
    subjectsCreated: subjectsCreatedCount,
    componentsCreated: componentsCreatedCount,
  };
}
