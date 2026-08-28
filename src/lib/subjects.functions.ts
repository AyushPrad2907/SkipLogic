import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type SubjectRow = Database['public']['Tables']['subjects']['Row'];
export type ComponentRow = Database['public']['Tables']['components']['Row'];

export interface SubjectWithComponents extends SubjectRow {
  components: ComponentRow[];
}

export interface CreateSubjectInput {
  semesterId: string;
  name: string;
  code?: string | null;
  color?: string | null;
}

export interface UpdateSubjectInput {
  name?: string;
  code?: string | null;
  color?: string | null;
}

async function requireAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Authentication required: Session does not exist.');
  }
  return user;
}

/**
 * Lists all subjects in a semester, including their components.
 */
export async function listSubjects(semesterId: string): Promise<SubjectWithComponents[]> {
  await requireAuth();

  const subjectsTable = supabase.from('subjects') as any;
  const { data, error } = await subjectsTable
    .select('*, components(*)')
    .eq('semester_id', semesterId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load subjects: ${error.message}`);
  }

  return (data as SubjectWithComponents[]) || [];
}

/**
 * Gets a single subject by ID, including its components.
 */
export async function getSubject(subjectId: string): Promise<SubjectWithComponents | null> {
  await requireAuth();

  const subjectsTable = supabase.from('subjects') as any;
  const { data, error } = await subjectsTable
    .select('*, components(*)')
    .eq('id', subjectId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load subject: ${error.message}`);
  }

  return data ? (data as SubjectWithComponents) : null;
}

/**
 * Creates a new subject within a semester.
 */
export async function createSubject(input: CreateSubjectInput): Promise<SubjectWithComponents> {
  await requireAuth();

  const nameTrimmed = input.name.trim();
  if (!nameTrimmed) {
    throw new Error('Subject name cannot be empty.');
  }

  const codeTrimmed = input.code?.trim() || null;
  const subjectsTable = supabase.from('subjects') as any;

  // Check duplicate subject name in same semester
  const { data: existingName } = await subjectsTable
    .select('id')
    .eq('semester_id', input.semesterId)
    .ilike('name', nameTrimmed)
    .maybeSingle();

  if (existingName) {
    throw new Error(`A subject named "${nameTrimmed}" already exists in this semester.`);
  }

  // Check duplicate subject code if code provided
  if (codeTrimmed) {
    const { data: existingCode } = await subjectsTable
      .select('id')
      .eq('semester_id', input.semesterId)
      .ilike('code', codeTrimmed)
      .maybeSingle();

    if (existingCode) {
      throw new Error(`A subject with course code "${codeTrimmed}" already exists in this semester.`);
    }
  }

  const { data, error } = await subjectsTable
    .insert({
      semester_id: input.semesterId,
      name: nameTrimmed,
      code: codeTrimmed,
      color: input.color || '#818cf8',
    })
    .select('*, components(*)')
    .single();

  if (error) {
    throw new Error(`Failed to create subject: ${error.message}`);
  }

  const res = data as any;
  return { ...res, components: res.components || [] } as SubjectWithComponents;
}

/**
 * Updates an existing subject.
 */
export async function updateSubject(subjectId: string, input: UpdateSubjectInput): Promise<SubjectWithComponents> {
  await requireAuth();

  const updates: Partial<SubjectRow> = {};
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) throw new Error('Subject name cannot be empty.');
    updates.name = trimmed;
  }

  if (input.code !== undefined) {
    updates.code = input.code ? input.code.trim() : null;
  }

  if (input.color !== undefined) {
    updates.color = input.color;
  }

  const subjectsTable = supabase.from('subjects') as any;
  const { data, error } = await subjectsTable
    .update(updates)
    .eq('id', subjectId)
    .select('*, components(*)')
    .single();

  if (error) {
    throw new Error(`Failed to update subject: ${error.message}`);
  }

  return data as SubjectWithComponents;
}

/**
 * Deletes a subject.
 */
export async function deleteSubject(subjectId: string): Promise<void> {
  await requireAuth();

  const subjectsTable = supabase.from('subjects') as any;
  const { error } = await subjectsTable
    .delete()
    .eq('id', subjectId);

  if (error) {
    throw new Error(`Failed to delete subject: ${error.message}`);
  }
}
