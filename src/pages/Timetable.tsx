import React, { useState } from 'react';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TacticalLoader } from '@/components/ui/Loading';
import { TimetableImporter } from '@/components/timetable/TimetableImporter';
import { Calendar, Plus, Trash2, Clock, MapPin, User, Edit2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { DayOfWeek, TimetableSlot } from '@/types';
import { isOverlapping, parseTimeToMinutes, formatTimeHHMM } from '@/lib/timetable.functions';

export const Timetable: React.FC = () => {
  const {
    timetable,
    subjects,
    addTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
    isLoading
  } = useAttendance();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<TimetableSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [selectedSubId, setSelectedSubId] = useState('');
  const [selectedCompId, setSelectedCompId] = useState('');
  const [slotDay, setSlotDay] = useState<DayOfWeek>('MONDAY');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('10:00');
  const [slotRoom, setSlotRoom] = useState('');
  const [slotInstructor, setSlotInstructor] = useState('');

  const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  // Helper: components for selected subject
  const currentSubject = subjects.find((s) => s.id === selectedSubId);
  const availableComponents = currentSubject?.components || [];

  const handleOpenAddModal = () => {
    if (subjects.length === 0) {
      showToast({
        title: 'No Subjects Found',
        message: 'Please add subjects in the Subjects tab first before configuring slots.',
        type: 'warning',
      });
      return;
    }
    const initialSub = subjects[0];
    setSelectedSubId(initialSub.id);
    setSelectedCompId(initialSub.components?.[0]?.id || '');
    setSlotDay('MONDAY');
    setSlotStartTime('09:00');
    setSlotEndTime('10:00');
    setSlotRoom('');
    setSlotInstructor('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setSelectedSubId(slot.subjectId);
    setSelectedCompId(slot.componentId || '');
    setSlotDay(slot.day);
    setSlotStartTime(slot.startTime);
    setSlotEndTime(slot.endTime);
    setSlotRoom(slot.room || '');
    setSlotInstructor(slot.instructor || '');
  };

  const handleSubjectChange = (newSubId: string) => {
    setSelectedSubId(newSubId);
    const sub = subjects.find((s) => s.id === newSubId);
    setSelectedCompId(sub?.components?.[0]?.id || '');
  };

  // Submit Add Slot
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) {
      showToast({ title: 'Validation Error', message: 'Subject selection is required.', type: 'danger' });
      return;
    }

    if (!selectedCompId) {
      showToast({ title: 'Validation Error', message: 'Component selection is required.', type: 'danger' });
      return;
    }

    const startMin = parseTimeToMinutes(slotStartTime);
    const endMin = parseTimeToMinutes(slotEndTime);
    if (startMin >= endMin) {
      showToast({ title: 'Validation Error', message: 'Start time must be strictly earlier than end time.', type: 'danger' });
      return;
    }

    // Client-side overlap validation
    const daySlots = timetable.filter((s) => s.day === slotDay);
    for (const existing of daySlots) {
      if (isOverlapping(slotStartTime, slotEndTime, existing.startTime, existing.endTime)) {
        showToast({
          title: 'Timetable Overlap Detected',
          message: `Slot (${slotStartTime}–${slotEndTime}) overlaps with existing ${existing.subjectName} class (${existing.startTime}–${existing.endTime}) on ${slotDay}.`,
          type: 'danger',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await addTimetableSlot({
        subjectId: selectedSubId,
        componentId: selectedCompId,
        day: slotDay,
        startTime: slotStartTime,
        endTime: slotEndTime,
        room: slotRoom.trim() || undefined,
        instructor: slotInstructor.trim() || undefined,
      });

      setIsAddModalOpen(false);
      showToast({
        title: 'Timetable Slot Added',
        message: 'Successfully added class to timetable.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Failed to Add Slot',
        message: err.message || 'An error occurred.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Slot
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    if (!selectedSubId || !selectedCompId) {
      showToast({ title: 'Validation Error', message: 'Subject and Component selection are required.', type: 'danger' });
      return;
    }

    const startMin = parseTimeToMinutes(slotStartTime);
    const endMin = parseTimeToMinutes(slotEndTime);
    if (startMin >= endMin) {
      showToast({ title: 'Validation Error', message: 'Start time must be strictly earlier than end time.', type: 'danger' });
      return;
    }

    // Client-side overlap check excluding current slot
    const daySlots = timetable.filter((s) => s.day === slotDay && s.id !== editingSlot.id);
    for (const existing of daySlots) {
      if (isOverlapping(slotStartTime, slotEndTime, existing.startTime, existing.endTime)) {
        showToast({
          title: 'Timetable Overlap Detected',
          message: `Slot (${slotStartTime}–${slotEndTime}) overlaps with existing ${existing.subjectName} class (${existing.startTime}–${existing.endTime}) on ${slotDay}.`,
          type: 'danger',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await updateTimetableSlot(editingSlot.id, {
        subjectId: selectedSubId,
        componentId: selectedCompId,
        day: slotDay,
        startTime: slotStartTime,
        endTime: slotEndTime,
        room: slotRoom.trim() || undefined,
        instructor: slotInstructor.trim() || undefined,
      });

      setEditingSlot(null);
      showToast({
        title: 'Timetable Slot Updated',
        message: 'Successfully updated slot configuration.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Failed to Update Slot',
        message: err.message || 'An error occurred.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Slot
  const handleConfirmDeleteSlot = async () => {
    if (!deletingSlot) return;
    setIsSubmitting(true);
    try {
      await deleteTimetableSlot(deletingSlot.id);
      setDeletingSlot(null);
      showToast({
        title: 'Slot Removed',
        message: 'Timetable slot removed. Attendance history was NOT affected.',
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Failed to Delete Slot',
        message: err.message || 'An error occurred.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group and sort slots by day
  const getSlotsByDay = (day: DayOfWeek) => {
    return timetable
      .filter((slot) => slot.day === day)
      .sort((a, b) => {
        const timeCompare = parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
        if (timeCompare !== 0) return timeCompare;
        return (a.slotOrder || 0) - (b.slotOrder || 0);
      });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Timetable"
        description="Schedule your classes to drive today's decisions and future predictions."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-brand" /> Import XLSX
            </Button>
            <Button size="sm" onClick={handleOpenAddModal} className="flex items-center gap-1 cursor-pointer">
              <Plus className="h-4 w-4" /> Add Slot
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-center py-8">
            <TacticalLoader message="Rendering Weekly Timetable Matrix..." size="md" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      ) : timetable.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="No timetable yet"
            description="Your weekly schedule drives today's decisions and recommendations. Upload your college Excel timetable or configure your course times."
            icon={<Calendar className="h-6 w-6 text-brand" />}
            action={
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" /> Import Excel Timetable (.xlsx)
                </Button>
                <Button variant="secondary" onClick={handleOpenAddModal} className="flex items-center gap-1 cursor-pointer">
                  <Plus className="h-4 w-4" /> Add Slot Manually
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {days.map((day) => {
              const daySlots = getSlotsByDay(day);
              return (
                <Card key={day} className="flex flex-col border-border/80 p-4">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
                    <span className="font-mono text-sm font-bold uppercase tracking-wider text-text-primary">
                      {day}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono font-semibold uppercase bg-surface-elevated px-2 py-0.5 rounded border">
                      {daySlots.length} {daySlots.length === 1 ? 'Class' : 'Classes'}
                    </span>
                  </div>

                  {daySlots.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-text-muted text-xs">
                      No classes scheduled
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1">
                      {daySlots.map((slot) => {
                        const sub = subjects.find((s) => s.id === slot.subjectId);
                        return (
                          <div
                            key={slot.id}
                            className="p-3 bg-surface-elevated/45 hover:bg-surface-elevated/80 border border-border/80 rounded-lg flex flex-col justify-between transition-colors relative group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full border border-black/10 shrink-0"
                                    style={{ backgroundColor: sub?.color || '#94a3b8' }}
                                  />
                                  <span className="font-bold text-xs text-text-primary line-clamp-1">
                                    {slot.subjectName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-secondary font-mono">
                                  <span className="flex items-center gap-1 text-text-muted">
                                    <Clock className="h-3.5 w-3.5 text-brand" /> {formatTimeHHMM(slot.startTime)} - {formatTimeHHMM(slot.endTime)}
                                  </span>
                                  <span className="uppercase bg-surface px-1.5 py-0.5 rounded border border-border/55">
                                    {slot.componentName || slot.componentType}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditModal(slot)}
                                  className="h-7 w-7 p-0 rounded text-text-secondary hover:text-text-primary cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingSlot(slot)}
                                  className="h-7 w-7 p-0 rounded text-text-secondary hover:text-danger cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {(slot.room || slot.instructor) && (
                              <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center gap-3 text-[10px] text-text-muted">
                                {slot.room && (
                                  <span className="flex items-center gap-1.5 truncate">
                                    <MapPin className="h-3 w-3 text-text-muted shrink-0" />
                                    {slot.room}
                                  </span>
                                )}
                                {slot.instructor && (
                                  <span className="flex items-center gap-1.5 truncate">
                                    <User className="h-3 w-3 text-text-muted shrink-0" />
                                    {slot.instructor}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD SLOT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title="Add Timetable Slot"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Slot'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Subject</label>
              <select
                value={selectedSubId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={isSubmitting}
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} {sub.code ? `(${sub.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Component</label>
              <select
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={isSubmitting || availableComponents.length === 0}
              >
                {availableComponents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.type} ({c.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Day</label>
              <select
                value={slotDay}
                onChange={(e) => setSlotDay(e.target.value as DayOfWeek)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={isSubmitting}
              >
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Start Time</label>
              <input
                type="time"
                value={slotStartTime}
                onChange={(e) => setSlotStartTime(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">End Time</label>
              <input
                type="time"
                value={slotEndTime}
                onChange={(e) => setSlotEndTime(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Room / Location</label>
              <input
                type="text"
                value={slotRoom}
                onChange={(e) => setSlotRoom(e.target.value)}
                placeholder="e.g. LHC-101"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Instructor</label>
              <input
                type="text"
                value={slotInstructor}
                onChange={(e) => setSlotInstructor(e.target.value)}
                placeholder="e.g. Prof. A. Prasad"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* EDIT SLOT MODAL */}
      <Modal
        isOpen={!!editingSlot}
        onClose={() => !isSubmitting && setEditingSlot(null)}
        title="Edit Timetable Slot"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditingSlot(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Subject</label>
              <select
                value={selectedSubId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={isSubmitting}
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} {sub.code ? `(${sub.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Component</label>
              <select
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={isSubmitting || availableComponents.length === 0}
              >
                {availableComponents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.type} ({c.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Day</label>
              <select
                value={slotDay}
                onChange={(e) => setSlotDay(e.target.value as DayOfWeek)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={isSubmitting}
              >
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Start Time</label>
              <input
                type="time"
                value={slotStartTime}
                onChange={(e) => setSlotStartTime(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">End Time</label>
              <input
                type="time"
                value={slotEndTime}
                onChange={(e) => setSlotEndTime(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Room / Location</label>
              <input
                type="text"
                value={slotRoom}
                onChange={(e) => setSlotRoom(e.target.value)}
                placeholder="e.g. LHC-101"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Instructor</label>
              <input
                type="text"
                value={slotInstructor}
                onChange={(e) => setSlotInstructor(e.target.value)}
                placeholder="e.g. Prof. A. Prasad"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE SLOT CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingSlot}
        onClose={() => !isSubmitting && setDeletingSlot(null)}
        title="Delete Timetable Slot"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDeletingSlot(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteSlot} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Slot'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-primary">
            Are you sure you want to delete the timetable slot for <strong>{deletingSlot?.subjectName}</strong> ({deletingSlot?.startTime}–{deletingSlot?.endTime} on {deletingSlot?.day})?
          </p>
          <div className="bg-surface-elevated/40 border border-border/50 p-3 rounded-lg flex items-start gap-2 text-xs text-text-secondary">
            <AlertTriangle className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            <span>
              Deleting this timetable slot will remove it from your weekly schedule. Existing attendance history and logs will <strong>NOT</strong> be deleted.
            </span>
          </div>
        </div>
      </Modal>

      {/* IMPORT TIMETABLE XLSX MODAL */}
      <TimetableImporter
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
