import { supabase } from '@/lib/supabase';

const LOCAL_STORAGE_NAME_KEY = 'skiplogic_student_name';

/**
 * Get the stored student name from localStorage
 */
export function getStoredStudentName(): string {
  try {
    return localStorage.getItem(LOCAL_STORAGE_NAME_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Save the student name to localStorage
 */
export function saveStoredStudentName(name: string): void {
  try {
    if (name.trim()) {
      localStorage.setItem(LOCAL_STORAGE_NAME_KEY, name.trim());
    }
  } catch {
    // ignore
  }
}

/**
 * Update the student name in both localStorage and Supabase user metadata
 */
export async function updateStudentName(name: string): Promise<string> {
  const trimmed = name.trim();
  saveStoredStudentName(trimmed);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.updateUser({
        data: {
          full_name: trimmed,
          name: trimmed,
        },
      });
    }
  } catch (err) {
    console.warn('Could not sync name to Supabase metadata:', err);
  }

  // Dispatch custom event for real-time reactivity across tabs/components
  window.dispatchEvent(new CustomEvent('skiplogic_name_changed', { detail: trimmed }));

  return trimmed;
}
