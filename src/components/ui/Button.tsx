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
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96] cursor-pointer select-none',
          // Variants
          variant === 'primary' &&
            'bg-brand text-white hover:bg-brand/90 hover:shadow-[0_0_20px_rgba(0,210,255,0.35)] border border-brand/40 shadow-sm font-semibold',
          variant === 'secondary' &&
            'bg-surface text-text-primary border border-border hover:bg-surface-elevated hover:border-brand/30 shadow-xs',
          variant === 'danger' &&
            'bg-danger text-white hover:bg-danger/90 hover:shadow-[0_0_20px_rgba(255,51,102,0.35)] border border-danger/40 shadow-sm font-semibold',
          variant === 'ghost' &&
            'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
          // Sizes
          size === 'sm' && 'h-8 px-3 text-xs gap-1.5',
          size === 'md' && 'h-10 px-4 text-sm gap-2',
          size === 'lg' && 'h-12 px-6 text-base gap-2.5',
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
