import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type AttendanceLogRow = Database['public']['Tables']['attendance_log']['Row'];

export type AttendanceStatusType = 'ATTENDED' | 'MISSED';

export interface SubjectRelation {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
}

export interface ComponentRelation {
  id: string;
  type: string;
  name: string | null;
}

export interface TimetableSlotRelation {
  id: string;
  start_time: string;
  end_time: string;
  room: string | null;
}

export interface AttendanceLogWithRelations extends AttendanceLogRow {
  subjects?: SubjectRelation | null;
  components?: ComponentRelation | null;
  timetable_slots?: TimetableSlotRelation | null;
}

export interface MarkAttendanceInput {
  semesterId: string;
  subjectId: string;
  componentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatusType;
  slotId?: string | null;
}

export interface ListAttendanceLogsFilters {
  subjectId?: string;
  componentId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Ensures user is authenticated.
 */
async function requireAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Authentication required: Session does not exist.');
  }
  return user;
}

/**
 * Validates date string format (YYYY-MM-DD).
 */
export function validateDateFormat(dateStr: string): void {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('Attendance date is required.');
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    throw new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const parsedDate = new Date(dateStr);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid calendar date "${dateStr}".`);
  }
}

/**
 * Validates attendance status.
 */
export function validateAttendanceStatus(status: string): void {
  if (status !== 'ATTENDED' && status !== 'MISSED') {
    throw new Error(`Invalid attendance status "${status}". Must be "ATTENDED" or "MISSED".`);
  }
}

/**
 * Validates component counters ensuring non-negative and attended <= delivered.
 */
export function validateComponentCounters(attended: number, delivered: number): void {
  if (attended < 0 || delivered < 0) {
    throw new Error('Attendance counters cannot be negative.');
  }
  if (attended > delivered) {
    throw new Error(`Attended classes (${attended}) cannot exceed total delivered classes (${delivered}).`);
  }
}

/**
 * Validates relationships:
 * - semester belongs to current user (enforced via Supabase RLS & FKs)
 * - subject belongs to semester
 * - component belongs to subject
 * - timetable slot belongs to semester/subject/component (when slotId provided)
 */
export async function validateAttendanceRelationships(
  semesterId: string,
  subjectId: string,
  componentId: string,
  slotId?: string | null
): Promise<void> {
  // 1. Verify subject belongs to semester
  const subjectsTable = supabase.from('subjects') as any;
  const { data: subjectRow, error: subErr } = await subjectsTable
    .select('id, semester_id')
    .eq('id', subjectId)
    .maybeSingle();

  if (subErr || !subjectRow || subjectRow.semester_id !== semesterId) {
    throw new Error('Subject does not belong to the selected semester.');
  }

  // 2. Verify component belongs to subject
  const compTable = supabase.from('components') as any;
  const { data: compRow, error: compErr } = await compTable
    .select('id, subject_id')
    .eq('id', componentId)
    .maybeSingle();

  if (compErr || !compRow || compRow.subject_id !== subjectId) {
    throw new Error('Selected component does not belong to the selected subject.');
  }

  // 3. Verify timetable slot if slotId provided
  if (slotId) {
    const slotsTable = supabase.from('timetable_slots') as any;
    const { data: slotRow, error: slotErr } = await slotsTable
      .select('id, semester_id, subject_id, component_id')
      .eq('id', slotId)
      .maybeSingle();

    if (slotErr || !slotRow) {
      throw new Error('Timetable slot not found.');
    }

    if (
      slotRow.semester_id !== semesterId ||
      slotRow.subject_id !== subjectId ||
      (slotRow.component_id && slotRow.component_id !== componentId)
    ) {
      throw new Error('Timetable slot does not belong to the selected subject/component.');
    }
  }
}

/**
 * Lists attendance logs for a semester with optional filters.
 */
export async function listAttendanceLogs(
  semesterId?: string,
  filters?: ListAttendanceLogsFilters
): Promise<AttendanceLogWithRelations[]> {
  await requireAuth();

  const logTable = supabase.from('attendance_log') as any;
  let query = logTable
    .select('*, subjects(id, name, code, color), components(id, type, name), timetable_slots(id, start_time, end_time, room)');

  if (semesterId) {
    query = query.eq('semester_id', semesterId);
  }

  if (filters?.subjectId) {
    query = query.eq('subject_id', filters.subjectId);
  }

  if (filters?.componentId) {
    query = query.eq('component_id', filters.componentId);
  }

  if (filters?.date) {
    query = query.eq('date', filters.date);
  }

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }

  const { data, error } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load attendance logs: ${error.message}`);
  }

  return (data as AttendanceLogWithRelations[]) || [];
}

/**
 * Gets attendance logs for a specific semester and date.
 */
export async function getAttendanceForDate(
  semesterId: string,
  date: string
): Promise<AttendanceLogWithRelations[]> {
  validateDateFormat(date);
  return listAttendanceLogs(semesterId, { date });
}

/**
 * Marks attendance for a component/slot.
 * Handles idempotency (same status clicked again = no-op) and status swapping (ATTENDED <-> MISSED).
 */
export async function markAttendance(input: MarkAttendanceInput): Promise<AttendanceLogWithRelations> {
  await requireAuth();
  validateDateFormat(input.date);
  validateAttendanceStatus(input.status);

  await validateAttendanceRelationships(
    input.semesterId,
    input.subjectId,
    input.componentId,
    input.slotId
  );

  const logTable = supabase.from('attendance_log') as any;
  const compTable = supabase.from('components') as any;

  // Check for existing log with duplicate protection rule:
  // component_id + date + slot_id (when slot_id exists)
  // component_id + date (when slot_id is null)
  let existingQuery = logTable
    .select('*')
    .eq('semester_id', input.semesterId)
    .eq('subject_id', input.subjectId)
    .eq('component_id', input.componentId)
    .eq('date', input.date);

  if (input.slotId) {
    existingQuery = existingQuery.eq('slot_id', input.slotId);
  } else {
    existingQuery = existingQuery.is('slot_id', null);
  }

  const { data: existingLogs, error: checkErr } = await existingQuery;
  if (checkErr) {
    throw new Error(`Failed to check existing attendance log: ${checkErr.message}`);
  }

  const existingLog = existingLogs && existingLogs.length > 0 ? (existingLogs[0] as AttendanceLogRow) : null;

  // Case 1: Existing log found
  if (existingLog) {
    // Subcase 1a: Idempotent - same status selected again
    if (existingLog.status === input.status) {
      const { data: logWithRel } = await logTable
        .select('*, subjects(id, name, code, color), components(id, type, name), timetable_slots(id, start_time, end_time, room)')
        .eq('id', existingLog.id)
        .single();

      return (logWithRel || existingLog) as AttendanceLogWithRelations;
    }

    // Subcase 1b: Status Swapping (e.g. MISSED -> ATTENDED or ATTENDED -> MISSED)
    const { data: compRow, error: fetchCompErr } = await compTable
      .select('id, attended, delivered')
      .eq('id', input.componentId)
      .single();

    if (fetchCompErr || !compRow) {
      throw new Error('Target component not found for counter update.');
    }

    let attendedDelta = 0;
    let deliveredDelta = 0; // Swap never changes total delivered classes!

    if (existingLog.status === 'MISSED' && input.status === 'ATTENDED') {
      attendedDelta = 1;
    } else if (existingLog.status === 'ATTENDED' && input.status === 'MISSED') {
      attendedDelta = -1;
    }

    const nextAttended = compRow.attended + attendedDelta;
    const nextDelivered = compRow.delivered + deliveredDelta;

    validateComponentCounters(nextAttended, nextDelivered);

    // Update component counters
    const { error: compUpdateErr } = await compTable
      .update({
        attended: nextAttended,
        delivered: nextDelivered,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.componentId);

    if (compUpdateErr) {
      throw new Error(`Failed to update component counters: ${compUpdateErr.message}`);
    }

    // Update log status
    const { data: updatedLog, error: logUpdateErr } = await logTable
      .update({
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingLog.id)
      .select('*, subjects(id, name, code, color), components(id, type, name), timetable_slots(id, start_time, end_time, room)')
      .single();

    if (logUpdateErr) {
      throw new Error(`Failed to update attendance log: ${logUpdateErr.message}`);
    }

    return updatedLog as AttendanceLogWithRelations;
  }

  // Case 2: No existing log found -> New Attendance Entry
  const { data: compRow, error: fetchCompErr } = await compTable
    .select('id, attended, delivered')
    .eq('id', input.componentId)
    .single();

  if (fetchCompErr || !compRow) {
    throw new Error('Target component not found.');
  }

  const attendedDelta = input.status === 'ATTENDED' ? 1 : 0;
  const deliveredDelta = 1;

  const nextAttended = compRow.attended + attendedDelta;
  const nextDelivered = compRow.delivered + deliveredDelta;

  validateComponentCounters(nextAttended, nextDelivered);

  // Update component counters
  const { error: compUpdateErr } = await compTable
    .update({
      attended: nextAttended,
      delivered: nextDelivered,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.componentId);

  if (compUpdateErr) {
    throw new Error(`Failed to update component counters: ${compUpdateErr.message}`);
  }

  // Create new attendance log
  const { data: newLog, error: logInsertErr } = await logTable
    .insert({
      semester_id: input.semesterId,
      subject_id: input.subjectId,
      component_id: input.componentId,
      slot_id: input.slotId || null,
      date: input.date,
      status: input.status,
    })
    .select('*, subjects(id, name, code, color), components(id, type, name), timetable_slots(id, start_time, end_time, room)')
    .single();

  if (logInsertErr) {
    // Rollback component counters if log creation failed
    await compTable
      .update({
        attended: compRow.attended,
        delivered: compRow.delivered,
      })
      .eq('id', input.componentId);

    throw new Error(`Failed to record attendance log: ${logInsertErr.message}`);
  }

  return newLog as AttendanceLogWithRelations;
}

/**
 * Updates attendance status for an existing log record.
 */
export async function updateAttendanceStatus(
  logId: string,
  newStatus: AttendanceStatusType
): Promise<AttendanceLogWithRelations> {
  await requireAuth();
  validateAttendanceStatus(newStatus);

  const logTable = supabase.from('attendance_log') as any;
  const compTable = supabase.from('components') as any;

  const { data: existingLog, error: fetchErr } = await logTable
    .select('*')
    .eq('id', logId)
    .maybeSingle();

  if (fetchErr || !existingLog) {
    throw new Error('Attendance log entry not found.');
  }

  if (existingLog.status === newStatus) {
    const { data: logWithRel } = await logTable
      .select('*, subjects(id, name, code, color), components(id, type, name), timetable_slots(id, start_time, end_time, room)')
      .eq('id', logId)
      .single();

    return (logWithRel || existingLog) as AttendanceLogWithRelations;
  }

  // Perform status swap calculation
  const { data: compRow, error: compErr } = await compTable
    .select('id, attended, delivered')
    .eq('id', existingLog.component_id)
    .single();

  if (compErr || !compRow) {
    throw new Error('Component associated with attendance log not found.');
  }

  let attendedDelta = 0;
  if (existingLog.status === 'MISSED' && newStatus === 'ATTENDED') {
    attendedDelta = 1;
  } else if (existingLog.status === 'ATTENDED' && newStatus === 'MISSED') {
    attendedDelta = -1;
  }

  const nextAttended = compRow.attended + attendedDelta;
  const nextDelivered = compRow.delivered;

  validateComponentCounters(nextAttended, nextDelivered);

  // Update component
  const { error: updateCompErr } = await compTable
    .update({
      attended: nextAttended,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingLog.component_id);

  if (updateCompErr) {
    throw new Error(`Failed to update component counters: ${updateCompErr.message}`);
  }

  // Update log
  const { data: updatedLog, error: updateLogErr } = await logTable
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', logId)
    .select('*, subjects(id, name, code, color), components(id, type, name), timetable_slots(id, start_time, end_time, room)')
    .single();

  if (updateLogErr) {
    throw new Error(`Failed to update attendance log: ${updateLogErr.message}`);
  }

  return updatedLog as AttendanceLogWithRelations;
}

/**
 * Deletes/unmarks an attendance log record.
 * Reverses the corresponding component attendance counters:
 * - ATTENDED record: delivered -1, attended -1
 * - MISSED record: delivered -1, attended -0
 */
export async function deleteAttendanceLog(logId: string): Promise<void> {
  await requireAuth();

  const logTable = supabase.from('attendance_log') as any;
  const compTable = supabase.from('components') as any;

  const { data: existingLog, error: fetchErr } = await logTable
    .select('*')
    .eq('id', logId)
    .maybeSingle();

  if (fetchErr || !existingLog) {
    return; // Already deleted or doesn't exist
  }

  const { data: compRow } = await compTable
    .select('id, attended, delivered')
    .eq('id', existingLog.component_id)
    .maybeSingle();

  if (compRow) {
    const attendedDelta = existingLog.status === 'ATTENDED' ? -1 : 0;
    const deliveredDelta = -1;

    const nextAttended = compRow.attended + attendedDelta;
    const nextDelivered = compRow.delivered + deliveredDelta;

    validateComponentCounters(nextAttended, nextDelivered);

    await compTable
      .update({
        attended: nextAttended,
        delivered: nextDelivered,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingLog.component_id);
  }

  const { error: deleteErr } = await logTable
    .delete()
    .eq('id', logId);

  if (deleteErr) {
    throw new Error(`Failed to delete attendance log: ${deleteErr.message}`);
  }
}
