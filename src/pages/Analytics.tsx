import React from 'react';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useAttendance } from '@/providers/AttendanceProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TacticalLoader } from '@/components/ui/Loading';
import { AnalyticsOverview } from '@/components/analytics/AnalyticsOverview';
import { AttendanceTrendChart } from '@/components/analytics/AttendanceTrendChart';
import { SubjectAnalyticsCard } from '@/components/analytics/SubjectAnalyticsCard';
import { ComponentAnalyticsCard } from '@/components/analytics/ComponentAnalyticsCard';
import { MissedClassAnalysisCard } from '@/components/analytics/MissedClassAnalysisCard';
import { PeriodComparisonCard } from '@/components/analytics/PeriodComparisonCard';
import { AttendanceConsistencyCard } from '@/components/analytics/AttendanceConsistencyCard';
import { AttendanceInsightsCard } from '@/components/analytics/AttendanceInsightsCard';
import { PeriodFilterOption } from '@/lib/analytics';
import { Link } from 'react-router-dom';
import { TrendingUp, Filter, Plus, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Analytics: React.FC = () => {
  const { subjects } = useAttendance();
  const {
    viewModel,
    selectedPeriod,
    setSelectedPeriod,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedComponentType,
    setSelectedComponentType,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    isLoading,
  } = useAnalyticsData();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader title="Attendance Analytics" description="Calculating historical progression..." />
        <div className="flex items-center justify-center py-8">
          <TacticalLoader message="Crunching Subject Analytics & Trends..." size="md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-36 col-span-4 rounded-2xl" />
          <Skeleton className="h-72 col-span-4 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!viewModel.hasAttendanceData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Attendance Analytics"
          description="Historical attendance progression and behavioral insights."
        />

        <div className="py-12">
          <EmptyState
            title="No attendance history yet"
            description="Start marking your classes on the dashboard or import attendance to unlock analytical trends, component breakdowns, and stability scores."
            icon={<TrendingUp className="h-8 w-8 text-brand" />}
            action={
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/app">
                  <Button className="flex items-center gap-1.5 cursor-pointer">
                    <Plus className="h-4 w-4" /> Go to Dashboard & Mark Classes
                  </Button>
                </Link>
                <Link to="/app/history">
                  <Button variant="secondary" className="flex items-center gap-1.5 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 text-brand" /> View History
                  </Button>
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Analytics"
        description="Historical attendance progression, component insights, and behavioral trends."
      />

      {/* Filter Control Bar */}
      <Card className="p-4 border-border/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-brand" />
            <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Analytics Filters
            </span>
          </div>

          {/* Period Selection Buttons */}
          <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-lg overflow-x-auto max-w-full">
            {(
              [
                { label: '7 Days', value: '7d' },
                { label: '14 Days', value: '14d' },
                { label: '30 Days', value: '30d' },
                { label: 'Semester', value: 'SEMESTER' },
                { label: 'Custom', value: 'CUSTOM' },
              ] as { label: string; value: PeriodFilterOption }[]
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedPeriod(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-bold font-mono transition-colors cursor-pointer whitespace-nowrap',
                  selectedPeriod === opt.value
                    ? 'bg-brand text-white'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Selectors (Subject, Component, Custom Dates) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40 text-xs font-mono">
          {/* Subject Filter */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">
              Subject Filter
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full h-8 px-2 rounded border border-border bg-surface text-text-primary focus:outline-none focus:border-brand"
            >
              <option value="ALL">All Subjects ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Component Filter */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">
              Component Type
            </label>
            <select
              value={selectedComponentType}
              onChange={(e) => setSelectedComponentType(e.target.value)}
              className="w-full h-8 px-2 rounded border border-border bg-surface text-text-primary focus:outline-none focus:border-brand"
            >
              <option value="ALL">All Components</option>
              <option value="THEORY">Theory / Lecture</option>
              <option value="LAB">Lab / Practical</option>
              <option value="TUT">Tutorial</option>
              <option value="PP">PP</option>
              <option value="PR">PR</option>
            </select>
          </div>

          {/* Custom Date Range (if selected) */}
          {selectedPeriod === 'CUSTOM' ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full h-8 px-2 rounded border border-border bg-surface text-text-primary text-xs"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full h-8 px-2 rounded border border-border bg-surface text-text-primary text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-end justify-end">
              <span className="text-[10px] text-text-muted">
                Showing data for active semester
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* 1. Header Overview Metrics */}
      <AnalyticsOverview viewModel={viewModel} />

      {/* 2. Attendance Progression Trend Chart */}
      <AttendanceTrendChart
        trendPoints={viewModel.cumulativeTrend}
        threshold={viewModel.threshold}
      />

      {/* 3. Subject Comparison */}
      <SubjectAnalyticsCard
        subjects={viewModel.subjectAnalytics}
        threshold={viewModel.threshold}
      />

      {/* 4. Component Breakdown */}
      <ComponentAnalyticsCard
        components={viewModel.componentAnalytics}
        threshold={viewModel.threshold}
      />

      {/* 5. Missed Class Analysis */}
      <MissedClassAnalysisCard summary={viewModel.missedSummary} />

      {/* 6. Period Comparison & Consistency Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PeriodComparisonCard comparison={viewModel.periodComparison} />
        <AttendanceConsistencyCard consistency={viewModel.consistency} />
      </div>

      {/* 7. Attendance Behavioral Insights */}
      <AttendanceInsightsCard insights={viewModel.insights} />
    </div>
  );
};
