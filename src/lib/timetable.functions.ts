import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type TimetableSlotRow = Database['public']['Tables']['timetable_slots']['Row'];

export type DayOfWeekEnum = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

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

export interface TimetableSlotWithRelations extends TimetableSlotRow {
  subjects?: SubjectRelation | null;
  components?: ComponentRelation | null;
}

export interface CreateTimetableSlotInput {
  semesterId: string;
  subjectId: string;
  componentId: string;
  dayOfWeek: DayOfWeekEnum;
  startTime: string; // "HH:MM" or "HH:MM:SS"
  endTime: string;   // "HH:MM" or "HH:MM:SS"
  room?: string | null;
  faculty?: string | null;
  slotOrder?: number | null;
}

export interface UpdateTimetableSlotInput {
  dayOfWeek?: DayOfWeekEnum;
  startTime?: string;
  endTime?: string;
  subjectId?: string;
  componentId?: string;
  room?: string | null;
  faculty?: string | null;
  slotOrder?: number | null;
}

const VALID_DAYS: DayOfWeekEnum[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

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
 * Converts a time string "HH:MM" or "HH:MM:SS" to total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap.
 * Adjacent classes (e.g. 10:00-11:00 and 11:00-12:00) do NOT overlap.
 */
export function isOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const minStartA = parseTimeToMinutes(startA);
  const minEndA = parseTimeToMinutes(endA);
  const minStartB = parseTimeToMinutes(startB);
  const minEndB = parseTimeToMinutes(endB);

  return minStartA < minEndB && minEndA > minStartB;
}

/**
 * Normalizes time string to "HH:MM" format.
 */
export function formatTimeHHMM(timeStr: string): string {
  if (!timeStr) return '00:00';
  const parts = timeStr.split(':');
  const h = parts[0]?.padStart(2, '0') || '00';
  const m = parts[1]?.padStart(2, '0') || '00';
  return `${h}:${m}`;
}

/**
 * Validates slot input parameters and relationships.
 */
export async function validateSlotInput(
  semesterId: string,
  subjectId: string,
  componentId: string,
  dayOfWeek: DayOfWeekEnum,
  startTime: string,
  endTime: string,
  excludeSlotId?: string
): Promise<void> {
  if (!VALID_DAYS.includes(dayOfWeek)) {
    throw new Error(`Invalid day of week "${dayOfWeek}".`);
  }

  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  if (startMin >= endMin) {
    throw new Error(`Start time (${startTime}) must be strictly earlier than end time (${endTime}).`);
  }

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

  // 3. Fetch existing slots on the same day for overlap & duplicate checking
  const slotsTable = supabase.from('timetable_slots') as any;
  let query = slotsTable
    .select('id, day_of_week, start_time, end_time, subject_id, component_id')
    .eq('semester_id', semesterId)
    .eq('day_of_week', dayOfWeek);

  if (excludeSlotId) {
    query = query.neq('id', excludeSlotId);
  }

  const { data: existingSlots, error: slotsErr } = await query;
  if (slotsErr) {
    throw new Error(`Failed to query existing slots for overlap check: ${slotsErr.message}`);
  }

  if (existingSlots && existingSlots.length > 0) {
    for (const slot of existingSlots as TimetableSlotRow[]) {
      // Duplicate check
      if (
        slot.subject_id === subjectId &&
        slot.component_id === componentId &&
        formatTimeHHMM(slot.start_time) === formatTimeHHMM(startTime) &&
        formatTimeHHMM(slot.end_time) === formatTimeHHMM(endTime)
      ) {
        throw new Error('An identical timetable slot already exists on this day and time.');
      }

      // Overlap check
      if (isOverlapping(startTime, endTime, slot.start_time, slot.end_time)) {
        throw new Error(
          `Timetable slot (${startTime}–${endTime}) overlaps with an existing class (${formatTimeHHMM(slot.start_time)}–${formatTimeHHMM(slot.end_time)}) on ${dayOfWeek}.`
        );
      }
    }
  }
}

/**
 * Lists all timetable slots for a semester, including subjects and components.
 */
export async function listTimetableSlots(semesterId: string): Promise<TimetableSlotWithRelations[]> {
  await requireAuth();

  const slotsTable = supabase.from('timetable_slots') as any;
  const { data, error } = await slotsTable
    .select('*, subjects(id, name, code, color), components(id, type, name)')
    .eq('semester_id', semesterId)
    .order('start_time', { ascending: true })
    .order('slot_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load timetable slots: ${error.message}`);
  }

  return (data as TimetableSlotWithRelations[]) || [];
}

/**
 * Gets a single timetable slot by ID.
 */
export async function getTimetableSlot(slotId: string): Promise<TimetableSlotWithRelations | null> {
  await requireAuth();

  const slotsTable = supabase.from('timetable_slots') as any;
  const { data, error } = await slotsTable
    .select('*, subjects(id, name, code, color), components(id, type, name)')
    .eq('id', slotId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load timetable slot: ${error.message}`);
  }

  return data as TimetableSlotWithRelations | null;
}

/**
 * Creates a timetable slot.
 */
export async function createTimetableSlot(input: CreateTimetableSlotInput): Promise<TimetableSlotWithRelations> {
  await requireAuth();

  const startTime = formatTimeHHMM(input.startTime);
  const endTime = formatTimeHHMM(input.endTime);

  await validateSlotInput(
    input.semesterId,
    input.subjectId,
    input.componentId,
    input.dayOfWeek,
    startTime,
    endTime
  );

  const slotsTable = supabase.from('timetable_slots') as any;
  const { data, error } = await slotsTable
    .insert({
      semester_id: input.semesterId,
      subject_id: input.subjectId,
      component_id: input.componentId,
      day_of_week: input.dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      room: input.room ? input.room.trim() : null,
      faculty: input.faculty ? input.faculty.trim() : null,
      slot_order: input.slotOrder ?? null,
    })
    .select('*, subjects(id, name, code, color), components(id, type, name)')
    .single();

  if (error) {
    throw new Error(`Failed to create timetable slot: ${error.message}`);
  }

  return data as TimetableSlotWithRelations;
}

/**
 * Updates a timetable slot.
 */
export async function updateTimetableSlot(
  slotId: string,
  input: UpdateTimetableSlotInput
): Promise<TimetableSlotWithRelations> {
  await requireAuth();

  const currentSlot = await getTimetableSlot(slotId);
  if (!currentSlot) {
    throw new Error('Timetable slot not found.');
  }

  const semesterId = currentSlot.semester_id;
  const nextSubjectId = input.subjectId ?? currentSlot.subject_id;
  const nextComponentId = input.componentId ?? currentSlot.component_id ?? '';
  const nextDay = input.dayOfWeek ?? (currentSlot.day_of_week as DayOfWeekEnum);
  const nextStart = formatTimeHHMM(input.startTime ?? currentSlot.start_time);
  const nextEnd = formatTimeHHMM(input.endTime ?? currentSlot.end_time);

  await validateSlotInput(
    semesterId,
    nextSubjectId,
    nextComponentId,
    nextDay,
    nextStart,
    nextEnd,
    slotId
  );

  const updates: Partial<TimetableSlotRow> = {
    subject_id: nextSubjectId,
    component_id: nextComponentId,
    day_of_week: nextDay,
    start_time: nextStart,
    end_time: nextEnd,
  };

  if (input.room !== undefined) updates.room = input.room ? input.room.trim() : null;
  if (input.faculty !== undefined) updates.faculty = input.faculty ? input.faculty.trim() : null;
  if (input.slotOrder !== undefined) updates.slot_order = input.slotOrder;

  const slotsTable = supabase.from('timetable_slots') as any;
  const { data, error } = await slotsTable
    .update(updates)
    .eq('id', slotId)
    .select('*, subjects(id, name, code, color), components(id, type, name)')
    .single();

  if (error) {
    throw new Error(`Failed to update timetable slot: ${error.message}`);
  }

  return data as TimetableSlotWithRelations;
}

/**
 * Deletes a timetable slot.
 * Note: attendance_log.slot_id has ON DELETE SET NULL, so attendance history is NEVER deleted.
 */
export async function deleteTimetableSlot(slotId: string): Promise<void> {
  await requireAuth();

  const slotsTable = supabase.from('timetable_slots') as any;
  const { error } = await slotsTable
    .delete()
    .eq('id', slotId);

  if (error) {
    throw new Error(`Failed to delete timetable slot: ${error.message}`);
  }
}
