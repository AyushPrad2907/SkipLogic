import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { RingProgress } from '@/components/ui/RingProgress';
import { DecisionCard } from '@/components/dashboard/DecisionCard';
import { cn } from '@/lib/utils';
import {
  Calendar,
  AlertCircle,
  Plus,
  Play,
  RotateCcw,
  CheckCircle,
  Clock
} from 'lucide-react';
import { DayOfWeek } from '@/types';

export const Dashboard: React.FC = () => {
  const {
    subjects,
    timetable,
    logs,
    logAttendance,
    revertAttendanceLog,
    loadMockData,
    settings,
  } = useAttendance();
  const { showToast } = useToast();

  const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const todayIndex = new Date().getDay();
    // Default to MONDAY if today is Sunday/Saturday and no classes exist, just for review
    return days[todayIndex] === 'SUNDAY' || days[todayIndex] === 'SATURDAY' ? 'MONDAY' : days[todayIndex];
  });

  const handleLoadMock = () => {
    loadMockData();
    showToast({
      title: 'Mock Data Initialized',
      message: 'Timetable, subjects, and logs have been set up for testing.',
      type: 'success',
    });
  };

  // Stats Calculations
  const totalDelivered = subjects.reduce((acc, s) => acc + s.totalDelivered, 0);
  const totalAttended = subjects.reduce((acc, s) => acc + s.totalAttended, 0);
  const overallPercentage = totalDelivered > 0 ? (totalAttended / totalDelivered) * 100 : 100;

  const safeSubjects = subjects.filter((s) => s.status === 'SAFE').length;
  const dangerSubjects = subjects.filter((s) => s.status === 'MUST_ATTEND').length;

  const getOverallStatus = () => {
    if (overallPercentage >= settings.targetThreshold + 5) return 'SAFE';
    if (overallPercentage >= settings.targetThreshold) return 'RISKY';
    return 'MUST_ATTEND';
  };

  // Filter slots for the selected day
  const dailySlots = timetable.filter((slot) => slot.day === selectedDay);

  // Sort slots by start time
  const sortedSlots = [...dailySlots].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleLog = (subjectId: string, componentType: any, status: 'ATTENDED' | 'BUNKED') => {
    const todayStr = new Date().toISOString().split('T')[0];
    logAttendance(subjectId, componentType, status, todayStr);
    showToast({
      title: status === 'ATTENDED' ? 'Class Attended' : 'Class Bunked',
      message: `Updated logs for ${subjects.find(s => s.id === subjectId)?.name || 'subject'}.`,
      type: status === 'ATTENDED' ? 'success' : 'warning',
    });
  };

  // Render first-use state if empty
  if (subjects.length === 0) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Tactical attendance decision dashboard."
          actions={
            <Button onClick={handleLoadMock} variant="secondary" className="flex items-center gap-1 cursor-pointer">
              <Play className="h-4 w-4" /> Load Mock Data
            </Button>
          }
        />
        
        <div className="py-12">
          <EmptyState
            title="Your attendance engine is ready"
            description="Set up your semester timetable to start calculating buffers and recovery consecutive classes."
            icon={<Calendar className="h-6 w-6 text-brand" />}
            action={
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                <Link to="/app/setup">
                  <Button className="w-full sm:w-auto flex items-center gap-1.5 cursor-pointer">
                    <Plus className="h-4 w-4" /> Import Timetable
                  </Button>
                </Link>
                <Button onClick={handleLoadMock} variant="secondary" className="w-full sm:w-auto cursor-pointer">
                  See Demo Version
                </Button>
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
        title={settings.name || 'Dashboard'}
        description="Attendance decisions and semester metrics overview."
        actions={
          <Link to="/app/setup">
            <Button size="sm" className="flex items-center gap-1 cursor-pointer">
              <Plus className="h-4 w-4" /> Setup Wizard
            </Button>
          </Link>
        }
      />

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Main Stats Gauge */}
        <Card className="flex items-center justify-between p-4 col-span-1 sm:col-span-2 border-border/80">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              Overall Attendance
            </span>
            <h3 className="text-2xl font-bold font-sans mt-1">
              {totalAttended} / {totalDelivered} classes
            </h3>
            <p className="text-xs text-text-muted mt-2">
              Target threshold is <span className="font-mono font-bold text-brand">{settings.targetThreshold}%</span>.
            </p>
          </div>
          <RingProgress
            value={overallPercentage}
            status={getOverallStatus()}
            size="md"
            className="shrink-0"
          />
        </Card>

        <StatCard
          title="Safe Buffers"
          value={safeSubjects}
          description="Subjects where you can skip at least 1 class safely."
          status="SAFE"
          icon={<CheckCircle className="h-5 w-5 text-safe" />}
        />

        <StatCard
          title="Must Attend"
          value={dangerSubjects}
          description="Subjects below target. Recovery is required."
          status="MUST_ATTEND"
          icon={<AlertCircle className="h-5 w-5 text-danger" />}
        />
      </div>

      {/* Primary Section: Today's Decisions */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Today's Class Schedule</h2>
            <p className="text-xs text-text-secondary">Select weekday to audit different schedules.</p>
          </div>

          {/* Weekday Selection Bar */}
          <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-lg overflow-x-auto max-w-full">
            {(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as DayOfWeek[]).map((day) => {
              const count = timetable.filter((s) => s.day === day).length;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-[10px] font-bold font-mono tracking-wider transition-colors cursor-pointer',
                    selectedDay === day
                      ? 'bg-brand text-white'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  )}
                >
                  {day.slice(0, 3)}
                  {count > 0 && (
                    <span className="ml-1 rounded-full bg-surface-elevated text-text-secondary border border-border/50 text-[9px] px-1 font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {sortedSlots.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed border-border/60">
            <Clock className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm font-bold text-text-secondary">No slots scheduled for {selectedDay.toLowerCase()}</p>
            <p className="text-xs text-text-muted mt-1 max-w-xs">
              Go to the Timetable tab to populate classes for this day.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSlots.map((slot) => {
              const subject = subjects.find((s) => s.id === slot.subjectId);
              if (!subject) return null;

              // Calculate ifAttended and ifSkipped percentages in real-time
              const currentAttended = subject.totalAttended;
              const currentDelivered = subject.totalDelivered;
              const ifAttended = ((currentAttended + 1) / (currentDelivered + 1)) * 100;
              const ifSkipped = (currentAttended / (currentDelivered + 1)) * 100;

              return (
                <DecisionCard
                  key={slot.id}
                  subjectName={slot.subjectName}
                  subjectCode={slot.subjectCode}
                  componentType={slot.componentType}
                  time={`${slot.startTime} - ${slot.endTime}`}
                  currentPercentage={subject.currentPercentage}
                  ifAttendedPercentage={ifAttended}
                  ifSkippedPercentage={ifSkipped}
                  recommendation={subject.status}
                  onLogAttendance={(status) => handleLog(slot.subjectId, slot.componentType, status)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Grid: Recent Activity Log */}
      {logs.length > 0 && (
        <Card className="p-4 border-border/80">
          <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-secondary" />
              <h3 className="text-sm font-bold">Recent Attendance Updates</h3>
            </div>
            <span className="text-[10px] text-text-muted font-mono">Real-time Local Logs</span>
          </div>

          <div className="divide-y divide-border/40 max-h-56 overflow-y-auto pr-1">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      log.status === 'ATTENDED' && 'bg-safe',
                      log.status === 'BUNKED' && 'bg-danger',
                      log.status === 'CANCELLED' && 'bg-text-muted'
                    )}
                  />
                  <div>
                    <span className="font-semibold text-text-primary">{log.subjectName}</span>
                    <span className="text-text-muted ml-1 font-mono uppercase text-[9px] bg-surface-elevated border border-border px-1 py-0.5 rounded">
                      {log.componentType}
                    </span>
                    <span className="text-text-secondary ml-2 font-mono">{log.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-mono font-bold text-[10px] px-1.5 py-0.5 rounded uppercase border',
                      log.status === 'ATTENDED' && 'bg-safe-muted border-safe/25 text-safe',
                      log.status === 'BUNKED' && 'bg-danger-muted border-danger/25 text-danger',
                      log.status === 'CANCELLED' && 'bg-surface-hover border-border text-text-muted'
                    )}
                  >
                    {log.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      revertAttendanceLog(log.id);
                      showToast({
                        title: 'Log Undone',
                        message: `Reverted attendance entry for ${log.subjectName}.`,
                        type: 'info',
                      });
                    }}
                    className="h-7 w-7 p-0 hover:bg-surface-elevated text-text-muted hover:text-text-primary rounded cursor-pointer"
                    title="Revert update"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
