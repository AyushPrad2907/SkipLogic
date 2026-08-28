import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type ComponentRow = Database['public']['Tables']['components']['Row'];

export type SupportedComponentType = 'PP' | 'PR' | 'TUT' | 'LAB' | 'THEORY' | 'CUSTOM';

export interface CreateComponentInput {
  subjectId: string;
  type: SupportedComponentType;
  name?: string | null;
  attended?: number;
  delivered?: number;
}

export interface UpdateComponentInput {
  type?: SupportedComponentType;
  name?: string | null;
  attended?: number;
  delivered?: number;
}

async function requireAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Authentication required: Session does not exist.');
  }
  return user;
}

export function validateCounters(attended: number, delivered: number): void {
  if (attended < 0 || delivered < 0) {
    throw new Error('Attendance counters cannot be negative.');
  }
  if (attended > delivered) {
    throw new Error(`Attended classes (${attended}) cannot exceed total delivered classes (${delivered}).`);
  }
}

/**
 * Lists components for a given subject.
 */
export async function listComponents(subjectId: string): Promise<ComponentRow[]> {
  await requireAuth();

  const compTable = supabase.from('components') as any;
  const { data, error } = await compTable
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load components: ${error.message}`);
  }

  return (data as ComponentRow[]) || [];
}

/**
 * Gets a single component by ID.
 */
export async function getComponent(componentId: string): Promise<ComponentRow | null> {
  await requireAuth();

  const compTable = supabase.from('components') as any;
  const { data, error } = await compTable
    .select('*')
    .eq('id', componentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load component: ${error.message}`);
  }

  return data as ComponentRow | null;
}

/**
 * Creates a component for a subject.
 */
export async function createComponent(input: CreateComponentInput): Promise<ComponentRow> {
  await requireAuth();

  const attended = input.attended ?? 0;
  const delivered = input.delivered ?? 0;
  validateCounters(attended, delivered);

  const allowedTypes: SupportedComponentType[] = ['PP', 'PR', 'TUT', 'LAB', 'THEORY', 'CUSTOM'];
  if (!allowedTypes.includes(input.type)) {
    throw new Error(`Invalid component type "${input.type}". Must be one of: ${allowedTypes.join(', ')}`);
  }

  if (input.type === 'CUSTOM' && (!input.name || !input.name.trim())) {
    throw new Error('Custom component requires a display name.');
  }

  const compTable = supabase.from('components') as any;

  // Check unique component type in subject (for non-CUSTOM types)
  if (input.type !== 'CUSTOM') {
    const { data: existing } = await compTable
      .select('id')
      .eq('subject_id', input.subjectId)
      .eq('type', input.type)
      .maybeSingle();

    if (existing) {
      throw new Error(`Component type "${input.type}" already exists for this subject.`);
    }
  }

  const displayName = input.name ? input.name.trim() : (input.type === 'CUSTOM' ? 'Custom' : input.type);

  const { data, error } = await compTable
    .insert({
      subject_id: input.subjectId,
      type: input.type,
      name: displayName,
      attended,
      delivered,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create component: ${error.message}`);
  }

  return data as ComponentRow;
}

/**
 * Updates a component.
 */
export async function updateComponent(componentId: string, input: UpdateComponentInput): Promise<ComponentRow> {
  await requireAuth();

  const compTable = supabase.from('components') as any;

  if (input.attended !== undefined || input.delivered !== undefined) {
    const current = await getComponent(componentId);
    if (!current) throw new Error('Component not found.');

    const nextAttended = input.attended ?? current.attended;
    const nextDelivered = input.delivered ?? current.delivered;
    validateCounters(nextAttended, nextDelivered);
  }

  const updates: Partial<ComponentRow> = {};
  if (input.type !== undefined) updates.type = input.type;
  if (input.name !== undefined) updates.name = input.name ? input.name.trim() : null;
  if (input.attended !== undefined) updates.attended = input.attended;
  if (input.delivered !== undefined) updates.delivered = input.delivered;

  const { data, error } = await compTable
    .update(updates)
    .eq('id', componentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update component: ${error.message}`);
  }

  return data as ComponentRow;
}

/**
 * Deletes a component after checking for attendance logs.
 */
export async function deleteComponent(componentId: string): Promise<void> {
  await requireAuth();

  const compTable = supabase.from('components') as any;
  const { error } = await compTable
    .delete()
    .eq('id', componentId);

  if (error) {
    throw new Error(`Failed to delete component: ${error.message}`);
  }
}

/**
 * Checks if attendance logs exist for a component.
 */
export async function checkComponentHasLogs(componentId: string): Promise<boolean> {
  await requireAuth();

  const logTable = supabase.from('attendance_log') as any;
  const { count, error } = await logTable
    .select('id', { count: 'exact', head: true })
    .eq('component_id', componentId);

  if (error) return false;
  return (count || 0) > 0;
}
