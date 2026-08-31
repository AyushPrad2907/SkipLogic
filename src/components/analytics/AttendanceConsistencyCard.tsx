import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AttendanceConsistencyResult } from '@/lib/analytics';
import { Award, Info } from 'lucide-react';

interface AttendanceConsistencyCardProps {
  consistency: AttendanceConsistencyResult;
}

export const AttendanceConsistencyCard: React.FC<AttendanceConsistencyCardProps> = ({ consistency }) => {
  const { score, rating, explanation, weeklyVariance } = consistency;

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Award className="h-4.5 w-4.5 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Attendance Consistency Index</h3>
        </div>
        <Badge
          variant={
            rating === 'HIGH'
              ? 'safe'
              : rating === 'MODERATE'
              ? 'risk'
              : rating === 'NEEDS_ATTENTION'
              ? 'danger'
              : 'neutral'
          }
          className="text-[9px] font-mono uppercase font-bold py-0"
        >
          {rating.replace('_', ' ')}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-elevated/40 p-4 rounded-lg border border-border/60">
        <div className="text-center sm:text-left space-y-1">
          <div className="text-4xl font-mono font-black text-text-primary">
            {score}%
          </div>
          <p className="text-xs text-text-secondary font-sans leading-relaxed">
            {explanation}
          </p>
        </div>

        <div className="border-t sm:border-t-0 sm:border-l border-border/60 pt-3 sm:pt-0 sm:pl-4 text-xs font-mono shrink-0 space-y-1 text-center sm:text-right">
          <div>
            Weekly Variance: <strong className="text-brand font-bold">±{weeklyVariance}%</strong>
          </div>
          <div className="text-[10px] text-text-muted">
            Formula: 100 - (Weekly Std. Dev × 1.2)
          </div>
        </div>
      </div>

      <div className="p-2.5 bg-surface border border-border/40 rounded-md text-[11px] text-text-muted leading-relaxed flex items-start gap-2">
        <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
        <span>
          <strong>Transparent Calculation:</strong> This index measures how reliably you attend class week-to-week without sudden, unpredictable absence spikes. High consistency (85-100%) protects your attendance buffer against sudden threshold breaches.
        </span>
      </div>
    </Card>
  );
};
