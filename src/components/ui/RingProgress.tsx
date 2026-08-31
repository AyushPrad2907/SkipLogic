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
    SAFE: 'text-safe stroke-safe drop-shadow-[0_0_8px_rgba(0,245,160,0.4)]',
    RISKY: 'text-risk stroke-risk drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]',
    MUST_ATTEND: 'text-danger stroke-danger drop-shadow-[0_0_8px_rgba(255,51,102,0.4)]',
    NEUTRAL: 'text-brand stroke-brand drop-shadow-[0_0_8px_rgba(0,210,255,0.4)]',
  };

  const colorClass = statusColors[status] || statusColors.NEUTRAL;

  return (
    <div className={cn('relative flex flex-col items-center justify-center select-none', className)}>
      <svg width={sizePx} height={sizePx} className="rotate-[-90deg]">
        {/* Ambient Track circle */}
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          className="stroke-border/70 fill-transparent"
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
            'font-mono font-black tracking-tight text-text-primary',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-xl',
            size === 'lg' && 'text-3xl'
          )}
        >
          {label || `${safeValue.toFixed(1)}%`}
        </span>
        {subLabel && size !== 'sm' && (
          <span className="text-[10px] text-text-muted font-mono font-semibold uppercase tracking-widest mt-0.5">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};
