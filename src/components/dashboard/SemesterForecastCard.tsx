import React from 'react';
import { Card } from '@/components/ui/Card';
import { SemesterForecastSummary } from '@/lib/dashboardViewModel';
import { TrendingUp, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SemesterForecastCardProps {
  forecast: SemesterForecastSummary;
}

export const SemesterForecastCard: React.FC<SemesterForecastCardProps> = ({ forecast }) => {
  const { currentPercentage, bestPossiblePercentage, worstPossiblePercentage, threshold } = forecast;

  const curr = currentPercentage ?? 0;
  const best = bestPossiblePercentage ?? 100;
  const worst = worstPossiblePercentage ?? 0;

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Semester Trajectory & Forecast</h3>
        </div>
        <span className="text-xs font-mono text-text-muted">Target: {threshold}%</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-surface rounded-lg border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Worst Possible</span>
          <div className="text-base sm:text-lg font-mono font-bold text-danger mt-1">
            {worstPossiblePercentage !== null ? `${worstPossiblePercentage.toFixed(2)}%` : '—'}
          </div>
          <span className="text-[9px] text-text-muted">Miss all remaining</span>
        </div>

        <div className="p-3 bg-surface-elevated rounded-lg border border-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand">Current</span>
          <div className="text-lg sm:text-xl font-mono font-black text-text-primary mt-1">
            {currentPercentage !== null ? `${currentPercentage.toFixed(2)}%` : '—'}
          </div>
          <span className="text-[9px] text-text-muted">Real live state</span>
        </div>

        <div className="p-3 bg-surface rounded-lg border border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-safe">Best Possible</span>
          <div className="text-base sm:text-lg font-mono font-bold text-safe mt-1">
            {bestPossiblePercentage !== null ? `${bestPossiblePercentage.toFixed(2)}%` : '—'}
          </div>
          <span className="text-[9px] text-text-muted">Attend all remaining</span>
        </div>
      </div>

      {/* Visual Trajectory Bar */}
      <div className="space-y-1 pt-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span>0%</span>
          <span className="text-brand font-bold">Threshold ({threshold}%)</span>
          <span>100%</span>
        </div>

        <div className="relative h-6 w-full bg-surface border border-border rounded-lg overflow-hidden p-0.5 flex items-center">
          {/* Threshold reference line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-brand z-20 shadow-[0_0_8px_rgba(var(--brand-rgb),0.8)]"
            style={{ left: `${threshold}%` }}
            title={`Threshold: ${threshold}%`}
          />

          {/* Worst-to-Best Possible Range Bar */}
          <div
            className="absolute top-1 bottom-1 bg-surface-elevated rounded z-0 opacity-80 border border-border"
            style={{ left: `${worst}%`, width: `${Math.max(0, best - worst)}%` }}
          />

          {/* Current Percentage Indicator Pill */}
          <div
            className={cn(
              'absolute top-1 bottom-1 rounded z-10 transition-all duration-300 flex items-center justify-end px-1 text-[9px] font-mono font-bold text-white',
              curr > threshold ? 'bg-safe' : 'bg-danger'
            )}
            style={{ left: `0%`, width: `${Math.min(100, Math.max(4, curr))}%` }}
          >
            {curr >= 12 && `${curr.toFixed(1)}%`}
          </div>
        </div>

        <p className="text-[10px] text-text-muted text-center pt-1">
          {best >= threshold ? (
            <span className="text-safe inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Semester target achievable under optimal attendance.
            </span>
          ) : (
            <span className="text-danger inline-flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Warning: Maximum possible attendance ({best}%) is below target threshold.
            </span>
          )}
        </p>
      </div>
    </Card>
  );
};
