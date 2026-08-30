import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTimetableSlots,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  CreateTimetableSlotInput,
  UpdateTimetableSlotInput,
} from '@/lib/timetable.functions';

/**
 * Hook to list timetable slots for a semester.
 */
export function useTimetable(semesterId?: string) {
  return useQuery({
    queryKey: ['timetable', semesterId],
    queryFn: () => listTimetableSlots(semesterId!),
    enabled: !!semesterId,
  });
}

/**
 * Hook to create a timetable slot.
 */
export function useCreateTimetableSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTimetableSlotInput) => createTimetableSlot(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', data.semester_id] });
    },
  });
}

/**
 * Hook to update a timetable slot.
 */
export function useUpdateTimetableSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slotId, input }: { slotId: string; input: UpdateTimetableSlotInput }) =>
      updateTimetableSlot(slotId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', data.semester_id] });
    },
  });
}

/**
 * Hook to delete a timetable slot.
 */
export function useDeleteTimetableSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slotId }: { slotId: string; semesterId: string }) =>
      deleteTimetableSlot(slotId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', variables.semesterId] });
    },
  });
}
