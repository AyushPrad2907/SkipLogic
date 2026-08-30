import React, { useState, useMemo } from 'react';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { AttendanceImporter } from '@/components/subjects/AttendanceImporter';
import { cn } from '@/lib/utils';
import {
  History,
  CheckCircle,
  XCircle,
  Trash2,
  Filter,
  Calendar,
  Clock,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';

export const AttendanceHistory: React.FC = () => {
  const {
    subjects,
    logs,
    updateAttendanceStatus,
    revertAttendanceLog,
  } = useAttendance();
  const { showToast } = useToast();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedSubjectId !== 'ALL' && log.subjectId !== selectedSubjectId) {
        return false;
      }
      if (selectedStatus !== 'ALL' && log.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [logs, selectedSubjectId, selectedStatus]);

  const handleStatusToggle = async (logId: string, currentStatus: string, subjectName: string) => {
    const nextStatus = currentStatus === 'ATTENDED' ? 'MISSED' : 'ATTENDED';
    setIsSubmittingId(logId);
    try {
      await updateAttendanceStatus(logId, nextStatus);
      showToast({
        title: 'Status Updated',
        message: `Updated status to ${nextStatus} for ${subjectName}.`,
        type: nextStatus === 'ATTENDED' ? 'success' : 'warning',
      });
    } catch (err: any) {
      showToast({
        title: 'Update Failed',
        message: err.message || 'Could not update attendance status.',
        type: 'danger',
      });
    } finally {
      setIsSubmittingId(null);
    }
  };

  const handleUnmark = async (logId: string, subjectName: string) => {
    setIsSubmittingId(logId);
    try {
      await revertAttendanceLog(logId);
      showToast({
        title: 'Entry Unmarked',
        message: `Removed attendance log entry for ${subjectName}.`,
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Unmark Failed',
        message: err.message || 'Could not unmark attendance entry.',
        type: 'danger',
      });
    } finally {
      setIsSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance History"
        description="Comprehensive audit trail of all marked classes across your active semester."
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-brand" /> Import Attendance (.xlsx)
          </Button>
        }
      />

      {/* Filter Controls Bar */}
      <Card className="p-4 border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-brand shrink-0" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Filter By:</span>
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} {sub.code ? `(${sub.code})` : ''}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="ALL">All Statuses</option>
            <option value="ATTENDED">Attended Only</option>
            <option value="MISSED">Missed Only</option>
          </select>
        </div>

        <div className="text-xs font-mono text-text-muted">
          Showing <span className="font-bold text-text-primary">{filteredLogs.length}</span> of {logs.length} entries
        </div>
      </Card>

      {/* History Content List */}
      {filteredLogs.length === 0 ? (
        <div className="py-8">
          <EmptyState
            title="No attendance logs found"
            description={
              logs.length === 0
                ? "You haven't marked any classes yet. Use the Today's Classes panel on the Dashboard to record attendance."
                : "No attendance logs match your selected filter criteria."
            }
            icon={<History className="h-6 w-6 text-brand" />}
          />
        </div>
      ) : (
        <Card className="border-border/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-elevated/40 text-text-secondary font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Component</th>
                  <th className="py-3 px-4 font-semibold">Time / Room</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-sans">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-elevated/20 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-text-primary font-bold whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-text-muted" />
                        {log.date}
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-text-primary block">{log.subjectName}</span>
                    </td>

                    {/* Component */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-surface-elevated border border-border text-brand">
                        {log.componentName || log.componentType}
                      </span>
                    </td>

                    {/* Time / Room */}
                    <td className="py-3 px-4 text-text-muted font-mono text-[11px] whitespace-nowrap">
                      {log.time ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-text-muted" />
                          <span>{log.time}</span>
                          {log.room && <span className="ml-1 text-text-secondary">({log.room})</span>}
                        </div>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2 py-0.5 rounded border uppercase',
                          log.status === 'ATTENDED' && 'bg-safe-muted border-safe/30 text-safe',
                          log.status === 'MISSED' && 'bg-danger-muted border-danger/30 text-danger'
                        )}
                      >
                        {log.status === 'ATTENDED' ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {log.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSubmittingId === log.id}
                          onClick={() => handleStatusToggle(log.id, log.status, log.subjectName)}
                          className="h-7 px-2 text-[10px] font-mono border border-border hover:bg-surface-elevated cursor-pointer"
                          title="Toggle Status (ATTENDED <-> MISSED)"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Swap
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSubmittingId === log.id}
                          onClick={() => handleUnmark(log.id, log.subjectName)}
                          className="h-7 w-7 p-0 text-text-muted hover:text-danger hover:bg-danger-muted/10 rounded cursor-pointer"
                          title="Unmark / Delete log"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* IMPORT ATTENDANCE XLSX MODAL */}
      <AttendanceImporter
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
