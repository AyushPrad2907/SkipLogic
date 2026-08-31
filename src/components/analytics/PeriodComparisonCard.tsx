import React from 'react';
import { Card } from '@/components/ui/Card';
import { PeriodComparisonResult } from '@/lib/analytics';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodComparisonCardProps {
  comparison: PeriodComparisonResult;
}

export const PeriodComparisonCard: React.FC<PeriodComparisonCardProps> = ({ comparison }) => {
  const {
    periodLabel,
    recentAttended,
    recentDelivered,
    recentPercentage,
    previousAttended,
    previousDelivered,
    previousPercentage,
    percentagePointChange,
    recentMissed,
    previousMissed,
  } = comparison;

  const isPositive = (percentagePointChange ?? 0) >= 0;

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Historical Period Comparison</h3>
        </div>
        <span className="text-xs font-mono text-text-muted">{periodLabel}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center font-mono">
        {/* Previous Period */}
        <div className="p-3 bg-surface rounded-lg border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Previous Period</span>
          <div className="text-xl font-black text-text-secondary mt-1">
            {previousPercentage !== null ? `${previousPercentage.toFixed(2)}%` : '—'}
          </div>
          <span className="text-[10px] text-text-muted block mt-0.5">
            {previousAttended} / {previousDelivered} ({previousMissed} missed)
          </span>
        </div>

        {/* Change Banner */}
        <div className="p-3 bg-surface-elevated rounded-lg border border-border flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Trajectory Shift</span>
          <div
            className={cn(
              'text-xl font-black mt-1 flex items-center justify-center gap-1',
              isPositive ? 'text-safe' : 'text-danger'
            )}
          >
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {percentagePointChange !== null ? `${isPositive ? '+' : ''}${percentagePointChange} pts` : '—'}
          </div>
          <span className="text-[9px] text-text-muted mt-0.5">Percentage Points</span>
        </div>

        {/* Recent Period */}
        <div className="p-3 bg-surface rounded-lg border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand">Recent Period</span>
          <div className="text-xl font-black text-brand mt-1">
            {recentPercentage !== null ? `${recentPercentage.toFixed(2)}%` : '—'}
          </div>
          <span className="text-[10px] text-text-muted block mt-0.5">
            {recentAttended} / {recentDelivered} ({recentMissed} missed)
          </span>
        </div>
      </div>
    </Card>
  );
};
