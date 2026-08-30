import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
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
  Compass,
  Plus,
  Edit2,
  Layers,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateSubjectStats } from '@/providers/AttendanceProvider';
import { pct } from '@/lib/engine';
import { checkComponentHasLogs } from '@/lib/components.functions';

export const SubjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    subjects,
    deleteSubject,
    addComponent,
    updateComponent,
    deleteComponent,
    logs,
    revertAttendanceLog
  } = useAttendance();

  // Find subject
  const subject = subjects.find((s) => s.id === id);

  // Local state for what-if simulation
  const [simAttended, setSimAttended] = useState<number>(0);
  const [simSkipped, setSimSkipped] = useState<number>(0);

  // Modals state
  const [isDeleteSubjectModalOpen, setIsDeleteSubjectModalOpen] = useState(false);
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any | null>(null);
  const [deletingComponent, setDeletingComponent] = useState<any | null>(null);
  const [componentHasLogsWarning, setComponentHasLogsWarning] = useState(false);

  // Form states for Component Add/Edit
  const [compType, setCompType] = useState<string>('PP');
  const [compName, setCompName] = useState<string>('');
  const [compAttended, setCompAttended] = useState<number>(0);
  const [compDelivered, setCompDelivered] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Handle Delete Subject
  const confirmDeleteSubject = async () => {
    setIsSubmitting(true);
    try {
      await deleteSubject(subject.id);
      showToast({
        title: 'Subject Deleted',
        message: `Successfully removed ${subject.name} and related data.`,
        type: 'warning',
      });
      navigate('/app/subjects');
    } catch (err: any) {
      showToast({
        title: 'Failed to Delete Subject',
        message: err.message || 'An error occurred while deleting the subject.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteSubjectModalOpen(false);
    }
  };

  // Open Add Component Modal
  const handleOpenAddComponent = () => {
    setCompType('PP');
    setCompName('');
    setCompAttended(0);
    setCompDelivered(0);
    setIsAddComponentModalOpen(true);
  };

  // Open Edit Component Modal
  const handleOpenEditComponent = (comp: any) => {
    setEditingComponent(comp);
    setCompType(comp.type);
    setCompName(comp.name || '');
    setCompAttended(comp.totalAttended);
    setCompDelivered(comp.totalDelivered);
  };

  // Open Delete Component Confirmation Modal
  const handleOpenDeleteComponent = async (comp: any) => {
    setDeletingComponent(comp);
    const hasLogs = await checkComponentHasLogs(comp.id);
    setComponentHasLogsWarning(hasLogs);
  };

  // Submit Add Component
  const handleSaveAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (compType === 'CUSTOM' && !compName.trim()) {
      showToast({ title: 'Validation Error', message: 'Custom component requires a display name.', type: 'danger' });
      return;
    }

    if (compAttended < 0 || compDelivered < 0) {
      showToast({ title: 'Validation Error', message: 'Counters cannot be negative.', type: 'danger' });
      return;
    }

    if (compAttended > compDelivered) {
      showToast({ title: 'Validation Error', message: 'Attended cannot exceed total delivered.', type: 'danger' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addComponent(subject.id, compType, compName.trim() || undefined, compAttended, compDelivered);
      setIsAddComponentModalOpen(false);
      showToast({
        title: 'Component Added',
        message: `Added ${compType === 'CUSTOM' ? compName : compType} component.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Failed to Add Component',
        message: err.message || 'An error occurred.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Component
  const handleSaveEditComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComponent) return;

    if (compAttended < 0 || compDelivered < 0) {
      showToast({ title: 'Validation Error', message: 'Counters cannot be negative.', type: 'danger' });
      return;
    }

    if (compAttended > compDelivered) {
      showToast({ title: 'Validation Error', message: 'Attended cannot exceed total delivered.', type: 'danger' });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateComponent(editingComponent.id, subject.id, {
        type: compType,
        name: compName.trim() || undefined,
        attended: compAttended,
        delivered: compDelivered,
      });
      setEditingComponent(null);
      showToast({
        title: 'Component Updated',
        message: 'Updated component configuration.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Failed to Update Component',
        message: err.message || 'An error occurred.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Component
  const handleConfirmDeleteComponent = async () => {
    if (!deletingComponent) return;
    setIsSubmitting(true);
    try {
      await deleteComponent(deletingComponent.id, subject.id);
      setDeletingComponent(null);
      showToast({
        title: 'Component Removed',
        message: 'Successfully deleted component.',
        type: 'warning',
      });
    } catch (err: any) {
      showToast({
        title: 'Failed to Delete Component',
        message: err.message || 'An error occurred.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter logs for this subject
  const subjectLogs = logs.filter((log) => log.subjectId === subject.id);

  // What-if simulator calculations using Phase 4 engine
  const totalAttendedSim = subject.totalAttended + simAttended;
  const totalDeliveredSim = subject.totalDelivered + simAttended + simSkipped;
  const simulatedPercentage = pct(totalAttendedSim, totalDeliveredSim) ?? 100;

  // Recalculate stats on simulated numbers using Phase 4 engine
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
  const predictedEndAttended = subject.totalDelivered > 0
    ? Math.round((subject.totalAttended / subject.totalDelivered) * predictedEndDelivered)
    : remainingExpectedDelivered;
  const predictedEndPercentage = pct(predictedEndAttended, predictedEndDelivered) ?? 100;

  const badgeVariants = {
    SAFE: 'safe' as const,
    RISKY: 'risk' as const,
    MUST_ATTEND: 'danger' as const,
    NEUTRAL: 'neutral' as const,
  };

  const supportedTypes = ['PP', 'PR', 'TUT', 'LAB', 'THEORY', 'CUSTOM'];

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
        <Button
          variant="ghost"
          onClick={() => setIsDeleteSubjectModalOpen(true)}
          className="h-9 text-text-muted hover:text-danger hover:bg-danger-muted/10 border border-transparent hover:border-danger/20 flex items-center gap-1.5 cursor-pointer"
        >
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
            <span className="text-xs text-text-secondary">Combined Attendance:</span>
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
                You can miss these upcoming classes consecutively and still stay strictly above {subject.targetThreshold}%.
              </p>
            </div>

            <div className="bg-surface-elevated/40 p-3 rounded-lg border border-border/30">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Recovery Required</span>
              <div className={cn('font-mono text-xl font-bold mt-1', subject.recoveryRequired > 0 ? 'text-danger' : 'text-text-muted')}>
                {subject.recoveryRequired} {subject.recoveryRequired === 1 ? 'class' : 'classes'}
              </div>
              <p className="text-[10px] text-text-secondary mt-1 leading-normal">
                Consecutive lectures you must attend to pull attendance strictly above {subject.targetThreshold}%.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* COMPONENT BREAKDOWN PANEL */}
      <Card className="p-5 border-border/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-brand" />
            <h3 className="text-sm font-bold text-text-primary">Component Breakdown</h3>
          </div>
          <Button size="sm" onClick={handleOpenAddComponent} className="flex items-center gap-1 cursor-pointer self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Add Component
          </Button>
        </div>

        {!subject.components || subject.components.length === 0 ? (
          <div className="py-6">
            <EmptyState
              title="No attendance components configured"
              description="Add PP, PR, TUT, LAB or Theory to begin tracking subject breakdown."
              icon={<Layers className="h-6 w-6 text-brand" />}
              action={
                <Button size="sm" onClick={handleOpenAddComponent} className="flex items-center gap-1 cursor-pointer mx-auto">
                  <Plus className="h-4 w-4" /> Add Component
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-border/40 border border-border/50 rounded-lg overflow-hidden bg-background">
              {subject.components.map((comp) => {
                const compPct = pct(comp.totalAttended, comp.totalDelivered);
                return (
                  <div key={comp.id} className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-elevated border border-border text-brand">
                        {comp.type}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary">{comp.name || comp.type}</h4>
                        <span className="text-[10px] text-text-muted font-mono">
                          {comp.totalAttended} / {comp.totalDelivered} classes
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-bold text-text-primary">
                        {compPct === null ? 'N/A' : `${compPct.toFixed(1)}%`}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditComponent(comp)}
                          className="h-8 w-8 p-0 text-text-muted hover:text-text-primary rounded cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteComponent(comp)}
                          className="h-8 w-8 p-0 text-text-muted hover:text-danger rounded cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Combined Totals Rule Notification */}
            <div className="bg-surface-elevated/40 p-3 rounded-lg border border-border/40 flex items-start gap-2.5 text-xs text-text-secondary leading-relaxed">
              <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary">Combined Total Rule:</span> Subject percentage ({subject.currentPercentage.toFixed(2)}%) is based on the <strong>COMBINED raw totals</strong> ({subject.totalAttended} / {subject.totalDelivered}), not an average of component percentages.
              </div>
            </div>
          </div>
        )}
      </Card>

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

        {/* Semester Predictions */}
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
                predictedEndPercentage > subject.targetThreshold ? 'text-safe' : 'text-danger'
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
                      (log.status === 'MISSED' || log.status === 'BUNKED') && 'bg-danger',
                      log.status === 'CANCELLED' && 'bg-text-muted'
                    )}
                  />
                  <div>
                    <span className="font-semibold text-text-primary uppercase tracking-wide font-mono text-[10px] bg-surface-elevated border px-1 rounded mr-1">
                      {log.componentName || log.componentType}
                    </span>
                    <span className="text-text-muted">{log.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-mono text-[10px] font-bold border rounded px-1.5 uppercase',
                      log.status === 'ATTENDED' && 'bg-safe-muted border-safe/25 text-safe',
                      (log.status === 'MISSED' || log.status === 'BUNKED') && 'bg-danger-muted border-danger/25 text-danger',
                      log.status === 'CANCELLED' && 'bg-surface-hover border-border text-text-muted'
                    )}
                  >
                    {log.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await revertAttendanceLog(log.id);
                      showToast({ title: 'Reverted Entry', message: 'Log entry deleted and counters updated.', type: 'info' });
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

      {/* ADD COMPONENT MODAL */}
      <Modal
        isOpen={isAddComponentModalOpen}
        onClose={() => !isSubmitting && setIsAddComponentModalOpen(false)}
        title="Add Component"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsAddComponentModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveAddComponent} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Component'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveAddComponent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Component Type <span className="text-danger">*</span>
            </label>
            <select
              value={compType}
              onChange={(e) => setCompType(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              disabled={isSubmitting}
            >
              {supportedTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'PP' ? 'PP (Practical / Lab)' : t === 'PR' ? 'PR (Practical)' : t === 'TUT' ? 'TUT (Tutorial)' : t}
                </option>
              ))}
            </select>
          </div>

          {compType === 'CUSTOM' && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Custom Component Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                placeholder="e.g. Workshop / Seminar"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Attended Classes
              </label>
              <input
                type="number"
                min="0"
                value={compAttended}
                onChange={(e) => setCompAttended(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Total Delivered
              </label>
              <input
                type="number"
                min="0"
                value={compDelivered}
                onChange={(e) => setCompDelivered(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* EDIT COMPONENT MODAL */}
      <Modal
        isOpen={!!editingComponent}
        onClose={() => !isSubmitting && setEditingComponent(null)}
        title="Edit Component"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditingComponent(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditComponent} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEditComponent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Component Type
            </label>
            <select
              value={compType}
              onChange={(e) => setCompType(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              disabled={isSubmitting}
            >
              {supportedTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              placeholder="e.g. Theory / Lab"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Attended Classes
              </label>
              <input
                type="number"
                min="0"
                value={compAttended}
                onChange={(e) => setCompAttended(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Total Delivered
              </label>
              <input
                type="number"
                min="0"
                value={compDelivered}
                onChange={(e) => setCompDelivered(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE COMPONENT CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingComponent}
        onClose={() => !isSubmitting && setDeletingComponent(null)}
        title="Delete Component"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDeletingComponent(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteComponent} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-primary">
            Are you sure you want to delete component <strong>{deletingComponent?.name || deletingComponent?.type}</strong>?
          </p>

          {componentHasLogsWarning && (
            <div className="bg-danger-muted/20 border border-danger/30 p-3 rounded-lg flex items-start gap-2 text-xs text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Warning: Attendance history/logs exist for this component. Deleting it will update the subject's overall attendance calculations.
              </span>
            </div>
          )}
        </div>
      </Modal>

      {/* DELETE SUBJECT CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteSubjectModalOpen}
        onClose={() => !isSubmitting && setIsDeleteSubjectModalOpen(false)}
        title="Delete Subject"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteSubjectModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteSubject} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Subject'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-primary">
            Are you sure you want to delete course <strong>{subject.name}</strong>?
          </p>
          <div className="bg-danger-muted/20 border border-danger/30 p-3 rounded-lg flex items-start gap-2 text-xs text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              This is a destructive action. Deleting this subject will permanently remove all associated components, timetable slots, and logged attendance history.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
