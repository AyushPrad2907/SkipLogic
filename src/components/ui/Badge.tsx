import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'safe' | 'risk' | 'danger' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono border transition-all duration-200',
        variant === 'safe' && 'bg-safe-muted text-safe-foreground border-safe/30 dark:text-safe-foreground dark:bg-safe-muted dark:border-safe/30',
        variant === 'risk' && 'bg-risk-muted text-risk-foreground border-risk/30 dark:text-risk-foreground dark:bg-risk-muted dark:border-risk/30',
        variant === 'danger' && 'bg-danger-muted text-danger-foreground border-danger/30 dark:text-danger-foreground dark:bg-danger-muted dark:border-danger/30',
        variant === 'neutral' && 'bg-surface-elevated text-text-secondary border-border',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
