import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SemesterCalendarSummary } from '@/lib/semesterCalendar';
import { CalendarOff, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

interface SemesterCalendarStatusProps {
  summary: SemesterCalendarSummary;
}

export const SemesterCalendarStatus: React.FC<SemesterCalendarStatusProps> = ({ summary }) => {
  const { upcomingExcludedDates, conflicts, configuredHolidaysCount } = summary;

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <CalendarOff className="h-4.5 w-4.5 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Calendar Exclusions & Impact Preview</h3>
        </div>
        <Badge variant="neutral" className="font-mono text-[10px]">
          {configuredHolidaysCount} Holidays Configured
        </Badge>
      </div>

      {/* Upcoming Excluded Dates preview */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
          Upcoming Excluded Class Dates ({upcomingExcludedDates.length})
        </h4>

        {upcomingExcludedDates.length === 0 ? (
          <p className="text-xs text-text-muted italic">
            No upcoming working-day class exclusions scheduled.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {upcomingExcludedDates.map((date) => (
              <span
                key={date}
                className="px-2.5 py-1 rounded bg-warning-muted/20 border border-warning/30 text-warning font-mono text-xs font-bold flex items-center gap-1.5"
              >
                <CalendarOff className="h-3 w-3" />
                {date}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Conflicts & Informational Notes list */}
      {conflicts.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Calendar Conflict Analysis & Notes
          </h4>

          <div className="space-y-2 text-xs">
            {conflicts.map((c, idx) => (
              <div
                key={c.holidayId || idx}
                className="p-2.5 bg-surface border border-border/60 rounded-md flex items-start gap-2.5"
              >
                {c.conflictType === 'NON_WORKING_DAY' ? (
                  <Info className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                ) : c.conflictType === 'TODAY_HOLIDAY' ? (
                  <CheckCircle2 className="h-4 w-4 text-safe shrink-0 mt-0.5" />
                ) : c.conflictType === 'OUTSIDE_SEMESTER' ? (
                  <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                ) : (
                  <CalendarOff className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                )}

                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">
                      {c.name} ({c.date})
                    </span>
                    <span className="font-mono text-[10px] text-text-muted">
                      {c.dayOfWeek}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary">{c.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
