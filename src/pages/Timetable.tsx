import React, { useState } from 'react';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Calendar, Plus, Trash2, Clock, MapPin, User } from 'lucide-react';
import { DayOfWeek, SubjectComponentType } from '@/types';

export const Timetable: React.FC = () => {
  const { timetable, subjects, addTimetableSlot, deleteTimetableSlot, loadMockData } = useAttendance();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [slotDay, setSlotDay] = useState<DayOfWeek>('MONDAY');
  const [slotComponent, setSlotComponent] = useState<SubjectComponentType>('LECTURE');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('10:00');
  const [slotRoom, setSlotRoom] = useState('');
  const [slotInstructor, setSlotInstructor] = useState('');

  const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  const handleOpenModal = () => {
    if (subjects.length === 0) {
      showToast({
        title: 'No Subjects Found',
        message: 'Please add subjects in the Subjects tab first before configuring slots.',
        type: 'warning',
      });
      return;
    }
    setSelectedSubId(subjects[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleAddSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) {
      showToast({ title: 'Validation Error', message: 'Subject is required.', type: 'danger' });
      return;
    }

    const sub = subjects.find(s => s.id === selectedSubId);
    if (!sub) return;

    addTimetableSlot({
      subjectId: selectedSubId,
      subjectName: sub.name,
      subjectCode: sub.code,
      componentType: slotComponent,
      day: slotDay,
      startTime: slotStartTime,
      endTime: slotEndTime,
      room: slotRoom.trim() || undefined,
      instructor: slotInstructor.trim() || undefined,
    });

    setIsModalOpen(false);
    setSlotRoom('');
    setSlotInstructor('');
    showToast({
      title: 'Timetable Slot Configured',
      message: `Added ${sub.name} class to calendar.`,
      type: 'success',
    });
  };

  // Group slots by day
  const getSlotsByDay = (day: DayOfWeek) => {
    return timetable
      .filter((slot) => slot.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Timetable"
        description="Schedule your classes to drive the SkipLogic recommendation engine."
        actions={
          <Button size="sm" onClick={handleOpenModal} className="flex items-center gap-1 cursor-pointer">
            <Plus className="h-4 w-4" /> Add Slot
          </Button>
        }
      />

      {timetable.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="Calendar is empty"
            description="Your weekly schedule drives today's decisions and recommendations. Configure your course times."
            icon={<Calendar className="h-6 w-6 text-brand" />}
            action={
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                <Button onClick={handleOpenModal} className="w-full sm:w-auto flex items-center gap-1 cursor-pointer">
                  <Plus className="h-4 w-4" /> Configure Slots
                </Button>
                <Button onClick={loadMockData} variant="secondary" className="w-full sm:w-auto flex items-center gap-1 cursor-pointer">
                  Load Mock Schedule
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Day Columns List */}
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
                        const sub = subjects.find(s => s.id === slot.subjectId);
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
                                    <Clock className="h-3.5 w-3.5 text-brand" /> {slot.startTime} - {slot.endTime}
                                  </span>
                                  <span className="uppercase bg-surface px-1.5 py-0.5 rounded border border-border/55">
                                    {slot.componentType}
                                  </span>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                onClick={() => {
                                  deleteTimetableSlot(slot.id);
                                  showToast({ title: 'Slot Removed', message: 'Timetable updated.', type: 'info' });
                                }}
                                className="h-7 w-7 p-0 rounded text-text-secondary hover:text-danger cursor-pointer md:opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {/* Additional metadata (Room, Instructor) */}
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

      {/* Add Slot Modal dialog form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Timetable Slot"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleAddSlotSubmit} className="cursor-pointer">
              Save Slot
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSlotSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Subject</label>
            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.code ? `(${sub.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Weekday</label>
              <select
                value={slotDay}
                onChange={(e) => setSlotDay(e.target.value as DayOfWeek)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {days.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Component Type</label>
              <select
                value={slotComponent}
                onChange={(e) => setSlotComponent(e.target.value as SubjectComponentType)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="LECTURE">LECTURE</option>
                <option value="LAB">LAB</option>
                <option value="TUTORIAL">TUTORIAL</option>
                <option value="SEMINAR">SEMINAR</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Start Time</label>
              <input
                type="time"
                value={slotStartTime}
                onChange={(e) => setSlotStartTime(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">End Time</label>
              <input
                type="time"
                value={slotEndTime}
                onChange={(e) => setSlotEndTime(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
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
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
