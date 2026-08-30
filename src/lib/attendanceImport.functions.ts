import { supabase } from '@/lib/supabase';
import { ExtractedAttendanceRecord } from '@/types/attendanceXlsx.types';
import { createSubject, listSubjects, SubjectWithComponents } from '@/lib/subjects.functions';
import { createComponent, updateComponent, listComponents } from '@/lib/components.functions';

export interface ExecuteAttendanceImportResult {
  recordsUpdated: number;
  subjectsCreated: number;
  componentsCreated: number;
}

async function requireAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Authentication required: Session does not exist.');
  }
  return user;
}

/**
 * Executes attendance import by setting component counters to confirmed reviewed imported values.
 * ABSOLUTE GUARANTEE: NEVER creates or modifies attendance_log entries.
 */
export async function executeAttendanceImport(
  semesterId: string,
  records: ExtractedAttendanceRecord[]
): Promise<ExecuteAttendanceImportResult> {
  await requireAuth();

  if (!semesterId) {
    throw new Error('Active semester ID is required for attendance import.');
  }

  if (records.length === 0) {
    throw new Error('No attendance records provided for import.');
  }

  const unresolved = records.filter((r) => r.status === 'UNRESOLVED' || r.validationError);
  if (unresolved.length > 0) {
    throw new Error(`Cannot import attendance with ${unresolved.length} unresolved mapping(s) or validation error(s).`);
  }

  let subjectsCreatedCount = 0;
  let componentsCreatedCount = 0;
  let recordsUpdatedCount = 0;

  // 1. Fetch current subjects in semester
  let currentSubjects: SubjectWithComponents[] = await listSubjects(semesterId);

  const subjectMap = new Map<string, string>();
  for (const sub of currentSubjects) {
    subjectMap.set(sub.name.trim().toLowerCase(), sub.id);
    if (sub.code) {
      subjectMap.set(sub.code.trim().toUpperCase(), sub.id);
    }
  }

  // 2. Ensure all subjects exist
  for (const rec of records) {
    let subId = rec.matchedSubjectId;

    if (!subId) {
      const nameKey = rec.subjectName.trim().toLowerCase();
      const codeKey = rec.subjectCode?.trim().toUpperCase();

      if (codeKey && subjectMap.has(codeKey)) {
        subId = subjectMap.get(codeKey)!;
      } else if (subjectMap.has(nameKey)) {
        subId = subjectMap.get(nameKey)!;
      } else {
        // Create new subject
        const newSub = await createSubject({
          semesterId,
          name: rec.subjectName.trim(),
          code: rec.subjectCode?.trim() || null,
        });

        subId = newSub.id;
        subjectsCreatedCount++;
        subjectMap.set(nameKey, subId);
        if (rec.subjectCode) subjectMap.set(rec.subjectCode.trim().toUpperCase(), subId);

        currentSubjects.push(newSub);
      }

      rec.matchedSubjectId = subId;
    }
  }

  // 3. Ensure all components exist and update counters
  for (const rec of records) {
    const subId = rec.matchedSubjectId!;
    let compId = rec.matchedComponentId;

    const existingComps = await listComponents(subId);
    let comp = existingComps.find(
      (c) => c.type === rec.componentType || (c.name || '').trim().toLowerCase() === rec.componentName.trim().toLowerCase()
    );

    if (!comp) {
      // Create new component with the imported attended & delivered counts
      const newComp = await createComponent({
        subjectId: subId,
        type: rec.componentType,
        name: rec.componentName.trim(),
        attended: rec.attended,
        delivered: rec.delivered,
      });

      compId = newComp.id;
      componentsCreatedCount++;
      recordsUpdatedCount++;
      rec.matchedComponentId = compId;
    } else {
      compId = comp.id;
      rec.matchedComponentId = compId;

      // SET component counters to the imported values (replace, NOT additively double-count!)
      await updateComponent(compId, {
        attended: rec.attended,
        delivered: rec.delivered,
      });

      recordsUpdatedCount++;
    }
  }

  return {
    recordsUpdated: recordsUpdatedCount,
    subjectsCreated: subjectsCreatedCount,
    componentsCreated: componentsCreatedCount,
  };
}
