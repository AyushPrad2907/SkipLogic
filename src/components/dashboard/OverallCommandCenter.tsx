import React from 'react';
import { Card } from '@/components/ui/Card';
import { RingProgress } from '@/components/ui/RingProgress';
import { Badge } from '@/components/ui/Badge';
import { DashboardViewModel } from '@/lib/dashboardViewModel';
import { CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverallCommandCenterProps {
  viewModel: DashboardViewModel;
}

export const OverallCommandCenter: React.FC<OverallCommandCenterProps> = ({ viewModel }) => {
  const {
    overallAttendance,
    totalAttended,
    totalDelivered,
    threshold,
    overallStatus,
    margin,
    safeSubjectsCount,
    riskySubjectsCount,
    mustAttendSubjectsCount,
    unrecoverableSubjectsCount,
  } = viewModel;

  const isPositiveMargin = margin >= 0;

  return (
    <Card className="p-6 border-border/80 bg-surface-elevated/40 relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div
        className={cn(
          'absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none',
          overallStatus === 'SAFE' && 'bg-safe',
          overallStatus === 'RISKY' && 'bg-warning',
          overallStatus === 'MUST_ATTEND' && 'bg-danger'
        )}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left Column: Big Percentage & Totals */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Attendance Command Center
            </span>
            <Badge
              variant={
                overallStatus === 'SAFE' ? 'safe' : overallStatus === 'RISKY' ? 'risk' : 'danger'
              }
              className="font-mono text-[10px] uppercase font-bold"
            >
              {overallStatus === 'SAFE' ? (
                <ShieldCheck className="h-3 w-3 mr-1 inline" />
              ) : (
                <ShieldAlert className="h-3 w-3 mr-1 inline" />
              )}
              {overallStatus === 'MUST_ATTEND' ? 'MUST ATTEND' : overallStatus}
            </Badge>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-text-primary">
              {overallAttendance !== null ? `${overallAttendance.toFixed(2)}%` : '—'}
            </span>
            <span className="text-sm font-mono font-semibold text-text-muted">
              {totalAttended} / {totalDelivered} classes
            </span>
          </div>

          {/* Threshold Safety Margin indicator */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-text-secondary">
              Configured Threshold: <strong className="font-mono text-text-primary">{threshold}%</strong>
            </span>
            <span className="text-text-muted">•</span>
            <span
              className={cn(
                'font-mono font-bold px-2 py-0.5 rounded text-[11px]',
                isPositiveMargin
                  ? 'bg-safe-muted text-safe border border-safe/25'
                  : 'bg-danger-muted text-danger border border-danger/25'
              )}
            >
              {isPositiveMargin
                ? `+${margin.toFixed(2)}% safety margin`
                : `${margin.toFixed(2)}% below threshold`}
            </span>
          </div>
        </div>

        {/* Right Column: Ring Gauge & Subject Breakdowns */}
        <div className="flex items-center gap-6 self-start lg:self-center border-t lg:border-t-0 lg:border-l border-border/60 pt-4 lg:pt-0 lg:pl-6">
          <RingProgress
            value={overallAttendance ?? 100}
            status={overallStatus}
            size="lg"
            className="shrink-0"
          />

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-safe">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{safeSubjectsCount} Safe</span>
            </div>
            <div className="flex items-center gap-1.5 text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{riskySubjectsCount} Risky</span>
            </div>
            <div className="flex items-center gap-1.5 text-danger">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{mustAttendSubjectsCount} Danger</span>
            </div>
            {unrecoverableSubjectsCount > 0 && (
              <div className="flex items-center gap-1.5 text-danger font-bold">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{unrecoverableSubjectsCount} Failed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
