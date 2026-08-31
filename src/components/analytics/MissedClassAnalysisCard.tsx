import React from 'react';
import { Card } from '@/components/ui/Card';
import { MissedClassSummary } from '@/lib/analytics';
import { CalendarOff, PieChart } from 'lucide-react';

interface MissedClassAnalysisCardProps {
  summary: MissedClassSummary;
}

export const MissedClassAnalysisCard: React.FC<MissedClassAnalysisCardProps> = ({ summary }) => {
  const { totalMissed, bySubject, byComponentType, byWeekday } = summary;

  const maxWeekdayCount = Math.max(1, ...byWeekday.map((w) => w.count));

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <CalendarOff className="h-4.5 w-4.5 text-danger" />
          <h3 className="text-sm font-bold text-text-primary">Missed Class Breakdown</h3>
        </div>
        <span className="text-xs font-mono font-bold text-danger">
          {totalMissed} Total Missed Classes
        </span>
      </div>

      {totalMissed === 0 ? (
        <div className="p-6 text-center text-text-muted text-xs border border-dashed border-border/60 rounded-lg">
          Zero missed classes logged in this period. Perfect record!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: By Subject & Component */}
          <div className="space-y-4">
            {/* By Subject */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Absences by Subject
              </h4>
              <div className="space-y-1.5 font-mono text-xs">
                {bySubject.filter(s => s.count > 0).map((s) => (
                  <div key={s.subjectId} className="flex items-center justify-between p-2 bg-surface rounded border border-border/40">
                    <span className="font-bold text-text-primary text-xs">{s.subjectName}</span>
                    <span className="text-danger font-bold">{s.count} missed</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Component */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Absences by Component Type
              </h4>
              <div className="space-y-1.5 font-mono text-xs">
                {byComponentType.map((c) => (
                  <div key={c.componentType} className="flex items-center justify-between p-2 bg-surface rounded border border-border/40">
                    <span className="font-bold text-text-primary uppercase">{c.componentType}</span>
                    <span className="text-danger font-bold">{c.count} missed</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Weekday Distribution Bars */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="h-3.5 w-3.5 text-brand" /> Absences by Weekday
            </h4>

            <div className="space-y-2 pt-1 font-mono text-xs">
              {byWeekday.map((w) => {
                const pctWidth = Math.round((w.count / maxWeekdayCount) * 100);

                return (
                  <div key={w.day} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-text-secondary">{w.day.slice(0, 3)}</span>
                      <span className="text-text-primary font-bold">{w.count} missed</span>
                    </div>

                    <div className="h-3 w-full bg-surface border border-border/40 rounded overflow-hidden p-0.5">
                      <div
                        className="h-full bg-danger rounded transition-all duration-300"
                        style={{ width: `${w.count > 0 ? Math.max(6, pctWidth) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
