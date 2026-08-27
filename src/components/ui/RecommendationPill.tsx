import React from 'react';
import { cn } from '@/lib/utils';
import { AttendanceStatus } from '@/types';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

interface RecommendationPillProps {
  status: AttendanceStatus;
  className?: string;
}

export const RecommendationPill: React.FC<RecommendationPillProps> = ({ status, className }) => {
  const configs = {
    SAFE: {
      label: 'SAFE TO SKIP',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      classes: 'bg-safe-muted text-safe-foreground border-safe/30',
    },
    RISKY: {
      label: 'RISKY BUNK',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      classes: 'bg-risk-muted text-risk-foreground border-risk/30',
    },
    MUST_ATTEND: {
      label: 'MUST ATTEND',
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      classes: 'bg-danger-muted text-danger-foreground border-danger/30',
    },
    NEUTRAL: {
      label: 'NO DECISION',
      icon: <HelpCircle className="h-3.5 w-3.5" />,
      classes: 'bg-surface-elevated text-text-secondary border-border',
    },
  };

  const config = configs[status] || configs.NEUTRAL;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider font-sans shadow-sm',
        config.classes,
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
};
