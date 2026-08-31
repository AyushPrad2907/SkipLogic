import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SubjectRiskSummary } from '@/lib/dashboardViewModel';
import { Link } from 'react-router-dom';
import { ChevronRight, ShieldAlert, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubjectRiskOverviewProps {
  subjects: SubjectRiskSummary[];
}

export const SubjectRiskOverview: React.FC<SubjectRiskOverviewProps> = ({ subjects }) => {
  if (subjects.length === 0) return null;

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-brand" />
            Subject Risk Prioritization
          </h3>
          <p className="text-xs text-text-secondary">Sorted by urgency & lowest threshold safety margin.</p>
        </div>
        <Link to="/app/subjects" className="text-xs font-mono font-bold text-brand hover:underline flex items-center">
          Manage Subjects <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </Link>
      </div>

      <div className="divide-y divide-border/40">
        {subjects.map((sub) => {
          const isBelowThreshold = (sub.currentPercentage ?? 0) <= sub.threshold;

          return (
            <div key={sub.subjectId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/app/subjects/${sub.subjectId}`}
                    className="font-bold text-text-primary hover:text-brand hover:underline text-sm"
                  >
                    {sub.subjectName}
                  </Link>
                  {sub.subjectCode && (
                    <span className="font-mono text-[10px] text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded border border-border/60 uppercase">
                      {sub.subjectCode}
                    </span>
                  )}
                  <Badge
                    variant={
                      sub.status === 'SAFE'
                        ? 'safe'
                        : sub.status === 'RISKY'
                        ? 'risk'
                        : 'danger'
                    }
                    className="text-[9px] uppercase font-mono font-bold py-0"
                  >
                    {sub.status === 'MUST_ATTEND' ? 'MUST ATTEND' : sub.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-text-secondary">
                  <span>
                    Delivered: <strong className="font-mono text-text-primary">{sub.currentAttended} / {sub.currentDelivered}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Forecast: <strong className="font-mono text-safe">{sub.forecastPercentage !== null ? `${sub.forecastPercentage}%` : '—'}</strong>
                  </span>
                </div>
              </div>

              {/* Attendance % & Urgency Note */}
              <div className="flex items-center gap-4 justify-between sm:justify-end">
                <div className="text-left sm:text-right">
                  <div
                    className={cn(
                      'text-lg font-mono font-black',
                      sub.status === 'SAFE' && 'text-safe',
                      sub.status === 'RISKY' && 'text-warning',
                      (sub.status === 'MUST_ATTEND' || sub.status === 'UNRECOVERABLE') && 'text-danger'
                    )}
                  >
                    {sub.currentPercentage !== null ? `${sub.currentPercentage.toFixed(2)}%` : '—'}
                  </div>

                  <div className="text-[10px] font-mono text-text-muted">
                    {sub.status === 'UNRECOVERABLE' ? (
                      <span className="text-danger font-bold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 inline" /> Unrecoverable
                      </span>
                    ) : isBelowThreshold ? (
                      <span className="text-danger font-bold">Need {sub.recoveryNeededCount} consecutive classes</span>
                    ) : (
                      <span className="text-safe font-bold">{sub.safeBunksCount} safe skips left</span>
                    )}
                  </div>
                </div>

                <Link
                  to={`/app/subjects/${sub.subjectId}`}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
