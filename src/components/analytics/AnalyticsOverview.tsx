import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnalyticsViewModel } from '@/hooks/useAnalyticsData';
import { TrendingUp, TrendingDown, AlertTriangle, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsOverviewProps {
  viewModel: AnalyticsViewModel;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ viewModel }) => {
  const {
    overallPercentage,
    totalAttended,
    totalDelivered,
    threshold,
    periodComparison,
    consistency,
  } = viewModel;

  const isPositiveMargin = overallPercentage !== null && overallPercentage > threshold;
  const isPointChangePositive = (periodComparison.percentagePointChange ?? 0) >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Overall Cumulative Attendance */}
      <Card className="p-4 border-border/80 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Overall Attendance
          </span>
          <Badge
            variant={isPositiveMargin ? 'safe' : 'danger'}
            className="text-[9px] font-mono py-0 font-bold"
          >
            {isPositiveMargin ? 'ELIGIBLE' : 'INELIGIBLE'}
          </Badge>
        </div>

        <div>
          <div className="text-3xl font-mono font-black text-text-primary">
            {overallPercentage !== null ? `${overallPercentage.toFixed(2)}%` : '—'}
          </div>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            {totalAttended} / {totalDelivered} classes
          </p>
        </div>

        <div className="text-[10px] text-text-secondary border-t border-border/40 pt-2 flex items-center justify-between">
          <span>Target: <strong>{threshold}%</strong></span>
          <span
            className={cn(
              'font-mono font-bold',
              isPositiveMargin ? 'text-safe' : 'text-danger'
            )}
          >
            {overallPercentage !== null
              ? `${(overallPercentage - threshold).toFixed(2)}% margin`
              : '—'}
          </span>
        </div>
      </Card>

      {/* 2. Recent Period Attendance */}
      <Card className="p-4 border-border/80 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Recent Period ({viewModel.periodDays}d)
          </span>
          <span className="text-xs text-text-secondary font-mono">
            {periodComparison.recentAttended} / {periodComparison.recentDelivered}
          </span>
        </div>

        <div>
          <div className="text-3xl font-mono font-black text-brand">
            {periodComparison.recentPercentage !== null
              ? `${periodComparison.recentPercentage.toFixed(2)}%`
              : '—'}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs font-mono">
            {periodComparison.percentagePointChange !== null ? (
              <span
                className={cn(
                  'font-bold flex items-center gap-0.5',
                  isPointChangePositive ? 'text-safe' : 'text-danger'
                )}
              >
                {isPointChangePositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {isPointChangePositive ? '+' : ''}
                {periodComparison.percentagePointChange} pts
              </span>
            ) : (
              <span className="text-text-muted">—</span>
            )}
            <span className="text-[10px] text-text-muted">vs previous period</span>
          </div>
        </div>

        <div className="text-[10px] text-text-secondary border-t border-border/40 pt-2 flex items-center justify-between">
          <span>Missed in period:</span>
          <strong className="font-mono text-danger">{periodComparison.recentMissed} classes</strong>
        </div>
      </Card>

      {/* 3. Missed Classes Summary */}
      <Card className="p-4 border-border/80 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Total Missed Classes
          </span>
          <AlertTriangle className="h-4 w-4 text-warning" />
        </div>

        <div>
          <div className="text-3xl font-mono font-black text-danger">
            {viewModel.missedSummary.totalMissed}
          </div>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            across {viewModel.subjectAnalytics.length} subjects
          </p>
        </div>

        <div className="text-[10px] text-text-secondary border-t border-border/40 pt-2 flex items-center justify-between">
          <span>Top Absence Component:</span>
          <strong className="font-mono text-text-primary uppercase">
            {viewModel.missedSummary.byComponentType[0]?.componentType || '—'}
          </strong>
        </div>
      </Card>

      {/* 4. Attendance Consistency */}
      <Card className="p-4 border-border/80 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Attendance Consistency
          </span>
          <Award className="h-4 w-4 text-brand" />
        </div>

        <div>
          <div className="text-3xl font-mono font-black text-text-primary">
            {consistency.score}%
          </div>
          <div className="mt-0.5">
            <Badge
              variant={
                consistency.rating === 'HIGH'
                  ? 'safe'
                  : consistency.rating === 'MODERATE'
                  ? 'risk'
                  : consistency.rating === 'NEEDS_ATTENTION'
                  ? 'danger'
                  : 'neutral'
              }
              className="text-[9px] font-mono py-0 uppercase font-bold"
            >
              {consistency.rating.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="text-[10px] text-text-secondary border-t border-border/40 pt-2 flex items-center justify-between">
          <span>Weekly Variance:</span>
          <strong className="font-mono text-text-primary">±{consistency.weeklyVariance}%</strong>
        </div>
      </Card>
    </div>
  );
};
