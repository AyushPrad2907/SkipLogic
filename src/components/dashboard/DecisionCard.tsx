import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RecommendationPill } from '@/components/ui/RecommendationPill';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttendanceStatus } from '@/types';

interface DecisionCardProps {
  subjectName: string;
  subjectCode?: string;
  componentType: string;
  time: string;
  currentPercentage: number;
  ifAttendedPercentage: number;
  ifSkippedPercentage: number;
  recommendation: AttendanceStatus;
  onLogAttendance?: (status: 'ATTENDED' | 'BUNKED') => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  subjectName,
  subjectCode,
  componentType,
  time,
  currentPercentage,
  ifAttendedPercentage,
  ifSkippedPercentage,
  recommendation,
  onLogAttendance,
}) => {

  return (
    <Card className={cn(
      'border relative flex flex-col justify-between overflow-hidden',
      recommendation === 'SAFE' && 'border-safe/20',
      recommendation === 'RISKY' && 'border-risk/20',
      recommendation === 'MUST_ATTEND' && 'border-danger/20'
    )}>
      {/* Header Info */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-bold text-text-primary text-sm line-clamp-1">{subjectName}</h4>
            <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wide font-mono">
              {subjectCode ? `${subjectCode} · ` : ''}{componentType}
            </p>
          </div>
          <span className="text-[10px] font-mono font-medium text-text-secondary bg-surface-elevated px-2 py-0.5 rounded border border-border">
            {time}
          </span>
        </div>

        {/* Current State */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-text-secondary">Current Attendance:</span>
          <span className="font-mono font-bold text-sm text-text-primary">{currentPercentage.toFixed(1)}%</span>
        </div>

        {/* Projected Math */}
        <div className="grid grid-cols-2 gap-2 mt-3 bg-surface-elevated/40 p-2.5 rounded-lg border border-border/40">
          <div className="text-center border-r border-border/30">
            <span className="text-[10px] text-text-muted block">If Attended</span>
            <span className="font-mono text-xs font-bold text-safe mt-0.5 block">→ {ifAttendedPercentage.toFixed(1)}%</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-text-muted block">If Skipped</span>
            <span className={cn(
              'font-mono text-xs font-bold mt-0.5 block',
              recommendation === 'MUST_ATTEND' ? 'text-danger' : 'text-text-secondary'
            )}>
              → {ifSkippedPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Decision recommendation tag & logger controls */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
        <RecommendationPill status={recommendation} />

        {onLogAttendance && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-md border border-border bg-surface hover:bg-safe-muted hover:text-safe hover:border-safe/30 text-safe-foreground cursor-pointer"
              onClick={() => onLogAttendance('ATTENDED')}
              title="Mark Attended"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-md border border-border bg-surface hover:bg-danger-muted hover:text-danger hover:border-danger/30 text-danger-foreground cursor-pointer"
              onClick={() => onLogAttendance('BUNKED')}
              title="Mark Bunked"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
