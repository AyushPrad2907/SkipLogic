import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'glass';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border border-border/90 bg-surface text-text-primary p-5 transition-all duration-200 shadow-sm',
          variant === 'glass' && 'glass-card',
          variant === 'elevated' && 'bg-surface-elevated shadow-lg border-border-subtle',
          variant === 'interactive' && 'hover:bg-surface-hover hover:border-brand/30 hover:shadow-md cursor-pointer active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
