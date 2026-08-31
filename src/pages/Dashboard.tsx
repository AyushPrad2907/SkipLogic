import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { DecisionCard } from '@/components/dashboard/DecisionCard';
import { OverallCommandCenter } from '@/components/dashboard/OverallCommandCenter';
import { SubjectRiskOverview } from '@/components/dashboard/SubjectRiskOverview';
import { RecoveryAlertsCard } from '@/components/dashboard/RecoveryAlertsCard';
import { SafeBunkPlanCard } from '@/components/dashboard/SafeBunkPlanCard';
import { SemesterForecastCard } from '@/components/dashboard/SemesterForecastCard';
import { WhatIfSimulatorCard } from '@/components/dashboard/WhatIfSimulatorCard';
import { TimetableImporter } from '@/components/timetable/TimetableImporter';
import { AttendanceImporter } from '@/components/subjects/AttendanceImporter';
import { cn } from '@/lib/utils';
import {
  Plus,
  Play,
  Clock,
  History,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { DayOfWeek } from '@/types';

export const Dashboard: React.FC = () => {
  const { logs } = useAttendance();
  const {
    viewModel,
    selectedDay,
    setSelectedDay,
    isLoading,
    isError,
    error,
    refetch,
    logAttendance,
    revertAttendanceLog,
    loadMockData,
  } = useDashboardData();
  const { showToast } = useToast();

  const [submittingSlotId, setSubmittingSlotId] = useState<string | null>(null);
  const [isTimetableImporterOpen, setIsTimetableImporterOpen] = useState(false);
  const [isAttendanceImporterOpen, setIsAttendanceImporterOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleLoadMock = () => {
    loadMockData();
    showToast({
      title: 'Mock Data Initialized',
      message: 'Timetable, subjects, and logs have been set up for testing.',
      type: 'success',
    });
  };

  const handleLog = async (
    slotId: string,
    subjectId: string,
    componentType: any,
    status: 'ATTENDED' | 'MISSED',
    componentId?: string
  ) => {
    setSubmittingSlotId(slotId);
    try {
      await logAttendance(subjectId, componentType, status, todayStr, slotId, componentId);
      showToast({
        title: status === 'ATTENDED' ? 'Class Marked Attended' : 'Class Marked Missed',
        message: 'Updated attendance in real-time.',
        type: status === 'ATTENDED' ? 'success' : 'warning',
      });
    } catch (err: any) {
      showToast({
        title: 'Attendance Logging Failed',
        message: err.message || 'Could not update attendance.',
        type: 'danger',
      });
    } finally {
      setSubmittingSlotId(null);
    }
  };

  const handleRevert = async (logId: string, subjectName: string) => {
    try {
      await revertAttendanceLog(logId);
      showToast({
        title: 'Attendance Entry Reverted',
        message: `Unmarked attendance entry for ${subjectName}.`,
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Revert Failed',
        message: err.message || 'Could not revert attendance entry.',
        type: 'danger',
      });
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Loading attendance intelligence command center..." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 col-span-3 rounded-xl" />
          <Skeleton className="h-48 col-span-2 rounded-xl" />
          <Skeleton className="h-48 col-span-1 rounded-xl" />
        </div>
      </div>
    );
  }

  // 2. Recoverable Error State
  if (isError) {
    return (
      <div className="py-12 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-danger mx-auto" />
        <h3 className="text-lg font-bold text-text-primary">Unable to load attendance data</h3>
        <p className="text-xs text-text-secondary max-w-sm mx-auto">
          {error?.message || 'A network error occurred while aggregating dashboard telemetry.'}
        </p>
        <Button onClick={refetch} variant="secondary" className="flex items-center gap-1.5 mx-auto cursor-pointer">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  // 3. Structured Empty States
  if (!viewModel.hasSubjects) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Tactical attendance decision dashboard."
          actions={
            <Button onClick={handleLoadMock} variant="secondary" className="flex items-center gap-1 cursor-pointer">
              <Play className="h-4 w-4" /> Load Mock Demo Data
            </Button>
          }
        />
        <div className="py-12">
          <EmptyState
            title="Add your subjects to start"
            description="Create your subjects or import your timetable to start calculating buffers, threshold safety margins, and recovery plans."
            icon={<BookOpen className="h-6 w-6 text-brand" />}
            action={
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                <Link to="/app/setup">
                  <Button className="w-full sm:w-auto flex items-center gap-1.5 cursor-pointer">
                    <Plus className="h-4 w-4" /> Setup Semester & Subjects
                  </Button>
                </Link>
                <Button
                  onClick={() => setIsTimetableImporterOpen(true)}
                  variant="secondary"
                  className="w-full sm:w-auto flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-brand" /> Import XLSX Timetable
                </Button>
              </div>
            }
          />
        </div>

        <TimetableImporter
          isOpen={isTimetableImporterOpen}
          onClose={() => setIsTimetableImporterOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header & Quick Action Bar */}
      <PageHeader
        title="Dashboard"
        description="Attendance command center & tactical decision intelligence."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsTimetableImporterOpen(true)}
              className="flex items-center gap-1 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" /> Import Timetable
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsAttendanceImporterOpen(true)}
              className="flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-brand" /> Import Attendance
            </Button>

            <Link to="/app/history">
              <Button size="sm" variant="secondary" className="flex items-center gap-1 cursor-pointer">
                <History className="h-3.5 w-3.5" /> History
              </Button>
            </Link>

            <Link to="/app/setup">
              <Button size="sm" className="flex items-center gap-1 cursor-pointer">
                <Plus className="h-3.5 w-3.5" /> Setup
              </Button>
            </Link>
          </div>
        }
      />

      {/* 1. Today's Class Schedule & Decisions (Top Priority for Daily Student Use) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand" /> Today's Class Schedule & Decisions
            </h2>
            <p className="text-xs text-text-secondary">
              Real-time projection if you attend or skip today's classes.
            </p>
          </div>

          {/* Weekday Selection Bar */}
          <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar shrink-0 shadow-sm">
            {(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as DayOfWeek[]).map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all duration-150 active:scale-95 cursor-pointer shrink-0',
                  selectedDay === day
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                )}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {viewModel.todayClasses.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed border-border/60">
            <Clock className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm font-bold text-text-secondary">
              No classes scheduled for {selectedDay.toLowerCase()}
            </p>
            <p className="text-xs text-text-muted mt-1 max-w-xs">
              Go to the Timetable tab or click "Import Timetable" to add classes for this day.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {viewModel.todayClasses.map((item) => (
              <DecisionCard
                key={item.slotId}
                subjectName={item.subjectName}
                subjectCode={item.subjectCode}
                componentType={item.componentType}
                componentName={item.componentName}
                time={`${item.startTime} - ${item.endTime}`}
                room={item.room}
                currentPercentage={item.currentPercentage}
                ifAttendedPercentage={item.ifAttendedPercentage}
                ifSkippedPercentage={item.ifSkippedPercentage}
                recommendation={item.skipImpactRecommendation}
                explanation={item.explanation}
                isMostImportant={item.isMostImportant}
                currentStatus={item.currentStatus}
                isSubmitting={submittingSlotId === item.slotId}
                onLogAttendance={(status) =>
                  handleLog(item.slotId, item.subjectId, item.componentType, status, item.componentId)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. Recovery & Action Needed Alerts */}
      <RecoveryAlertsCard alerts={viewModel.recoveryAlerts} />

      {/* 3. Overall Attendance Command Center */}
      <OverallCommandCenter viewModel={viewModel} />

      {/* 4. Safe Bunk Opportunities */}
      <SafeBunkPlanCard opportunities={viewModel.safeBunkOpportunities} />

      {/* 5. Subject Risk Overview & Prioritization */}
      <SubjectRiskOverview subjects={viewModel.prioritizedSubjects} />

      {/* 6. Semester Forecast & Trajectory + What-If Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SemesterForecastCard forecast={viewModel.semesterForecast} />
        <WhatIfSimulatorCard subjects={viewModel.prioritizedSubjects} />
      </div>

      {/* Recent Attendance Updates Log */}
      {logs.length > 0 && (
        <Card className="p-4 border-border/80 space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-secondary" />
              <h3 className="text-sm font-bold">Recent Attendance Log Updates</h3>
            </div>
            <Link to="/app/history" className="text-xs text-brand hover:underline font-mono font-bold">
              View Full History →
            </Link>
          </div>

          <div className="divide-y divide-border/40 max-h-52 overflow-y-auto pr-1">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      log.status === 'ATTENDED' ? 'bg-safe' : 'bg-danger'
                    )}
                  />
                  <span className="font-bold text-text-primary">{log.subjectName}</span>
                  <span className="text-text-muted text-[10px]">({log.date})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold border',
                      log.status === 'ATTENDED' ? 'bg-safe-muted text-safe border-safe/30' : 'bg-danger-muted text-danger border-danger/30'
                    )}
                  >
                    {log.status}
                  </span>
                  <button
                    onClick={() => handleRevert(log.id, log.subjectName)}
                    className="p-1 text-text-muted hover:text-text-primary rounded cursor-pointer"
                    title="Revert entry"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Importer Modals */}
      <TimetableImporter
        isOpen={isTimetableImporterOpen}
        onClose={() => setIsTimetableImporterOpen(false)}
      />
      <AttendanceImporter
        isOpen={isAttendanceImporterOpen}
        onClose={() => setIsAttendanceImporterOpen(false)}
      />
    </div>
  );
};
