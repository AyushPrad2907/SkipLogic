import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { AttendanceStatus } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  status?: AttendanceStatus;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  status = 'NEUTRAL',
  className,
}) => {
  const statusBorders = {
    SAFE: 'border-safe/30 hover:border-safe/50 shadow-safe/5',
    RISKY: 'border-risk/30 hover:border-risk/50 shadow-risk/5',
    MUST_ATTEND: 'border-danger/30 hover:border-danger/50 shadow-danger/5',
    NEUTRAL: 'border-border hover:border-text-muted/20',
  };

  const statusTexts = {
    SAFE: 'text-safe',
    RISKY: 'text-risk',
    MUST_ATTEND: 'text-danger',
    NEUTRAL: 'text-brand',
  };

  return (
    <Card className={cn('flex flex-col justify-between relative overflow-hidden', statusBorders[status], className)}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            {title}
          </span>
          {/* Use JetBrains Mono for numbers to make them feel tactical */}
          <div className={cn('text-3xl font-bold font-mono mt-1', statusTexts[status])}>
            {value}
          </div>
        </div>
        {icon && (
          <div className={cn('p-2 rounded-lg bg-surface-elevated text-text-secondary border border-border')}>
            {icon}
          </div>
        )}
      </div>
      {description && (
        <p className="text-xs text-text-muted mt-3 border-t border-border/40 pt-2.5 leading-relaxed">
          {description}
        </p>
      )}
    </Card>
  );
};
