import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { CumulativeTrendPoint } from '@/lib/analytics';
import { TrendingUp, Info } from 'lucide-react';

interface AttendanceTrendChartProps {
  trendPoints: CumulativeTrendPoint[];
  threshold: number;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({
  trendPoints,
  threshold,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (trendPoints.length === 0) {
    return (
      <Card className="p-6 border-border/80 text-center space-y-2">
        <TrendingUp className="h-8 w-8 text-text-muted mx-auto" />
        <h4 className="text-sm font-bold text-text-primary">No Attendance Progression Data</h4>
        <p className="text-xs text-text-muted max-w-sm mx-auto">
          Start marking classes or import your attendance log to generate trend visualizations over time.
        </p>
      </Card>
    );
  }

  // Chart dimensions & scaling
  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const yMin = 0;
  const yMax = 100;

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return padding.top + chartHeight - ((clamped - yMin) / (yMax - yMin)) * chartHeight;
  };

  const getX = (index: number) => {
    if (trendPoints.length === 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (trendPoints.length - 1)) * chartWidth;
  };

  // Generate SVG polyline path
  const pointsString = trendPoints
    .map((p, idx) => {
      const val = p.cumulativePercentage ?? 0;
      return `${getX(idx)},${getY(val)}`;
    })
    .join(' ');

  const thresholdY = getY(threshold);

  const hoveredPoint = hoveredIndex !== null ? trendPoints[hoveredIndex] : null;

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-brand" />
            Cumulative Attendance Progression
          </h3>
          <p className="text-xs text-text-secondary">
            Derived from raw SUM(attended) / SUM(delivered) logs over time.
          </p>
        </div>
        <span className="text-xs font-mono text-brand font-bold">
          Target: {threshold}%
        </span>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-64 select-none font-mono text-[10px]"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-border/40"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-text-muted text-[9px]"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Threshold reference line */}
          <line
            x1={padding.left}
            y1={thresholdY}
            x2={width - padding.right}
            y2={thresholdY}
            stroke="var(--color-brand, #6366f1)"
            strokeWidth="1.5"
            strokeDasharray="5 5"
          />
          <text
            x={width - padding.right + 4}
            y={thresholdY + 3}
            fill="var(--color-brand, #6366f1)"
            className="font-bold text-[9px]"
          >
            {threshold}%
          </text>

          {/* Cumulative Trend Line */}
          <polyline
            fill="none"
            stroke="var(--color-brand, #6366f1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsString}
          />

          {/* Data Points */}
          {trendPoints.map((p, idx) => {
            const cx = getX(idx);
            const cy = getY(p.cumulativePercentage ?? 0);
            const isHovered = hoveredIndex === idx;
            const isEligible = (p.cumulativePercentage ?? 0) > threshold;

            return (
              <g key={p.date}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  fill={isEligible ? 'var(--color-safe, #10b981)' : 'var(--color-danger, #ef4444)'}
                  stroke="var(--color-surface, #1e293b)"
                  strokeWidth="2"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* X-axis date labels */}
                {trendPoints.length <= 10 || idx % Math.ceil(trendPoints.length / 8) === 0 ? (
                  <text
                    x={cx}
                    y={height - padding.bottom + 16}
                    textAnchor="middle"
                    fill="currentColor"
                    className="text-text-muted text-[8px]"
                  >
                    {p.date.slice(5)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Info Tooltip Banner */}
      <div className="bg-surface border border-border/60 p-2.5 rounded-md flex items-center justify-between text-xs font-mono min-h-10">
        {hoveredPoint ? (
          <>
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-primary">{hoveredPoint.date}</span>
              <span className="text-text-muted">
                ({hoveredPoint.cumulativeAttended} / {hoveredPoint.cumulativeDelivered} total)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Cumulative Attendance:</span>
              <span
                className={`font-bold font-mono ${
                  (hoveredPoint.cumulativePercentage ?? 0) > threshold
                    ? 'text-safe'
                    : 'text-danger'
                }`}
              >
                {hoveredPoint.cumulativePercentage !== null
                  ? `${hoveredPoint.cumulativePercentage}%`
                  : '—'}
              </span>
            </div>
          </>
        ) : (
          <span className="text-text-muted flex items-center gap-1.5 text-[11px] font-sans italic">
            <Info className="h-3.5 w-3.5 text-brand shrink-0" />
            Hover over any data point to inspect date-specific cumulative attendance.
          </span>
        )}
      </div>
    </Card>
  );
};
