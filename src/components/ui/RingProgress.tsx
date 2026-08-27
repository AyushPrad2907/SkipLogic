import React from 'react';
import { cn } from '@/lib/utils';
import { AttendanceStatus } from '@/types';

interface RingProgressProps {
  value: number; // percentage (0 - 100)
  label?: string;
  subLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: AttendanceStatus;
  className?: string;
}

export const RingProgress: React.FC<RingProgressProps> = ({
  value,
  label,
  subLabel,
  size = 'md',
  status = 'NEUTRAL',
  className,
}) => {
  // Map size label to dimensions
  const dimensions = {
    sm: { sizePx: 64, strokeWidth: 5 },
    md: { sizePx: 120, strokeWidth: 8 },
    lg: { sizePx: 160, strokeWidth: 10 },
  };

  const { sizePx, strokeWidth } = dimensions[size];
  const radius = (sizePx - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeValue = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (safeValue / 100) * circumference;

  // Determine status color
  const statusColors = {
    SAFE: 'text-safe stroke-safe',
    RISKY: 'text-risk stroke-risk',
    MUST_ATTEND: 'text-danger stroke-danger',
    NEUTRAL: 'text-brand stroke-brand',
  };

  const colorClass = statusColors[status] || statusColors.NEUTRAL;

  return (
    <div className={cn('relative flex flex-col items-center justify-center', className)}>
      <svg width={sizePx} height={sizePx} className="rotate-[-90deg]">
        {/* Track circle */}
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          className="stroke-border fill-transparent"
          strokeWidth={strokeWidth}
        />
        {/* Animated indicator circle */}
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          className={cn('fill-transparent transition-all duration-700 ease-out', colorClass)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {/* Central percentage text */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span
          className={cn(
            'font-mono font-bold text-text-primary',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-lg',
            size === 'lg' && 'text-3xl'
          )}
        >
          {label || `${safeValue.toFixed(1)}%`}
        </span>
        {subLabel && size !== 'sm' && (
          <span className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};
