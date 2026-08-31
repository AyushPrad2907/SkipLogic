import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type SemesterRow = Database['public']['Tables']['semesters']['Row'];
export type HolidayRow = Database['public']['Tables']['holidays']['Row'];

/**
 * Lists all semesters belonging to the authenticated user.
 */
export async function listSemesters(): Promise<SemesterRow[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required: No active session.');
  }

  const semestersTable = supabase.from('semesters') as any;
  const { data, error } = await semestersTable
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list semesters: ${error.message}`);
  }

  return (data || []) as SemesterRow[];
}

/**
 * Ensures the authenticated user has an active semester.
 * Returns the active semester or creates a default active semester if none exists.
 */
export async function getActiveSemester(): Promise<SemesterRow> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required: No active session.');
  }

  const semestersTable = supabase.from('semesters') as any;

  // 1. Check for active semester
  const { data: activeSemesters, error: activeError } = await semestersTable
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1);

  if (activeError) {
    throw new Error(`Failed to query active semester: ${activeError.message}`);
  }

  if (activeSemesters && activeSemesters.length > 0) {
    return activeSemesters[0] as SemesterRow;
  }

  // 2. If no active semester, check any semester for user
  const { data: anySemesters, error: anyError } = await semestersTable
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (anyError) {
    throw new Error(`Failed to query user semesters: ${anyError.message}`);
  }

  if (anySemesters && anySemesters.length > 0) {
    const sem = anySemesters[0] as SemesterRow;
    await semestersTable.update({ is_active: true }).eq('id', sem.id);
    return { ...sem, is_active: true };
  }

  // 3. If no semesters exist at all, create a default semester
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: created, error: createError } = await semestersTable
    .insert({
      user_id: user.id,
      name: 'Current Semester',
      start_date: startDate,
      end_date: endDate,
      threshold: 75,
      working_days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      is_active: true,
    })
    .select()
    .single();

  if (createError || !created) {
    throw new Error(`Failed to create initial semester: ${createError?.message || 'Unknown error'}`);
  }

  return created as SemesterRow;
}

/**
 * Creates a new semester for the authenticated user.
 */
export async function createSemester(input: {
  name: string;
  startDate: string;
  endDate: string;
  threshold?: number;
  workingDays?: string[];
  isActive?: boolean;
}): Promise<SemesterRow> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required: No active session.');
  }

  const semestersTable = supabase.from('semesters') as any;

  if (input.isActive) {
    // Deactivate all other semesters first
    await semestersTable
      .update({ is_active: false })
      .eq('user_id', user.id);
  }

  const { data: created, error } = await semestersTable
    .insert({
      user_id: user.id,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      threshold: input.threshold ?? 75,
      working_days: input.workingDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      is_active: input.isActive ?? true,
    })
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Failed to create semester: ${error?.message || 'Unknown error'}`);
  }

  return created as SemesterRow;
}

/**
 * Updates an existing semester.
 */
export async function updateSemester(
  semesterId: string,
  updates: {
    name?: string;
    startDate?: string;
    endDate?: string;
    threshold?: number;
    workingDays?: string[];
    isActive?: boolean;
  }
): Promise<SemesterRow> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required: No active session.');
  }

  const semestersTable = supabase.from('semesters') as any;

  if (updates.isActive) {
    // Deactivate all other semesters for user
    await semestersTable
      .update({ is_active: false })
      .eq('user_id', user.id);
  }

  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.startDate !== undefined) payload.start_date = updates.startDate;
  if (updates.endDate !== undefined) payload.end_date = updates.endDate;
  if (updates.threshold !== undefined) payload.threshold = updates.threshold;
  if (updates.workingDays !== undefined) payload.working_days = updates.workingDays;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await semestersTable
    .update(payload)
    .eq('id', semesterId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update semester: ${error?.message || 'Unknown error'}`);
  }

  return data as SemesterRow;
}

/**
 * Sets a semester as active and deactivates all others for the user.
 */
export async function setActiveSemester(semesterId: string): Promise<SemesterRow> {
  return updateSemester(semesterId, { isActive: true });
}

/**
 * Deletes a semester.
 */
export async function deleteSemester(semesterId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required: No active session.');
  }

  const semestersTable = supabase.from('semesters') as any;
  const { error } = await semestersTable
    .delete()
    .eq('id', semesterId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to delete semester: ${error.message}`);
  }
}

// ============================================================================
// HOLIDAYS CRUD FUNCTIONS
// ============================================================================

/**
 * Lists all holidays for a specific semester.
 */
export async function listHolidays(semesterId: string): Promise<HolidayRow[]> {
  const holidaysTable = supabase.from('holidays') as any;
  const { data, error } = await holidaysTable
    .select('*')
    .eq('semester_id', semesterId)
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Failed to list holidays: ${error.message}`);
  }

  return (data || []) as HolidayRow[];
}

/**
 * Creates a new holiday record for a semester.
 */
export async function createHoliday(input: {
  semesterId: string;
  date: string;
  name?: string;
}): Promise<HolidayRow> {
  const holidaysTable = supabase.from('holidays') as any;
  const { data, error } = await holidaysTable
    .insert({
      semester_id: input.semesterId,
      date: input.date,
      name: input.name || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create holiday: ${error?.message || 'Unknown error'}`);
  }

  return data as HolidayRow;
}

/**
 * Updates an existing holiday record.
 */
export async function updateHoliday(
  holidayId: string,
  updates: { date?: string; name?: string }
): Promise<HolidayRow> {
  const holidaysTable = supabase.from('holidays') as any;
  const payload: Record<string, any> = {};
  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.name !== undefined) payload.name = updates.name;

  const { data, error } = await holidaysTable
    .update(payload)
    .eq('id', holidayId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update holiday: ${error?.message || 'Unknown error'}`);
  }

  return data as HolidayRow;
}

/**
 * Deletes a holiday record.
 */
export async function deleteHoliday(holidayId: string): Promise<void> {
  const holidaysTable = supabase.from('holidays') as any;
  const { error } = await holidaysTable
    .delete()
    .eq('id', holidayId);

  if (error) {
    throw new Error(`Failed to delete holiday: ${error.message}`);
  }
}
