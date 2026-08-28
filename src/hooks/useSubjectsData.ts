import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActiveSemester } from '@/lib/semesters.functions';
import {
  listSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  CreateSubjectInput,
  UpdateSubjectInput,
} from '@/lib/subjects.functions';
import {
  listComponents,
  createComponent,
  updateComponent,
  deleteComponent,
  CreateComponentInput,
  UpdateComponentInput,
} from '@/lib/components.functions';

/**
 * Hook to fetch active semester.
 */
export function useActiveSemester() {
  return useQuery({
    queryKey: ['semesters', 'active'],
    queryFn: getActiveSemester,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to list subjects for a semester.
 */
export function useSubjects(semesterId?: string) {
  return useQuery({
    queryKey: ['subjects', semesterId],
    queryFn: () => listSubjects(semesterId!),
    enabled: !!semesterId,
  });
}

/**
 * Hook to fetch a single subject by ID.
 */
export function useSubject(subjectId?: string) {
  return useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubject(subjectId!),
    enabled: !!subjectId,
  });
}

/**
 * Hook to create a new subject.
 */
export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSubjectInput) => createSubject(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subjects', data.semester_id] });
    },
  });
}

/**
 * Hook to update a subject.
 */
export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subjectId, input }: { subjectId: string; input: UpdateSubjectInput }) =>
      updateSubject(subjectId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subjects', data.semester_id] });
      queryClient.invalidateQueries({ queryKey: ['subject', data.id] });
    },
  });
}

/**
 * Hook to delete a subject.
 */
export function useDeleteSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subjectId }: { subjectId: string; semesterId: string }) =>
      deleteSubject(subjectId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subject', variables.subjectId] });
    },
  });
}

/**
 * Hook to list components for a subject.
 */
export function useComponents(subjectId?: string) {
  return useQuery({
    queryKey: ['components', subjectId],
    queryFn: () => listComponents(subjectId!),
    enabled: !!subjectId,
  });
}

/**
 * Hook to create a component.
 */
export function useCreateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateComponentInput) => createComponent(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['components', data.subject_id] });
      queryClient.invalidateQueries({ queryKey: ['subject', data.subject_id] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

/**
 * Hook to update a component.
 */
export function useUpdateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ componentId, input }: { componentId: string; subjectId: string; input: UpdateComponentInput }) =>
      updateComponent(componentId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['components', variables.subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subject', variables.subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

/**
 * Hook to delete a component.
 */
export function useDeleteComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ componentId }: { componentId: string; subjectId: string }) =>
      deleteComponent(componentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['components', variables.subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subject', variables.subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}
