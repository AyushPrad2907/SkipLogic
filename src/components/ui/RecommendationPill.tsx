import React from 'react';
import { cn } from '@/lib/utils';
import { AttendanceStatus } from '@/types';
import { CheckCircle, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

interface RecommendationPillProps {
  status: AttendanceStatus;
  className?: string;
}

export const RecommendationPill: React.FC<RecommendationPillProps> = ({ status, className }) => {
  const configs = {
    SAFE: {
      label: 'SAFE TO SKIP',
      icon: <CheckCircle className="h-3.5 w-3.5 shrink-0 text-safe" />,
      classes: 'bg-safe-muted text-safe-foreground border-safe/40 shadow-[0_0_12px_rgba(0,245,160,0.15)]',
    },
    RISKY: {
      label: 'RISKY BUNK',
      icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-risk" />,
      classes: 'bg-risk-muted text-risk-foreground border-risk/40 shadow-[0_0_12px_rgba(255,184,0,0.15)]',
    },
    MUST_ATTEND: {
      label: 'MUST ATTEND',
      icon: <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-danger animate-pulse" />,
      classes: 'bg-danger-muted text-danger-foreground border-danger/40 shadow-[0_0_12px_rgba(255,51,102,0.18)]',
    },
    NEUTRAL: {
      label: 'NO DECISION',
      icon: <HelpCircle className="h-3.5 w-3.5 shrink-0 text-text-muted" />,
      classes: 'bg-surface-elevated text-text-secondary border-border',
    },
  };

  const config = configs[status] || configs.NEUTRAL;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider select-none transition-all duration-200',
        config.classes,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
