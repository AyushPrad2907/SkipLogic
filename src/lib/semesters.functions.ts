import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type SemesterRow = Database['public']['Tables']['semesters']['Row'];

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
