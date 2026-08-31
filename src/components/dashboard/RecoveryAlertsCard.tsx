import React from 'react';
import { Card } from '@/components/ui/Card';
import { RecoveryAlertItem } from '@/lib/dashboardViewModel';
import { AlertTriangle, Calendar, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecoveryAlertsCardProps {
  alerts: RecoveryAlertItem[];
}

export const RecoveryAlertsCard: React.FC<RecoveryAlertsCardProps> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <Card className="p-5 border-danger/30 bg-danger-muted/15 space-y-3">
      <div className="flex items-center gap-2 text-danger font-bold text-sm border-b border-danger/20 pb-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <h3>Action Needed: Recovery Alerts ({alerts.length})</h3>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.subjectId}
            className="p-3 bg-surface border border-danger/25 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-primary text-sm">{alert.subjectName}</span>
                <span className="font-mono font-bold text-danger">
                  {alert.currentPercentage !== null ? `${alert.currentPercentage.toFixed(2)}%` : '—'}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  (Target: {alert.threshold}%)
                </span>
              </div>

              {alert.recoverable ? (
                <p className="text-text-secondary leading-relaxed">
                  Attend the next <strong className="font-mono text-danger">{alert.classesNeeded} required classes</strong> in sequence to cross {alert.threshold}%.
                </p>
              ) : (
                <p className="text-danger font-semibold leading-relaxed flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 inline" />
                  Recovery mathematically impossible. Best possible max percentage is{' '}
                  <span className="font-mono">{alert.bestPossiblePercentage}%</span>.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              {alert.recoverable && alert.recoveryDate && (
                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-safe bg-safe-muted/40 border border-safe/30 px-2 py-1 rounded">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Est. {alert.recoveryDate}</span>
                </div>
              )}
              <Link
                to={`/app/subjects/${alert.subjectId}`}
                className="text-xs font-mono font-bold text-brand hover:underline"
              >
                View Subject →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
