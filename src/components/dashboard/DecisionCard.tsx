import React from 'react';
import { Card } from '@/components/ui/Card';
import { RecommendationPill } from '@/components/ui/RecommendationPill';
import { CheckCircle2, XCircle, MapPin, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttendanceStatus } from '@/types';

interface DecisionCardProps {
  subjectName: string;
  subjectCode?: string;
  componentType: string;
  componentName?: string;
  time: string;
  room?: string;
  currentPercentage: number | null;
  ifAttendedPercentage: number;
  ifSkippedPercentage: number;
  recommendation: AttendanceStatus;
  explanation?: string;
  isMostImportant?: boolean;
  currentStatus?: 'ATTENDED' | 'MISSED' | null;
  onLogAttendance?: (status: 'ATTENDED' | 'MISSED') => void;
  isSubmitting?: boolean;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  subjectName,
  subjectCode,
  componentType,
  componentName,
  time,
  room,
  currentPercentage,
  ifAttendedPercentage,
  ifSkippedPercentage,
  recommendation,
  explanation,
  isMostImportant = false,
  currentStatus,
  onLogAttendance,
  isSubmitting = false,
}) => {
  const currentSafe = currentPercentage ?? 0;
  const attendedDelta = ifAttendedPercentage - currentSafe;
  const skippedDelta = ifSkippedPercentage - currentSafe;

  return (
    <Card
      variant="glass"
      className={cn(
        'p-4 sm:p-5 border relative flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-lg',
        isMostImportant
          ? 'border-brand/60 shadow-[0_0_24px_rgba(0,210,255,0.22)] ring-1 ring-brand/50'
          : recommendation === 'SAFE'
          ? 'border-safe/30 hover:border-safe/60'
          : recommendation === 'RISKY'
          ? 'border-risk/30 hover:border-risk/60'
          : 'border-danger/30 hover:border-danger/60'
      )}
    >
      {/* Header Info */}
      <div>
        {isMostImportant && (
          <div className="bg-brand/15 border-b border-brand/30 px-3.5 py-1.5 -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 mb-3.5 flex items-center justify-between text-[10px] font-mono font-black text-brand uppercase tracking-widest shadow-xs">
            <span className="flex items-center gap-1">
              <Compass className="h-3.5 w-3.5 animate-spin text-brand" /> HIGH PRIORITY TODAY
            </span>
            <span className="bg-brand/20 px-1.5 py-0.5 rounded text-brand border border-brand/30">CRITICAL</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-text-primary text-sm sm:text-base tracking-tight line-clamp-1">{subjectName}</h4>
            <div className="flex items-center gap-1.5 mt-1">
              {subjectCode && (
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-brand bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded">
                  {subjectCode}
                </span>
              )}
              <span className="text-[10px] sm:text-[11px] text-text-muted font-mono uppercase tracking-wider">
                {componentName || componentType}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] sm:text-xs font-mono font-bold text-text-secondary bg-surface-elevated px-2 py-0.5 rounded-md border border-border shadow-2xs">
              {time}
            </span>
            {room && (
              <span className="text-[9px] sm:text-[10px] font-mono text-text-muted flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 text-brand/70" /> {room}
              </span>
            )}
          </div>
        </div>

        {/* Current Attendance State */}
        <div className="mt-3.5 flex items-center justify-between bg-surface-elevated/40 px-3 py-1.5 rounded-lg border border-border/50">
          <span className="text-xs text-text-secondary font-medium">Current Attendance:</span>
          <span className="font-mono font-black text-sm sm:text-base text-text-primary">
            {currentPercentage !== null ? `${currentPercentage.toFixed(1)}%` : '—'}
          </span>
        </div>

        {/* Projected Math with Precision Delta Indicators */}
        <div className="grid grid-cols-2 gap-2 mt-2.5 bg-surface-elevated/70 p-2.5 rounded-xl border border-border/60">
          {/* If Attended */}
          <div className="text-center border-r border-border/40 pr-2">
            <span className="text-[10px] font-mono uppercase font-bold text-text-muted block">If Attended</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="font-mono text-xs sm:text-sm font-bold text-safe">
                {ifAttendedPercentage.toFixed(1)}%
              </span>
              <span className="text-[9px] font-mono font-bold text-safe bg-safe-muted px-1 py-0.2 rounded border border-safe/25 flex items-center">
                <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                +{Math.max(0, attendedDelta).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* If Skipped */}
          <div className="text-center pl-2">
            <span className="text-[10px] font-mono uppercase font-bold text-text-muted block">If Skipped</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span
                className={cn(
                  'font-mono text-xs sm:text-sm font-bold',
                  recommendation === 'MUST_ATTEND' ? 'text-danger' : 'text-text-secondary'
                )}
              >
                {ifSkippedPercentage.toFixed(1)}%
              </span>
              <span
                className={cn(
                  'text-[9px] font-mono font-bold px-1 py-0.2 rounded border flex items-center',
                  recommendation === 'MUST_ATTEND'
                    ? 'text-danger bg-danger-muted border-danger/25'
                    : 'text-text-muted bg-surface border-border'
                )}
              >
                <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
                {skippedDelta.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Decision Explanation Text */}
        {explanation && (
          <p className="mt-2.5 text-[11px] text-text-muted italic leading-relaxed font-sans px-1">
            "{explanation}"
          </p>
        )}
      </div>

      {/* Decision recommendation tag & logger controls */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
        <RecommendationPill status={recommendation} />

        {onLogAttendance && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              disabled={isSubmitting}
              className={cn(
                'h-9 px-3 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all duration-150 active:scale-90 cursor-pointer select-none border',
                currentStatus === 'ATTENDED'
                  ? 'bg-safe text-background font-black border-safe shadow-[0_0_12px_rgba(0,245,160,0.3)]'
                  : 'bg-surface text-text-secondary border-border hover:bg-safe-muted hover:text-safe hover:border-safe/50'
              )}
              onClick={() => onLogAttendance('ATTENDED')}
              title="Mark Attended"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Attended</span>
            </button>

            <button
              disabled={isSubmitting}
              className={cn(
                'h-9 px-3 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all duration-150 active:scale-90 cursor-pointer select-none border',
                currentStatus === 'MISSED'
                  ? 'bg-danger text-white font-black border-danger shadow-[0_0_12px_rgba(255,51,102,0.3)]'
                  : 'bg-surface text-text-secondary border-border hover:bg-danger-muted hover:text-danger hover:border-danger/50'
              )}
              onClick={() => onLogAttendance('MISSED')}
              title="Mark Missed"
            >
              <XCircle className="h-4 w-4" />
              <span>Missed</span>
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};
