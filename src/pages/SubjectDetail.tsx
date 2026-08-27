import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RingProgress } from '@/components/ui/RingProgress';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ChevronLeft,
  Trash2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Sparkles,
  Calculator,
  Compass
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateSubjectStats } from '@/providers/AttendanceProvider';

export const SubjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { subjects, deleteSubject, logs, revertAttendanceLog, logAttendance } = useAttendance();

  // Find subject
  const subject = subjects.find((s) => s.id === id);

  // Local state for what-if simulation
  const [simAttended, setSimAttended] = useState<number>(0);
  const [simSkipped, setSimSkipped] = useState<number>(0);

  if (!subject) {
    return (
      <div className="py-12">
        <EmptyState
          title="Subject not found"
          description="The subject ID requested is invalid or has been deleted."
          icon={<AlertTriangle className="h-6 w-6 text-danger" />}
          action={
            <Link to="/app/subjects">
              <Button className="flex items-center gap-1 cursor-pointer">
                <ChevronLeft className="h-4 w-4" /> Back to Subjects
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  // Handle deletion
  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${subject.name}? This will clear all timetable slots and logged history for it.`)) {
      deleteSubject(subject.id);
      showToast({
        title: 'Subject Deleted',
        message: `Successfully removed ${subject.name} and related configuration.`,
        type: 'warning',
      });
      navigate('/app/subjects');
    }
  };

  // Filter logs for this subject
  const subjectLogs = logs.filter((log) => log.subjectId === subject.id);

  // What-if simulator calculations
  const totalAttendedSim = subject.totalAttended + simAttended;
  const totalDeliveredSim = subject.totalDelivered + simAttended + simSkipped;
  const simulatedPercentage = totalDeliveredSim > 0 ? (totalAttendedSim / totalDeliveredSim) * 100 : 100;

  // Recalculate stats on simulated numbers
  const simulatedSubject = calculateSubjectStats(
    {
      ...subject,
      totalAttended: totalAttendedSim,
      totalDelivered: totalDeliveredSim,
    },
    subject.targetThreshold
  );

  // Semester Prediction (Assuming double current classes left)
  const remainingExpectedDelivered = 15;
  const predictedEndDelivered = subject.totalDelivered + remainingExpectedDelivered;
  // If we assume a constant attendance rate:
  const predictedEndAttended = subject.totalDelivered > 0
    ? Math.round((subject.totalAttended / subject.totalDelivered) * predictedEndDelivered)
    : remainingExpectedDelivered;
  const predictedEndPercentage = predictedEndDelivered > 0 ? (predictedEndAttended / predictedEndDelivered) * 100 : 100;

  const badgeVariants = {
    SAFE: 'safe' as const,
    RISKY: 'risk' as const,
    MUST_ATTEND: 'danger' as const,
    NEUTRAL: 'neutral' as const,
  };

  return (
    <div className="space-y-6">
      {/* Page Header with delete action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link to="/app/subjects">
            <Button variant="ghost" className="h-9 w-9 p-0 rounded-lg border border-border cursor-pointer">
              <ChevronLeft className="h-5 w-5 text-text-secondary" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color || '#94a3b8' }} />
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{subject.name}</h1>
            </div>
            {subject.code && (
              <p className="text-xs text-text-muted font-mono uppercase mt-0.5 tracking-wider">
                Course Code: {subject.code}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" onClick={handleDelete} className="h-9 text-text-muted hover:text-danger hover:bg-danger-muted/10 border border-transparent hover:border-danger/20 flex items-center gap-1.5 cursor-pointer">
          <Trash2 className="h-4 w-4" /> Delete Course
        </Button>
      </div>

      {/* Grid: Primary Stats Indicator & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Ring Progress Card */}
        <Card className="flex flex-col items-center justify-center p-6 text-center border-border/80 md:col-span-1">
          <RingProgress
            value={subject.currentPercentage}
            status={subject.status}
            size="lg"
            subLabel="Overall"
          />
          <div className="mt-4">
            <span className="text-xs text-text-secondary">Current Score:</span>
            <div className="font-mono text-2xl font-bold mt-0.5">
              {subject.totalAttended} / {subject.totalDelivered} <span className="text-text-muted text-xs">classes</span>
            </div>
          </div>
        </Card>

        {/* Tactical Recommendation Info */}
        <Card className="p-6 md:col-span-2 space-y-4 border-border/80">
          <div className="flex items-start justify-between border-b border-border/40 pb-3">
            <div>
              <span className="text-xs font-mono uppercase text-text-secondary tracking-wide">SkipLogic Decision</span>
              <h3 className="text-base font-bold text-text-primary mt-0.5">Boundary Diagnosis</h3>
            </div>
            <Badge variant={badgeVariants[subject.status]} className="text-xs uppercase tracking-wide">
              {subject.status === 'SAFE' && 'Buffer Available'}
              {subject.status === 'RISKY' && 'Risk boundary'}
              {subject.status === 'MUST_ATTEND' && 'Deficit recovery'}
              {subject.status === 'NEUTRAL' && 'No logs yet'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-elevated/40 p-3 rounded-lg border border-border/30">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Safe Bunk Limit</span>
              <div className="font-mono text-xl font-bold text-safe mt-1">
                {subject.bunkLimit} {subject.bunkLimit === 1 ? 'class' : 'classes'}
              </div>
              <p className="text-[10px] text-text-secondary mt-1 leading-normal">
                You can miss these upcoming classes consecutively and still stay above {subject.targetThreshold}%.
              </p>
            </div>

            <div className="bg-surface-elevated/40 p-3 rounded-lg border border-border/30">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Recovery Required</span>
              <div className={cn('font-mono text-xl font-bold mt-1', subject.recoveryRequired > 0 ? 'text-danger' : 'text-text-muted')}>
                {subject.recoveryRequired} {subject.recoveryRequired === 1 ? 'class' : 'classes'}
              </div>
              <p className="text-[10px] text-text-secondary mt-1 leading-normal">
                Consecutive lectures you must attend to pull attendance back up to {subject.targetThreshold}%.
              </p>
            </div>
          </div>

          {/* Quick manual logging from page */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-text-secondary">Log attendance for today:</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const todayStr = new Date().toISOString().split('T')[0];
                logAttendance(subject.id, 'LECTURE', 'ATTENDED', todayStr);
                showToast({ title: 'Logged Attended', message: 'Calculated attendance updated.', type: 'success' });
              }}
              className="h-8 text-xs text-safe border-safe/20 hover:bg-safe-muted cursor-pointer"
            >
              Attended
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const todayStr = new Date().toISOString().split('T')[0];
                logAttendance(subject.id, 'LECTURE', 'BUNKED', todayStr);
                showToast({ title: 'Logged Bunked', message: 'Calculated buffer updated.', type: 'warning' });
              }}
              className="h-8 text-xs text-danger border-danger/20 hover:bg-danger-muted cursor-pointer"
            >
              Bunked
            </Button>
          </div>
        </Card>
      </div>

      {/* Grid: What-If Simulator & Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Interactive What-If Simulator */}
        <Card className="p-5 border-border/80 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3 mb-1">
            <Calculator className="h-4.5 w-4.5 text-brand" /> What-If Simulator
          </h3>
          <p className="text-xs text-text-secondary">
            Simulate attending or skipping future classes to preview percentage boundary changes.
          </p>

          <div className="space-y-4 pt-2">
            {/* Simulate Attending */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-text-secondary font-medium">Future Classes to Attend:</span>
                <span className="font-mono font-bold text-safe">{simAttended}</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={simAttended}
                onChange={(e) => setSimAttended(Number(e.target.value))}
                className="w-full h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-safe"
              />
            </div>

            {/* Simulate Bunking */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-text-secondary font-medium">Future Classes to Skip:</span>
                <span className="font-mono font-bold text-danger">{simSkipped}</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={simSkipped}
                onChange={(e) => setSimSkipped(Number(e.target.value))}
                className="w-full h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-danger"
              />
            </div>

            {/* Simulated Output Panel */}
            <div className="bg-surface-elevated/40 p-3 rounded-lg border border-border/50 flex items-center justify-between mt-4">
              <div>
                <span className="text-[10px] text-text-muted uppercase font-mono tracking-wider font-semibold">Simulated Outcome</span>
                <div className="font-mono text-2xl font-bold mt-0.5">
                  {simulatedPercentage.toFixed(1)}%
                </div>
                <span className="text-[9px] text-text-secondary mt-1 block font-mono">
                  {totalAttendedSim} / {totalDeliveredSim} classes
                </span>
              </div>
              
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant={badgeVariants[simulatedSubject.status]} className="text-[10px] uppercase font-bold tracking-wider">
                  {simulatedSubject.status === 'SAFE' && 'SAFE BUNK'}
                  {simulatedSubject.status === 'RISKY' && 'RISK LINE'}
                  {simulatedSubject.status === 'MUST_ATTEND' && 'MUST ATTEND'}
                  {simulatedSubject.status === 'NEUTRAL' && 'NEUTRAL'}
                </Badge>
                {(simAttended > 0 || simSkipped > 0) && (
                  <button
                    onClick={() => {
                      setSimAttended(0);
                      setSimSkipped(0);
                    }}
                    className="text-[10px] text-brand hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset Sim
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Semester Predictions & Subject details */}
        <Card className="p-5 border-border/80 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border pb-3 mb-1">
            <Compass className="h-4.5 w-4.5 text-brand" /> Semester Prediction
          </h3>
          <p className="text-xs text-text-secondary">
            Predictive estimates of attendance based on your current run rate.
          </p>

          <div className="space-y-3.5 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Current Attendance Run Rate:</span>
              <span className="font-mono font-bold">{subject.currentPercentage.toFixed(1)}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Predicted End of Semester Classes:</span>
              <span className="font-mono font-bold text-text-primary">{predictedEndDelivered} total</span>
            </div>

            <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
              <span className="text-text-secondary font-semibold">Predicted Outcome:</span>
              <span className={cn(
                'font-mono font-bold text-base',
                predictedEndPercentage >= subject.targetThreshold ? 'text-safe' : 'text-danger'
              )}>
                {predictedEndPercentage.toFixed(1)}%
              </span>
            </div>

            <div className="bg-surface-elevated/40 p-2.5 rounded-lg border border-border/30 mt-2 text-[10px] text-text-muted flex items-start gap-2 leading-relaxed">
              <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5 animate-pulse" />
              <span>
                Based on historical patterns, you are estimated to finish this course above your threshold. Keep maintaining the current attendance rate.
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* History Log */}
      {subjectLogs.length > 0 && (
        <Card className="p-4 border-border/80">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-3">
            <Clock className="h-4 w-4 text-text-secondary" />
            <h3 className="text-sm font-bold">Course Logs</h3>
          </div>
          <div className="divide-y divide-border/40 max-h-56 overflow-y-auto pr-1">
            {subjectLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      log.status === 'ATTENDED' && 'bg-safe',
                      log.status === 'BUNKED' && 'bg-danger',
                      log.status === 'CANCELLED' && 'bg-text-muted'
                    )}
                  />
                  <div>
                    <span className="font-semibold text-text-primary uppercase tracking-wide font-mono text-[10px] bg-surface-elevated border px-1 rounded mr-1">{log.componentType}</span>
                    <span className="text-text-muted">{log.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-mono text-[10px] font-bold border rounded px-1.5 uppercase',
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
                      showToast({ title: 'Reverted Entry', message: 'Log has been deleted.', type: 'info' });
                    }}
                    className="h-7 w-7 p-0 hover:bg-surface-elevated text-text-muted hover:text-text-primary rounded cursor-pointer"
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
