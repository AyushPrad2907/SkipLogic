import React from 'react';
import { Card } from '@/components/ui/Card';
import { SemesterCalendarSummary } from '@/lib/semesterCalendar';
import { Calendar } from 'lucide-react';

interface CalendarSummaryCardProps {
  summary: SemesterCalendarSummary;
}

export const CalendarSummaryCard: React.FC<CalendarSummaryCardProps> = ({ summary }) => {
  const {
    startDate,
    endDate,
    totalCalendarDays,
    configuredWorkingDaysCount,
    configuredHolidaysCount,
    holidaysInSemesterCount,
    estimatedWorkingDays,
  } = summary;

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4.5 w-4.5 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Semester Calendar Intelligence</h3>
        </div>
        <span className="text-xs font-mono text-text-muted">
          {startDate || '—'} → {endDate || '—'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-surface rounded-lg border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Term Days</span>
          <div className="text-lg font-mono font-bold text-text-primary mt-1">
            {totalCalendarDays}
          </div>
          <span className="text-[9px] text-text-muted">Calendar span</span>
        </div>

        <div className="p-3 bg-surface rounded-lg border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Active Working Days</span>
          <div className="text-lg font-mono font-bold text-brand mt-1">
            {configuredWorkingDaysCount} / 7
          </div>
          <span className="text-[9px] text-text-muted">Weekly schedule</span>
        </div>

        <div className="p-3 bg-surface rounded-lg border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Term Holidays</span>
          <div className="text-lg font-mono font-bold text-warning mt-1">
            {holidaysInSemesterCount}
          </div>
          <span className="text-[9px] text-text-muted">Exclusions ({configuredHolidaysCount} total)</span>
        </div>

        <div className="p-3 bg-safe-muted/20 rounded-lg border border-safe/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-safe">Est. Working Days</span>
          <div className="text-lg font-mono font-black text-safe mt-1">
            {estimatedWorkingDays}
          </div>
          <span className="text-[9px] text-safe/80">Delivered class days</span>
        </div>
      </div>
    </Card>
  );
};
