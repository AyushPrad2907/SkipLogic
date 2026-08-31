import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, shimmer = true, ...props }) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-surface-elevated/70 border border-border/40',
        shimmer
          ? 'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent'
          : 'animate-pulse',
        className
      )}
      {...props}
    />
  );
};

