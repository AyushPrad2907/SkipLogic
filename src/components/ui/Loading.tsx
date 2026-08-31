import React from 'react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  message?: string;
  subMessage?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fullScreen?: boolean;
}

/**
 * Apex-tier signature tactical radar & orbital loading animation for SkipLogic.
 * Pure CSS / GPU accelerated, 60fps, responsive on all devices.
 */
export const TacticalLoader: React.FC<LoaderProps> = ({
  message = 'Calculating Trajectories...',
  subMessage,
  size = 'md',
  className,
  fullScreen = false,
}) => {
  const sizeMap = {
    sm: { container: 'h-10 w-10', ring1: 'h-10 w-10', ring2: 'h-7 w-7', core: 'h-2.5 w-2.5', text: 'text-xs' },
    md: { container: 'h-16 w-16', ring1: 'h-16 w-16', ring2: 'h-11 w-11', core: 'h-3.5 w-3.5', text: 'text-sm' },
    lg: { container: 'h-24 w-24', ring1: 'h-24 w-24', ring2: 'h-16 w-16', core: 'h-5 w-5', text: 'text-base' },
    xl: { container: 'h-32 w-32', ring1: 'h-32 w-32', ring2: 'h-20 w-20', core: 'h-7 w-7', text: 'text-lg' },
  };

  const s = sizeMap[size];

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-4 select-none', className)}>
      {/* Orbital Tactical Radar Container */}
      <div className={cn('relative flex items-center justify-center', s.container)}>
        {/* Outer Glow Halo */}
        <div className="absolute inset-0 rounded-full bg-brand/20 blur-xl animate-pulse" />

        {/* Outer Orbital Ring (Slow Clockwise) */}
        <div
          className={cn(
            'absolute rounded-full border border-dashed border-brand/40 animate-[spin_6s_linear_infinite]',
            s.ring1
          )}
        />

        {/* Middle Tactical Radar Sweep Arc (Counter Clockwise) */}
        <div
          className={cn(
            'absolute rounded-full border-2 border-transparent border-t-brand border-r-indigo-400 animate-[spin_2s_cubic-bezier(0.4,0,0.2,1)_infinite]',
            s.ring2
          )}
        />

        {/* Core Glowing Orb (Pulsing) */}
        <div className="relative flex items-center justify-center">
          <div
            className={cn(
              'rounded-full bg-gradient-to-tr from-brand via-indigo-500 to-purple-400 shadow-[0_0_15px_rgba(99,102,241,0.7)] animate-ping opacity-75',
              s.core
            )}
          />
          <div
            className={cn(
              'absolute rounded-full bg-gradient-to-tr from-brand to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.9)]',
              s.core
            )}
          />
        </div>
      </div>

      {/* Dynamic Animated Status Text */}
      {message && (
        <div className="text-center space-y-1">
          <p
            className={cn(
              'font-mono font-bold tracking-wider bg-gradient-to-r from-brand via-indigo-400 to-purple-400 bg-clip-text text-transparent animate-pulse',
              s.text
            )}
          >
            {message}
          </p>
          {subMessage && (
            <p className="text-[11px] font-mono text-text-muted tracking-tight">
              {subMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return content;
};

/**
 * Route-level page loader with generous spacing.
 */
export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Synchronizing SkipLogic...' }) => {
  return (
    <div className="flex items-center justify-center w-full min-h-[50vh] py-16">
      <TacticalLoader message={message} size="md" />
    </div>
  );
};
