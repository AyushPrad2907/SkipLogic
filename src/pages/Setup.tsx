import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Calendar,
  Settings,
  BookOpen,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  GraduationCap
} from 'lucide-react';
import { DayOfWeek, SubjectComponentType } from '@/types';
import { cn } from '@/lib/utils';

export const Setup: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings, updateSettings, subjects, addSubject, deleteSubject, addTimetableSlot, timetable, deleteTimetableSlot } = useAttendance();

  const [step, setStep] = useState(1);

  // Form states matching provider structures
  const [semesterName, setSemesterName] = useState(settings.name || 'Fall Semester 2026');
  const [targetThreshold, setTargetThreshold] = useState(settings.targetThreshold || 75);
  const [startDate, setStartDate] = useState(settings.startDate || '');
  const [endDate, setEndDate] = useState(settings.endDate || '');
  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>(settings.workingDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);

  // Local Subject Inputs
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubColor, setNewSubColor] = useState('#6366f1');

  // Local Slot Inputs
  const [selectedSubId, setSelectedSubId] = useState('');
  const [slotDay, setSlotDay] = useState<DayOfWeek>('MONDAY');
  const [slotComponent, setSlotComponent] = useState<SubjectComponentType>('LECTURE');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('10:00');
  const [slotRoom, setSlotRoom] = useState('');
  const [slotInstructor, setSlotInstructor] = useState('');

  const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  const handleNext = () => {
    // Basic validation
    if (step === 2 && (!startDate || !endDate)) {
      showToast({ title: 'Validation Error', message: 'Please select both start and end dates.', type: 'danger' });
      return;
    }
    if (step === 2 && new Date(startDate) >= new Date(endDate)) {
      showToast({ title: 'Validation Error', message: 'End date must be after the start date.', type: 'danger' });
      return;
    }
    if (step === 3 && workingDays.length === 0) {
      showToast({ title: 'Validation Error', message: 'Please select at least one working day.', type: 'danger' });
      return;
    }

    // Persist settings locally at each step transition
    updateSettings({
      ...settings,
      name: semesterName,
      targetThreshold: Number(targetThreshold),
      startDate,
      endDate,
      workingDays,
    });

    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleAddSubject = () => {
    if (!newSubName.trim()) {
      showToast({ title: 'Subject Validation', message: 'Subject name is required.', type: 'danger' });
      return;
    }
    addSubject({
      name: newSubName.trim(),
      code: newSubCode.trim() || undefined,
      color: newSubColor,
      targetThreshold: Number(targetThreshold),
    });
    setNewSubName('');
    setNewSubCode('');
    showToast({ title: 'Subject Added', message: 'Ready to map timetable slots.', type: 'success' });
  };

  const handleAddSlot = () => {
    if (!selectedSubId) {
      showToast({ title: 'Slot Validation', message: 'Please select a subject first.', type: 'danger' });
      return;
    }
    const sub = subjects.find(s => s.id === selectedSubId);
    if (!sub) return;

    const firstCompId = sub.components?.[0]?.id || '';
    addTimetableSlot({
      subjectId: selectedSubId,
      componentId: firstCompId,
      day: slotDay,
      startTime: slotStartTime,
      endTime: slotEndTime,
      room: slotRoom.trim() || undefined,
      instructor: slotInstructor.trim() || undefined,
    });

    setSlotRoom('');
    setSlotInstructor('');
    showToast({ title: 'Timetable Slot Added', message: 'Mapped slot successfully.', type: 'success' });
  };

  const handleToggleDay = (day: DayOfWeek) => {
    if (workingDays.includes(day)) {
      setWorkingDays(prev => prev.filter(d => d !== day));
    } else {
      setWorkingDays(prev => [...prev, day]);
    }
  };

  const handleFinish = () => {
    showToast({
      title: 'Configuration Finished',
      message: 'Semester parameters configured. Attendance engine ready.',
      type: 'success',
    });
    navigate('/app');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Semester Setup Wizard"
        description="Configure your academic term and timetable structure in 5 easy steps."
      />

      {/* Progress Steps Header */}
      <div className="flex items-center justify-between bg-surface border border-border p-4 rounded-xl">
        {[1, 2, 3, 4, 5].map((num) => (
          <div key={num} className="flex items-center gap-1.5 flex-1 justify-center last:flex-initial">
            <span
              className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center font-mono text-xs font-bold border transition-colors',
                step === num && 'bg-brand border-brand text-white',
                step > num && 'bg-safe-muted border-safe/40 text-safe',
                step < num && 'bg-surface-elevated border-border text-text-muted'
              )}
            >
              {num}
            </span>
            <span className={cn('hidden md:inline text-xs font-medium', step === num ? 'text-text-primary' : 'text-text-muted')}>
              {num === 1 && 'Semester'}
              {num === 2 && 'Dates'}
              {num === 3 && 'Working Days'}
              {num === 4 && 'Subjects'}
              {num === 5 && 'Timetable'}
            </span>
            {num < 5 && <div className="hidden md:block h-[1px] bg-border flex-1 mx-2" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Semester Info */}
      {step === 1 && (
        <Card className="space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3 mb-2">
            <GraduationCap className="h-5 w-5 text-brand" /> Step 1: Semester Information
          </h3>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Semester Name
            </label>
            <input
              type="text"
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              placeholder="e.g. Fall Semester 2026"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Target Attendance Threshold (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                max="100"
                value={targetThreshold}
                onChange={(e) => setTargetThreshold(Number(e.target.value))}
                className="w-32 h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              />
              <span className="text-xs text-text-muted leading-relaxed">
                Usually universities require <span className="font-mono text-brand font-semibold">75%</span> attendance. Set what applies to you.
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2: Date settings */}
      {step === 2 && (
        <Card className="space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3 mb-2">
            <Calendar className="h-5 w-5 text-brand" /> Step 2: Semester Dates
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Semester Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Semester End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand font-mono"
              />
            </div>
          </div>
        </Card>
      )}

      {/* STEP 3: Working Days */}
      {step === 3 && (
        <Card className="space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3 mb-2">
            <Settings className="h-5 w-5 text-brand" /> Step 3: Weekly Working Days
          </h3>
          <p className="text-xs text-text-secondary">
            Select the days classes are active. SkipLogic uses these to estimate semester-end trends.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            {days.map((day) => {
              const isSelected = workingDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleToggleDay(day)}
                  className={cn(
                    'h-12 border rounded-lg text-xs font-bold font-mono tracking-wider transition-all flex items-center justify-center cursor-pointer',
                    isSelected
                      ? 'bg-brand/10 border-brand text-brand shadow-sm font-semibold'
                      : 'border-border bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* STEP 4: Subjects */}
      {step === 4 && (
        <Card className="space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3 mb-2">
            <BookOpen className="h-5 w-5 text-brand" /> Step 4: Add Subjects
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Subject Name
              </label>
              <input
                type="text"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="e.g. Database Management Systems"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Subject Code
              </label>
              <input
                type="text"
                value={newSubCode}
                onChange={(e) => setNewSubCode(e.target.value)}
                placeholder="e.g. CS-302"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Theme Color</label>
              <input
                type="color"
                value={newSubColor}
                onChange={(e) => setNewSubColor(e.target.value)}
                className="w-full h-10 px-1 rounded-md border border-border bg-background cursor-pointer"
              />
            </div>
            <Button type="button" onClick={handleAddSubject} className="h-10 mt-5 flex items-center gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" /> Add Subject
            </Button>
          </div>

          {/* Subjects Table List */}
          {subjects.length > 0 && (
            <div className="border border-border rounded-lg mt-4 overflow-hidden divide-y divide-border/60">
              {subjects.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 text-sm hover:bg-surface-elevated/40">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: sub.color || '#94a3b8' }} />
                    <div>
                      <span className="font-semibold">{sub.name}</span>
                      {sub.code && <span className="text-text-muted font-mono text-xs ml-2">({sub.code})</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      deleteSubject(sub.id);
                      showToast({ title: 'Subject Deleted', message: `${sub.name} was removed.`, type: 'info' });
                    }}
                    className="h-8 w-8 p-0 text-text-muted hover:text-danger hover:bg-danger-muted/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* STEP 5: Timetable Configuration */}
      {step === 5 && (
        <Card className="space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3 mb-2">
            <Clock className="h-5 w-5 text-brand" /> Step 5: Timetable Mapping
          </h3>

          {subjects.length === 0 ? (
            <div className="text-center p-6 bg-surface-elevated/50 border border-border rounded-lg text-text-secondary text-sm">
              Please go back and add at least one subject in Step 4 before mapping class slots.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Subject</label>
                  <select
                    value={selectedSubId}
                    onChange={(e) => setSelectedSubId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code || 'No Code'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Weekday</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value as DayOfWeek)}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {days.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Type</label>
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

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Room / Location</label>
                  <input
                    type="text"
                    value={slotRoom}
                    onChange={(e) => setSlotRoom(e.target.value)}
                    placeholder="e.g. LHC-102"
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handleAddSlot} className="flex items-center gap-1.5 cursor-pointer">
                  <Plus className="h-4 w-4" /> Add Slot to Calendar
                </Button>
              </div>

              {/* Added slots list */}
              {timetable.length > 0 && (
                <div className="border border-border rounded-lg mt-4 overflow-hidden divide-y divide-border/60">
                  <div className="bg-surface-elevated/40 p-2.5 text-xs font-bold text-text-secondary grid grid-cols-5 gap-2 font-mono">
                    <span>Subject</span>
                    <span>Day</span>
                    <span>Time</span>
                    <span>Room</span>
                    <span className="text-right">Action</span>
                  </div>
                  <div className="divide-y divide-border/40 max-h-56 overflow-y-auto">
                    {timetable.map((slot) => (
                      <div key={slot.id} className="p-2.5 text-xs grid grid-cols-5 gap-2 items-center hover:bg-surface-elevated/30">
                        <span className="font-semibold text-text-primary truncate">{slot.subjectName}</span>
                        <span className="font-mono text-text-muted">{slot.day.slice(0,3)}</span>
                        <span className="font-mono">{slot.startTime}-{slot.endTime}</span>
                        <span className="text-text-secondary truncate">{slot.room || '-'}</span>
                        <div className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              deleteTimetableSlot(slot.id);
                              showToast({ title: 'Slot Deleted', message: 'Timetable entry removed.', type: 'info' });
                            }}
                            className="h-7 w-7 p-0 text-text-muted hover:text-danger cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        {step > 1 ? (
          <Button variant="secondary" onClick={handleBack} className="flex items-center gap-1.5 cursor-pointer">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        ) : (
          <div />
        )}

        {step < 5 ? (
          <Button onClick={handleNext} className="flex items-center gap-1.5 cursor-pointer">
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleFinish} variant="primary" className="flex items-center gap-1.5 cursor-pointer">
            Finish & Launch <CheckCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
