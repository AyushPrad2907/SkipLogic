import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className,
}) => {
  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 border-dashed border-border/85 max-w-lg mx-auto py-12',
        className
      )}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-elevated text-text-secondary border border-border mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-text-primary">{title}</h3>
      <p className="text-sm text-text-secondary mt-2 mb-6 max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </Card>
  );
};
