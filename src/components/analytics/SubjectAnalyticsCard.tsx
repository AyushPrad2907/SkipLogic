import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SubjectAnalyticsItem } from '@/lib/analytics';
import { BookOpen, TrendingUp, TrendingDown, ArrowUpDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type SortOption = 'HIGHEST_ATTENDANCE' | 'LOWEST_ATTENDANCE' | 'MOST_IMPROVED' | 'MOST_DECLINED' | 'MOST_MISSED';

interface SubjectAnalyticsCardProps {
  subjects: SubjectAnalyticsItem[];
  threshold: number;
}

export const SubjectAnalyticsCard: React.FC<SubjectAnalyticsCardProps> = ({ subjects, threshold }) => {
  const [sortBy, setSortBy] = useState<SortOption>('LOWEST_ATTENDANCE');

  if (subjects.length === 0) return null;

  const sortedSubjects = [...subjects].sort((a, b) => {
    const pctA = a.currentPercentage ?? 0;
    const pctB = b.currentPercentage ?? 0;

    if (sortBy === 'HIGHEST_ATTENDANCE') return pctB - pctA;
    if (sortBy === 'LOWEST_ATTENDANCE') return pctA - pctB;
    if (sortBy === 'MOST_IMPROVED') return (b.percentagePointChange ?? -999) - (a.percentagePointChange ?? -999);
    if (sortBy === 'MOST_DECLINED') return (a.percentagePointChange ?? 999) - (b.percentagePointChange ?? 999);
    if (sortBy === 'MOST_MISSED') return (b.totalDelivered - b.totalAttended) - (a.totalDelivered - a.totalAttended);
    return 0;
  });

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Subject Performance Comparison</h3>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 bg-surface border border-border px-2 py-1 rounded-md text-xs">
          <ArrowUpDown className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-[10px] text-text-secondary font-mono uppercase font-bold">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-transparent text-xs font-mono font-bold text-text-primary focus:outline-none cursor-pointer"
          >
            <option value="LOWEST_ATTENDANCE">Lowest Attendance</option>
            <option value="HIGHEST_ATTENDANCE">Highest Attendance</option>
            <option value="MOST_IMPROVED">Most Improved</option>
            <option value="MOST_DECLINED">Most Declined</option>
            <option value="MOST_MISSED">Most Missed Classes</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {sortedSubjects.map((sub) => {
          const isEligible = (sub.currentPercentage ?? 0) > threshold;
          const isPointChangePositive = (sub.percentagePointChange ?? 0) >= 0;

          return (
            <div key={sub.subjectId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/app/subjects/${sub.subjectId}`}
                    className="font-bold text-text-primary hover:text-brand hover:underline text-sm"
                  >
                    {sub.subjectName}
                  </Link>
                  {sub.subjectCode && (
                    <span className="font-mono text-[10px] text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded border border-border/60 uppercase">
                      {sub.subjectCode}
                    </span>
                  )}
                  <Badge
                    variant={
                      sub.trend === 'IMPROVING'
                        ? 'safe'
                        : sub.trend === 'DECLINING'
                        ? 'danger'
                        : sub.trend === 'STABLE'
                        ? 'risk'
                        : 'neutral'
                    }
                    className="text-[9px] font-mono uppercase font-bold py-0"
                  >
                    {sub.trend}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-text-secondary text-[11px]">
                  <span>
                    Delivered: <strong className="font-mono text-text-primary">{sub.totalAttended} / {sub.totalDelivered}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Missed: <strong className="font-mono text-danger">{sub.totalDelivered - sub.totalAttended}</strong>
                  </span>
                  {sub.strongestComponent && (
                    <>
                      <span>•</span>
                      <span className="text-safe text-[10px]">
                        Strongest: <strong>{sub.strongestComponent.name} ({sub.strongestComponent.percentage}%)</strong>
                      </span>
                    </>
                  )}
                  {sub.weakestComponent && sub.weakestComponent.name !== sub.strongestComponent?.name && (
                    <>
                      <span>•</span>
                      <span className="text-danger text-[10px]">
                        Weakest: <strong>{sub.weakestComponent.name} ({sub.weakestComponent.percentage}%)</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Attendance % and Percentage Point Change */}
              <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                <div className="text-left sm:text-right">
                  <div
                    className={cn(
                      'text-lg font-mono font-black',
                      isEligible ? 'text-safe' : 'text-danger'
                    )}
                  >
                    {sub.currentPercentage !== null ? `${sub.currentPercentage.toFixed(2)}%` : '—'}
                  </div>

                  <div className="text-[10px] font-mono">
                    {sub.percentagePointChange !== null ? (
                      <span
                        className={cn(
                          'font-bold flex items-center justify-end gap-0.5',
                          isPointChangePositive ? 'text-safe' : 'text-danger'
                        )}
                      >
                        {isPointChangePositive ? (
                          <TrendingUp className="h-3 w-3 inline" />
                        ) : (
                          <TrendingDown className="h-3 w-3 inline" />
                        )}
                        {isPointChangePositive ? '+' : ''}
                        {sub.percentagePointChange} pts
                      </span>
                    ) : (
                      <span className="text-text-muted">No prior baseline</span>
                    )}
                  </div>
                </div>

                <Link
                  to={`/app/subjects/${sub.subjectId}`}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
