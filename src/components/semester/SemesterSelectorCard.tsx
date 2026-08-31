import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SemesterRow } from '@/lib/semesters.functions';
import { GraduationCap, Plus, Check, Trash2, Calendar } from 'lucide-react';

interface SemesterSelectorCardProps {
  semesters: SemesterRow[];
  activeSemesterId: string | null;
  onSwitchSemester: (id: string) => Promise<void>;
  onCreateSemester: (input: { name: string; startDate: string; endDate: string; threshold: number }) => Promise<void>;
  onDeleteSemester: (id: string) => Promise<void>;
  showToast: (msg: { title: string; message: string; type: 'success' | 'danger' | 'warning' | 'info' }) => void;
}

export const SemesterSelectorCard: React.FC<SemesterSelectorCardProps> = ({
  semesters,
  activeSemesterId,
  onSwitchSemester,
  onCreateSemester,
  onDeleteSemester,
  showToast,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0]);
  const [threshold, setThreshold] = useState(75);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({ title: 'Validation Error', message: 'Semester name is required.', type: 'danger' });
      return;
    }
    if (!startDate || !endDate) {
      showToast({ title: 'Validation Error', message: 'Start and end dates are required.', type: 'danger' });
      return;
    }
    if (startDate > endDate) {
      showToast({ title: 'Validation Error', message: 'Start date must be on or before end date.', type: 'danger' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateSemester({
        name: name.trim(),
        startDate,
        endDate,
        threshold,
      });
      setIsCreating(false);
      setName('');
      showToast({ title: 'Semester Created', message: `Switched to active semester "${name}".`, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Create Failed', message: err.message || 'Could not create semester.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitch = async (id: string, semName: string) => {
    if (id === activeSemesterId) return;
    setIsSubmitting(true);
    try {
      await onSwitchSemester(id);
      showToast({ title: 'Active Semester Switched', message: `Switched active term to "${semName}".`, type: 'info' });
    } catch (err: any) {
      showToast({ title: 'Switch Failed', message: err.message || 'Could not switch semester.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, semName: string) => {
    if (semesters.length <= 1) {
      showToast({ title: 'Action Prohibited', message: 'Cannot delete the only remaining semester.', type: 'warning' });
      return;
    }

    if (confirm(`Are you sure you want to delete semester "${semName}"? All subjects and timetable data for this term will be lost.`)) {
      setIsSubmitting(true);
      try {
        await onDeleteSemester(id);
        showToast({ title: 'Semester Deleted', message: `Deleted semester "${semName}".`, type: 'info' });
      } catch (err: any) {
        showToast({ title: 'Delete Failed', message: err.message || 'Could not delete semester.', type: 'danger' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4.5 w-4.5 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Academic Semesters ({semesters.length})</h3>
        </div>

        {!isCreating && (
          <Button
            size="sm"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 text-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> New Semester
          </Button>
        )}
      </div>

      {/* New Semester Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="bg-surface-elevated/40 p-4 rounded-lg border border-border/60 space-y-3">
          <h4 className="text-xs font-bold text-text-primary">Create New Semester</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase mb-1">
                Semester Name
              </label>
              <input
                type="text"
                placeholder="e.g. Spring 2027"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-8 px-2.5 rounded border border-border bg-background text-text-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase mb-1">
                Target Threshold (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded border border-border bg-background text-text-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-8 px-2.5 rounded border border-border bg-background text-text-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-8 px-2.5 rounded border border-border bg-background text-text-primary font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="secondary" onClick={() => setIsCreating(false)} type="button">
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              Create & Set Active
            </Button>
          </div>
        </form>
      )}

      {/* Semesters list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {semesters.map((sem) => {
          const isActive = sem.id === activeSemesterId;

          return (
            <div
              key={sem.id}
              className={`p-3.5 rounded-lg border flex flex-col justify-between gap-3 text-xs transition-all ${
                isActive
                  ? 'border-brand bg-brand/10 shadow-sm'
                  : 'border-border/60 bg-surface hover:border-border'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary text-sm line-clamp-1">{sem.name}</span>
                  {isActive ? (
                    <Badge variant="safe" className="font-mono text-[9px] uppercase font-bold py-0">
                      <Check className="h-3 w-3 mr-0.5 inline" /> ACTIVE
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="font-mono text-[9px] py-0">
                      INACTIVE
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-text-muted font-mono text-[11px]">
                  <Calendar className="h-3 w-3" />
                  <span>{sem.start_date} → {sem.end_date}</span>
                </div>

                <div className="text-[11px] text-text-secondary">
                  Target Threshold: <strong className="font-mono text-text-primary">{sem.threshold}%</strong>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                {!isActive ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSwitch(sem.id, sem.name)}
                    disabled={isSubmitting}
                    className="h-7 text-[11px] cursor-pointer"
                  >
                    Switch to Active
                  </Button>
                ) : (
                  <span className="text-[10px] text-brand font-mono font-bold">Current Active Term</span>
                )}

                {semesters.length > 1 && !isActive && (
                  <button
                    onClick={() => handleDelete(sem.id, sem.name)}
                    className="p-1 text-text-muted hover:text-danger rounded cursor-pointer"
                    title="Delete semester"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
