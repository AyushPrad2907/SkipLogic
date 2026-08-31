import React from 'react';
import { Card } from '@/components/ui/Card';
import { RecoveryAlertItem } from '@/lib/dashboardViewModel';
import { AlertOctagon, Calendar, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecoveryAlertsCardProps {
  alerts: RecoveryAlertItem[];
}

export const RecoveryAlertsCard: React.FC<RecoveryAlertsCardProps> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <Card variant="glass" className="p-5 border-danger/40 bg-danger-muted/15 space-y-3.5 shadow-[0_0_20px_rgba(255,51,102,0.12)]">
      <div className="flex items-center justify-between border-b border-danger/25 pb-2.5">
        <div className="flex items-center gap-2 text-danger font-bold text-sm font-mono tracking-wide">
          <AlertOctagon className="h-4 w-4 shrink-0 text-danger animate-pulse" />
          <h3 className="uppercase">ACTION NEEDED: RECOVERY ALERTS ({alerts.length})</h3>
        </div>
        <span className="text-[10px] font-mono text-danger font-bold bg-danger-muted px-2 py-0.5 rounded border border-danger/30">
          BELOW THRESHOLD
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.subjectId}
            className="p-3.5 bg-surface/90 border border-danger/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-text-primary text-sm tracking-tight">{alert.subjectName}</span>
                <span className="font-mono font-black text-xs text-danger bg-danger-muted px-1.5 py-0.5 rounded border border-danger/25">
                  {alert.currentPercentage !== null ? `${alert.currentPercentage.toFixed(1)}%` : '—'}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  (Target: {alert.threshold}%)
                </span>
              </div>

              {alert.recoverable ? (
                <p className="text-text-secondary leading-relaxed">
                  Attend the next <strong className="font-mono font-bold text-danger bg-danger-muted px-1 rounded">{alert.classesNeeded} required classes</strong> in sequence to cross {alert.threshold}%.
                </p>
              ) : (
                <p className="text-danger font-semibold leading-relaxed flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 inline" />
                  Recovery mathematically impossible. Best possible max percentage is{' '}
                  <span className="font-mono font-bold">{alert.bestPossiblePercentage}%</span>.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              {alert.recoverable && alert.recoveryDate && (
                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-safe bg-safe-muted/50 border border-safe/30 px-2.5 py-1 rounded-lg">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Est. {alert.recoveryDate}</span>
                </div>
              )}
              <Link
                to={`/app/subjects/${alert.subjectId}`}
                className="text-xs font-mono font-bold text-brand hover:underline flex items-center gap-1"
              >
                <span>View</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
