import React, { useState } from 'react';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { DayOfWeek } from '@/types';
import { cn } from '@/lib/utils';
import { GraduationCap, Calendar, Settings, AlertTriangle, Plus, Trash2 } from 'lucide-react';

export const Semester: React.FC = () => {
  const { settings, updateSettings, resetAllData } = useAttendance();
  const { showToast } = useToast();

  const [name, setName] = useState(settings.name || '');
  const [startDate, setStartDate] = useState(settings.startDate || '');
  const [endDate, setEndDate] = useState(settings.endDate || '');
  const [threshold, setThreshold] = useState(settings.targetThreshold || 75);
  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>(settings.workingDays || []);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidays, setHolidays] = useState<string[]>(settings.holidays || []);

  const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  const handleToggleDay = (day: DayOfWeek) => {
    if (workingDays.includes(day)) {
      setWorkingDays(prev => prev.filter(d => d !== day));
    } else {
      setWorkingDays(prev => [...prev, day]);
    }
  };

  const handleAddHoliday = () => {
    if (!holidayDate) return;
    if (holidays.includes(holidayDate)) {
      showToast({ title: 'Holiday Error', message: 'Holiday date already configured.', type: 'danger' });
      return;
    }
    setHolidays(prev => [...prev, holidayDate].sort());
    setHolidayDate('');
    showToast({ title: 'Holiday Added', message: 'Exclusion registered successfully.', type: 'success' });
  };

  const handleRemoveHoliday = (date: string) => {
    setHolidays(prev => prev.filter(d => d !== date));
    showToast({ title: 'Holiday Removed', message: 'Date inclusion restored.', type: 'info' });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast({ title: 'Validation Error', message: 'Semester name is required.', type: 'danger' });
      return;
    }
    if (!startDate || !endDate) {
      showToast({ title: 'Validation Error', message: 'Dates are required.', type: 'danger' });
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      showToast({ title: 'Validation Error', message: 'End date must be after start date.', type: 'danger' });
      return;
    }
    if (workingDays.length === 0) {
      showToast({ title: 'Validation Error', message: 'Select at least one working day.', type: 'danger' });
      return;
    }

    updateSettings({
      ...settings,
      name: name.trim(),
      startDate,
      endDate,
      targetThreshold: threshold,
      workingDays,
      holidays,
    });

    showToast({
      title: 'Settings Saved',
      message: 'Semester parameters successfully updated.',
      type: 'success',
    });
  };

  const handleReset = () => {
    if (confirm('CAUTION: This will delete all course subjects, logged hours, and configurations permanently. This action is irreversible.')) {
      resetAllData();
      setName('');
      setStartDate('');
      setEndDate('');
      setThreshold(75);
      setWorkingDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
      setHolidays([]);
      showToast({
        title: 'Factory Reset Complete',
        message: 'All local database entries purged.',
        type: 'warning',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Semester Configuration"
        description="Edit academic term guidelines, target attendance limits, and vacation schedules."
      />

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Core Metadata */}
        <Card className="space-y-4 border-border/80">
          <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3">
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
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </Card>

        {/* Date Ranges & Working Days */}
        <Card className="space-y-4 border-border/80">
          <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3">
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
              Active Lecture Days
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

        {/* Holidays */}
        <Card className="space-y-4 border-border/80">
          <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3">
            <Settings className="h-4.5 w-4.5 text-brand" /> Term Holidays & Exclusions
          </h3>

          <div className="flex items-end gap-3 max-w-md">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Select Holiday Date
              </label>
              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none"
              />
            </div>
            <Button type="button" onClick={handleAddHoliday} className="h-10 flex items-center gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" /> Add Date
            </Button>
          </div>

          {holidays.length > 0 && (
            <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border/50 max-w-md mt-2">
              {holidays.map((hDate) => (
                <div key={hDate} className="flex items-center justify-between p-2.5 text-xs hover:bg-surface-elevated/40">
                  <span className="font-mono text-text-primary font-medium">{hDate}</span>
                  <Button
                    variant="ghost"
                    onClick={() => handleRemoveHoliday(hDate)}
                    className="h-7 w-7 p-0 text-text-muted hover:text-danger cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            className="text-text-muted hover:text-danger hover:bg-danger-muted/10 border border-transparent hover:border-danger/20 w-full sm:w-auto flex items-center gap-2 cursor-pointer"
          >
            <AlertTriangle className="h-4 w-4" /> Hard Reset All Data
          </Button>

          <Button type="submit" className="w-full sm:w-auto h-10 px-8 cursor-pointer">
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
