import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50 active:scale-95 cursor-pointer',
          // Variants
          variant === 'primary' && 'bg-brand text-white hover:bg-brand/90 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-brand/50',
          variant === 'secondary' && 'bg-surface text-text-primary border border-border hover:bg-surface-hover hover:border-text-muted/30',
          variant === 'danger' && 'bg-danger text-white hover:bg-danger/90 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-danger/50',
          variant === 'ghost' && 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
          // Sizes
          size === 'sm' && 'h-8 px-3 text-xs',
          size === 'md' && 'h-10 px-4 text-sm',
          size === 'lg' && 'h-12 px-6 text-base',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
