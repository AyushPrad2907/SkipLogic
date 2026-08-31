import React, { useState, useEffect } from 'react';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { CalendarSummaryCard } from '@/components/semester/CalendarSummaryCard';
import { HolidayManager } from '@/components/semester/HolidayManager';
import { SemesterCalendarStatus } from '@/components/semester/SemesterCalendarStatus';
import { SemesterSelectorCard } from '@/components/semester/SemesterSelectorCard';
import {
  validateSemesterConfig,
  calculateSemesterCalendarSummary,
} from '@/lib/semesterCalendar';
import { DayOfWeek } from '@/types';
import { cn } from '@/lib/utils';
import { GraduationCap, Calendar, AlertTriangle } from 'lucide-react';

export const Semester: React.FC = () => {
  const {
    settings,
    semesters,
    holidays: rawHolidays,
    activeSemesterId,
    switchSemester,
    createSemester,
    updateSemesterSettings,
    deleteSemester,
    addHoliday,
    editHoliday,
    removeHoliday,
    resetAllData,
  } = useAttendance();
  const { showToast } = useToast();

  const [name, setName] = useState(settings.name || '');
  const [startDate, setStartDate] = useState(settings.startDate || '');
  const [endDate, setEndDate] = useState(settings.endDate || '');
  const [threshold, setThreshold] = useState(settings.targetThreshold || 75);
  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>(settings.workingDays || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form state when active semester settings change
  useEffect(() => {
    setName(settings.name || '');
    setStartDate(settings.startDate || '');
    setEndDate(settings.endDate || '');
    setThreshold(settings.targetThreshold || 75);
    setWorkingDays(settings.workingDays || []);
  }, [settings]);

  const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  const handleToggleDay = (day: DayOfWeek) => {
    if (workingDays.includes(day)) {
      setWorkingDays((prev) => prev.filter((d) => d !== day));
    } else {
      setWorkingDays((prev) => [...prev, day]);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    const configInput = {
      name: name.trim(),
      startDate,
      endDate,
      targetThreshold: threshold,
      workingDays,
    };

    const validation = validateSemesterConfig(configInput);
    if (!validation.isValid) {
      showToast({
        title: 'Validation Error',
        message: validation.errors.join(' '),
        type: 'danger',
      });
      return;
    }

    if (!activeSemesterId) {
      showToast({ title: 'Error', message: 'No active semester selected.', type: 'danger' });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSemesterSettings(activeSemesterId, {
        name: name.trim(),
        startDate,
        endDate,
        targetThreshold: threshold,
        workingDays,
      });

      showToast({
        title: 'Configuration Saved',
        message: 'Semester dates, working days, and target threshold updated.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Save Failed',
        message: err.message || 'Could not update semester configuration.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        'CAUTION: This will delete all course subjects, logged hours, and configurations permanently. This action is irreversible.'
      )
    ) {
      resetAllData();
      showToast({
        title: 'Factory Reset Complete',
        message: 'All local database entries purged.',
        type: 'warning',
      });
    }
  };

  const holidayList = rawHolidays.map((h) => ({
    id: h.id,
    semesterId: h.semester_id,
    date: h.date,
    name: h.name,
  }));

  const calendarSummary = calculateSemesterCalendarSummary(
    startDate,
    endDate,
    workingDays,
    holidayList
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Semester & Calendar Intelligence"
        description="Configure academic term boundaries, working days, and vacation schedules for accurate prediction."
      />

      {/* Semester Switching & Management */}
      <SemesterSelectorCard
        semesters={semesters}
        activeSemesterId={activeSemesterId}
        onSwitchSemester={switchSemester}
        onCreateSemester={async (input) => {
          await createSemester({
            name: input.name,
            startDate: input.startDate,
            endDate: input.endDate,
            threshold: input.threshold,
          });
        }}
        onDeleteSemester={deleteSemester}
        showToast={showToast}
      />

      {/* Calendar Summary Telemetry */}
      <CalendarSummaryCard summary={calendarSummary} />

      {/* Core Semester Configuration Form */}
      <form onSubmit={handleSaveConfig} className="space-y-6">
        {/* Core Metadata */}
        <Card className="space-y-4 border-border/80 p-5">
          <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3 text-text-primary">
            <GraduationCap className="h-4.5 w-4.5 text-brand" /> Core Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Semester Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fall Semester 2026"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Target Threshold (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </Card>

        {/* Date Ranges & Working Days */}
        <Card className="space-y-4 border-border/80 p-5">
          <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3 text-text-primary">
            <Calendar className="h-4.5 w-4.5 text-brand" /> Date Ranges & Class Schedule
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Academic Working Days (Select at least 1)
            </label>
            <div className="flex flex-wrap gap-2 pt-1.5">
              {days.map((day) => {
                const isActive = workingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleDay(day)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs font-bold font-mono border transition-all cursor-pointer select-none',
                      isActive
                        ? 'bg-brand/10 border-brand text-brand font-semibold'
                        : 'border-border bg-surface text-text-secondary hover:bg-surface-elevated'
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Save Controls */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-8 cursor-pointer"
          >
            Save Semester Parameters
          </Button>
        </div>
      </form>

      {/* Holiday Manager */}
      <HolidayManager
        holidays={holidayList}
        startDate={startDate}
        endDate={endDate}
        workingDays={workingDays}
        onAddHoliday={addHoliday}
        onEditHoliday={editHoliday}
        onDeleteHoliday={removeHoliday}
        showToast={showToast}
      />

      {/* Calendar Impact & Conflict Status Preview */}
      <SemesterCalendarStatus summary={calendarSummary} />

      {/* Danger Zone */}
      <div className="pt-4 border-t border-border flex justify-start">
        <Button
          type="button"
          variant="ghost"
          onClick={handleReset}
          className="text-text-muted hover:text-danger hover:bg-danger-muted/10 border border-transparent hover:border-danger/20 flex items-center gap-2 cursor-pointer text-xs"
        >
          <AlertTriangle className="h-4 w-4" /> Hard Reset All Data
        </Button>
      </div>
    </div>
  );
};
