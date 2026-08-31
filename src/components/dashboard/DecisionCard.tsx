import React from 'react';
import { Card } from '@/components/ui/Card';
import { RecommendationPill } from '@/components/ui/RecommendationPill';
import { Check, X, MapPin } from 'lucide-react';
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
  return (
    <Card
      className={cn(
        'p-4 sm:p-5 border relative flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-md',
        isMostImportant
          ? 'border-brand shadow-[0_0_15px_rgba(99,102,241,0.2)] ring-1 ring-brand/40'
          : recommendation === 'SAFE'
          ? 'border-safe/25 hover:border-safe/40'
          : recommendation === 'RISKY'
          ? 'border-risk/25 hover:border-risk/40'
          : 'border-danger/25 hover:border-danger/40'
      )}
    >
      {/* Header Info */}
      <div>
        {isMostImportant && (
          <div className="bg-brand/10 border-b border-brand/20 px-3 py-1 -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 mb-3 flex items-center justify-between text-[10px] font-mono font-bold text-brand uppercase tracking-wider">
            <span>★ MOST IMPORTANT TODAY</span>
            <span>CRITICAL</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-text-primary text-sm sm:text-base line-clamp-1">{subjectName}</h4>
            <p className="text-[10px] sm:text-xs text-text-muted mt-0.5 uppercase tracking-wide font-mono">
              {subjectCode ? `${subjectCode} · ` : ''}
              {componentName || componentType}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] sm:text-xs font-mono font-semibold text-text-secondary bg-surface-elevated px-2 py-0.5 rounded border border-border">
              {time}
            </span>
            {room && (
              <span className="text-[9px] sm:text-[10px] font-mono text-text-muted flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" /> {room}
              </span>
            )}
          </div>
        </div>

        {/* Current Attendance State */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-text-secondary">Current Attendance:</span>
          <span className="font-mono font-bold text-sm sm:text-base text-text-primary">
            {currentPercentage !== null ? `${currentPercentage.toFixed(1)}%` : '—'}
          </span>
        </div>

        {/* Projected Math */}
        <div className="grid grid-cols-2 gap-2 mt-2.5 bg-surface-elevated/50 p-2.5 rounded-lg border border-border/40">
          <div className="text-center border-r border-border/30">
            <span className="text-[10px] text-text-muted block">If Attended</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-safe mt-0.5 block">
              → {ifAttendedPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-text-muted block">If Skipped</span>
            <span
              className={cn(
                'font-mono text-xs sm:text-sm font-bold mt-0.5 block',
                recommendation === 'MUST_ATTEND' ? 'text-danger' : 'text-text-secondary'
              )}
            >
              → {ifSkippedPercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Decision Explanation Text */}
        {explanation && (
          <p className="mt-2 text-[11px] text-text-muted italic leading-snug font-sans">
            "{explanation}"
          </p>
        )}
      </div>

      {/* Decision recommendation tag & logger controls */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
        <RecommendationPill status={recommendation} />

        {onLogAttendance && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              disabled={isSubmitting}
              className={cn(
                'h-9 px-3 rounded-lg text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all duration-150 active:scale-90 cursor-pointer select-none border',
                currentStatus === 'ATTENDED'
                  ? 'bg-safe text-white border-safe shadow-sm'
                  : 'bg-surface text-text-secondary border-border hover:bg-safe-muted hover:text-safe hover:border-safe/40'
              )}
              onClick={() => onLogAttendance('ATTENDED')}
              title="Mark Attended"
            >
              <Check className="h-4 w-4" />
              <span>Attended</span>
            </button>

            <button
              disabled={isSubmitting}
              className={cn(
                'h-9 px-3 rounded-lg text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all duration-150 active:scale-90 cursor-pointer select-none border',
                currentStatus === 'MISSED'
                  ? 'bg-danger text-white border-danger shadow-sm'
                  : 'bg-surface text-text-secondary border-border hover:bg-danger-muted hover:text-danger hover:border-danger/40'
              )}
              onClick={() => onLogAttendance('MISSED')}
              title="Mark Missed"
            >
              <X className="h-4 w-4" />
              <span>Missed</span>
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};
