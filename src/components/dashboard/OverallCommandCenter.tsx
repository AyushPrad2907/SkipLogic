import React from 'react';
import { Card } from '@/components/ui/Card';
import { RingProgress } from '@/components/ui/RingProgress';
import { Badge } from '@/components/ui/Badge';
import { DashboardViewModel } from '@/lib/dashboardViewModel';
import { CheckCircle, AlertTriangle, AlertOctagon, ShieldAlert, ShieldCheck, Activity, Target } from 'lucide-react';
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
    <Card variant="glass" className="p-6 border-border/80 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div
        className={cn(
          'absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700',
          overallStatus === 'SAFE' && 'bg-safe',
          overallStatus === 'RISKY' && 'bg-risk',
          overallStatus === 'MUST_ATTEND' && 'bg-danger'
        )}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left Column: Big Percentage & Totals */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-brand flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-brand animate-pulse" /> ATTENDANCE COMMAND CENTER
            </span>
            <Badge
              variant={
                overallStatus === 'SAFE' ? 'safe' : overallStatus === 'RISKY' ? 'risk' : 'danger'
              }
              className="font-mono text-[10px] uppercase font-black tracking-wider px-2 py-0.5 shadow-sm"
            >
              {overallStatus === 'SAFE' ? (
                <ShieldCheck className="h-3.5 w-3.5 mr-1 inline text-safe" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 mr-1 inline text-danger" />
              )}
              {overallStatus === 'MUST_ATTEND' ? 'MUST ATTEND' : overallStatus}
            </Badge>
          </div>

          <div className="flex items-baseline gap-3.5">
            <span className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-text-primary">
              {overallAttendance !== null ? `${overallAttendance.toFixed(2)}%` : '—'}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-text-muted bg-surface-elevated/80 px-2.5 py-1 rounded-lg border border-border/60">
              {totalAttended} / {totalDelivered} classes
            </span>
          </div>

          {/* Threshold Safety Margin indicator */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-text-secondary flex items-center gap-1 font-mono">
              <Target className="h-3.5 w-3.5 text-brand" /> Target: <strong className="font-mono font-bold text-text-primary">{threshold}%</strong>
            </span>
            <span className="text-text-muted">•</span>
            <span
              className={cn(
                'font-mono font-bold px-2.5 py-0.5 rounded-lg text-[11px] border tracking-wide shadow-xs',
                isPositiveMargin
                  ? 'bg-safe-muted text-safe border-safe/30'
                  : 'bg-danger-muted text-danger border-danger/30'
              )}
            >
              {isPositiveMargin
                ? `+${margin.toFixed(2)}% safety margin`
                : `${margin.toFixed(2)}% below threshold`}
            </span>
          </div>
        </div>

        {/* Right Column: Ring Gauge & Subject Breakdowns */}
        <div className="flex items-center gap-6 self-start lg:self-center border-t lg:border-t-0 lg:border-l border-border/60 pt-4 lg:pt-0 lg:pl-8">
          <RingProgress
            value={overallAttendance ?? 100}
            status={overallStatus}
            size="lg"
            className="shrink-0"
          />

          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 text-xs font-mono font-bold">
            <div className="flex items-center gap-2 text-safe bg-safe-muted/40 border border-safe/25 px-2.5 py-1 rounded-lg">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{safeSubjectsCount} Safe</span>
            </div>
            <div className="flex items-center gap-2 text-risk bg-risk-muted/40 border border-risk/25 px-2.5 py-1 rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{riskySubjectsCount} Risky</span>
            </div>
            <div className="flex items-center gap-2 text-danger bg-danger-muted/40 border border-danger/25 px-2.5 py-1 rounded-lg">
              <AlertOctagon className="h-4 w-4 shrink-0" />
              <span>{mustAttendSubjectsCount} Danger</span>
            </div>
            {unrecoverableSubjectsCount > 0 && (
              <div className="flex items-center gap-2 text-danger font-black bg-danger-muted border border-danger/40 px-2.5 py-1 rounded-lg animate-pulse">
                <AlertOctagon className="h-4 w-4 shrink-0" />
                <span>{unrecoverableSubjectsCount} Failed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
