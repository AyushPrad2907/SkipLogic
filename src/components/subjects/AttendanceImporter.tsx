import React, { useState, useRef } from 'react';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Info,
  ArrowRight,
} from 'lucide-react';
import {
  ExtractedAttendanceRecord,
  AttendanceImportSummary,
} from '@/types/attendanceXlsx.types';
import { parseAttendanceWorkbook } from '@/lib/xlsx/attendanceParser';
import { matchAndNormalizeAttendanceRecords } from '@/lib/xlsx/attendanceMatcher';
import { validateAndSummarizeAttendanceImport } from '@/lib/xlsx/attendanceValidator';
import { executeAttendanceImport } from '@/lib/attendanceImport.functions';
import { listSubjects, SubjectWithComponents } from '@/lib/subjects.functions';
import { SupportedComponentType } from '@/lib/components.functions';
import { ImportConfidenceStatus } from '@/types/xlsx.types';

interface AttendanceImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const COMPONENT_TYPES: SupportedComponentType[] = ['PP', 'PR', 'TUT', 'LAB', 'THEORY', 'CUSTOM'];

export const AttendanceImporter: React.FC<AttendanceImporterProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { activeSemesterId, refreshData } = useAttendance();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow step state: 'UPLOAD' | 'ANALYZING' | 'PREVIEW'
  const [step, setStep] = useState<'UPLOAD' | 'ANALYZING' | 'PREVIEW'>('UPLOAD');
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Extracted state
  const [extractedRecords, setExtractedRecords] = useState<ExtractedAttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceImportSummary | null>(null);
  const [dbSubjects, setDbSubjects] = useState<SubjectWithComponents[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'REVIEW' | 'CONFIDENT'>('ALL');

  // Editing state
  const [editingRecord, setEditingRecord] = useState<ExtractedAttendanceRecord | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const resetImporterState = () => {
    setStep('UPLOAD');
    setFileName('');
    setParseError(null);
    setExtractedRecords([]);
    setSummary(null);
    setEditingRecord(null);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModalClose = () => {
    if (isImporting) return;
    resetImporterState();
    onClose();
  };

  // Process File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setParseError(null);

    // 1. Extension validation
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setParseError('Only .xlsx Excel files are supported. Please upload a valid Excel workbook.');
      showToast({
        title: 'Unsupported File Format',
        message: 'Only .xlsx files are supported.',
        type: 'danger',
      });
      return;
    }

    // 2. Size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setParseError('File size exceeds maximum limit of 5MB.');
      showToast({
        title: 'File Too Large',
        message: 'Maximum file size is 5MB.',
        type: 'danger',
      });
      return;
    }

    setFileName(file.name);
    setStep('ANALYZING');

    try {
      if (!activeSemesterId) {
        throw new Error('No active semester found. Please set up a semester first.');
      }

      const buffer = await file.arrayBuffer();

      // 1. Parse raw attendance sheet
      const { sheetsScanned, extractedRecords: rawRecords } = parseAttendanceWorkbook(buffer);

      if (rawRecords.length === 0) {
        setParseError('No attendance records could be extracted from this workbook. Check header structure.');
        setStep('UPLOAD');
        return;
      }

      // 2. Fetch existing subjects from Supabase
      const existingSubjects = await listSubjects(activeSemesterId);
      setDbSubjects(existingSubjects);

      // 3. Match records against database
      const matchedRecords = matchAndNormalizeAttendanceRecords(rawRecords, existingSubjects);

      // 4. Validate & Summarize
      const { validatedRecords, summary: initSummary } = validateAndSummarizeAttendanceImport(matchedRecords, sheetsScanned);

      setExtractedRecords(validatedRecords);
      setSummary(initSummary);
      setStep('PREVIEW');
    } catch (err: any) {
      setParseError(err.message || 'An error occurred while parsing the Excel file.');
      setStep('UPLOAD');
      showToast({
        title: 'Parsing Failed',
        message: err.message || 'Could not parse attendance workbook.',
        type: 'danger',
      });
    }
  };

  // Re-run validation whenever records change
  const updateRecordsState = (newRecords: ExtractedAttendanceRecord[]) => {
    const sheetsScanned = summary?.sheetsScanned || 1;
    const { validatedRecords, summary: updatedSummary } = validateAndSummarizeAttendanceImport(newRecords, sheetsScanned);
    setExtractedRecords(validatedRecords);
    setSummary(updatedSummary);
  };

  // Delete a record from preview
  const handleDeleteRecord = (id: string) => {
    const filtered = extractedRecords.filter((r) => r.id !== id);
    updateRecordsState(filtered);
    showToast({
      title: 'Record Removed',
      message: 'Removed attendance record from preview.',
      type: 'info',
    });
  };

  // Add a new blank record to preview
  const handleAddNewRecord = () => {
    const newRecord: ExtractedAttendanceRecord = {
      id: `new-att-${Date.now()}`,
      subjectName: 'New Subject',
      componentName: 'Theory',
      componentType: 'PP',
      attended: 10,
      delivered: 10,
      calculatedPercentage: 100,
      hasPercentageMismatch: false,
      sourceSheet: 'Manual',
      sourceRow: 0,
      sourceCell: 'N/A',
      matchedSubjectId: dbSubjects[0]?.id || null,
      matchedComponentId: dbSubjects[0]?.components?.[0]?.id || null,
      isNewSubject: dbSubjects.length === 0,
      isNewComponent: false,
      existingAttended: dbSubjects[0]?.components?.[0]?.attended ?? null,
      existingDelivered: dbSubjects[0]?.components?.[0]?.delivered ?? null,
      status: dbSubjects.length > 0 ? 'CONFIDENT' : 'NEEDS_REVIEW',
    };

    updateRecordsState([...extractedRecords, newRecord]);
    setEditingRecord(newRecord);
  };

  // Save changes to an edited record
  const handleSaveEditedRecord = (updated: ExtractedAttendanceRecord) => {
    const att = Number(updated.attended) || 0;
    const del = Number(updated.delivered) || 0;
    const calcPct = del > 0 ? Number(((att / del) * 100).toFixed(2)) : 100;

    let pctMismatch = false;
    if (updated.reportedPercentage !== undefined && updated.reportedPercentage !== null) {
      pctMismatch = Math.abs(calcPct - updated.reportedPercentage) > 0.5;
    }

    const recToSave: ExtractedAttendanceRecord = {
      ...updated,
      attended: att,
      delivered: del,
      calculatedPercentage: calcPct,
      hasPercentageMismatch: pctMismatch,
    };

    const updatedList = extractedRecords.map((r) => (r.id === recToSave.id ? recToSave : r));
    updateRecordsState(updatedList);
    setEditingRecord(null);
  };

  // Subject dropdown change in editing record
  const handleRecordSubjectChange = (subjectIdOrNew: string, targetRecord: ExtractedAttendanceRecord) => {
    if (subjectIdOrNew === 'NEW_SUBJECT') {
      return {
        ...targetRecord,
        matchedSubjectId: null,
        matchedComponentId: null,
        isNewSubject: true,
        isNewComponent: true,
        existingAttended: null,
        existingDelivered: null,
        status: 'NEEDS_REVIEW' as ImportConfidenceStatus,
        statusReason: 'Will be created as NEW SUBJECT.',
      };
    }

    const sub = dbSubjects.find((s) => s.id === subjectIdOrNew);
    if (!sub) return targetRecord;

    const comp = sub.components?.[0];
    return {
      ...targetRecord,
      matchedSubjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code || undefined,
      matchedComponentId: comp?.id || null,
      componentName: comp?.name || 'Theory',
      componentType: (comp?.type || 'PP') as SupportedComponentType,
      isNewSubject: false,
      isNewComponent: !comp,
      existingAttended: comp?.attended ?? null,
      existingDelivered: comp?.delivered ?? null,
      status: 'CONFIDENT' as ImportConfidenceStatus,
      statusReason: undefined,
    };
  };

  // Component dropdown change in editing record
  const handleRecordComponentChange = (compIdOrNew: string, targetRecord: ExtractedAttendanceRecord) => {
    if (compIdOrNew === 'NEW_COMPONENT') {
      return {
        ...targetRecord,
        matchedComponentId: null,
        isNewComponent: true,
        existingAttended: null,
        existingDelivered: null,
        status: 'NEEDS_REVIEW' as ImportConfidenceStatus,
        statusReason: 'Will be created as NEW COMPONENT.',
      };
    }

    const sub = dbSubjects.find((s) => s.id === targetRecord.matchedSubjectId);
    const comp = sub?.components.find((c) => c.id === compIdOrNew);
    if (!comp) return targetRecord;

    return {
      ...targetRecord,
      matchedComponentId: comp.id,
      componentName: comp.name || comp.type,
      componentType: comp.type as SupportedComponentType,
      isNewComponent: false,
      existingAttended: comp.attended,
      existingDelivered: comp.delivered,
    };
  };

  // Final Import Confirmation
  const handleConfirmImport = async () => {
    if (!activeSemesterId || !summary) return;

    if (summary.unresolvedCount > 0 || summary.hasConflicts) {
      showToast({
        title: 'Unresolved Errors',
        message: 'Please resolve all 🔴 unresolved items or validation errors before importing.',
        type: 'danger',
      });
      return;
    }

    setIsImporting(true);
    try {
      const res = await executeAttendanceImport(activeSemesterId, extractedRecords);

      await refreshData();
      showToast({
        title: 'Attendance Import Successful',
        message: `Successfully updated ${res.recordsUpdated} component attendance counter(s). (${res.subjectsCreated} new subject(s), ${res.componentsCreated} new component(s)).`,
        type: 'success',
      });

      resetImporterState();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast({
        title: 'Import Failed',
        message: err.message || 'An error occurred during database write.',
        type: 'danger',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Filter records for preview display
  const displayedRecords = extractedRecords.filter((rec) => {
    if (filterStatus === 'REVIEW') {
      return rec.status === 'NEEDS_REVIEW' || rec.status === 'UNRESOLVED' || rec.validationError;
    }
    if (filterStatus === 'CONFIDENT') {
      return rec.status === 'CONFIDENT' && !rec.validationError;
    }
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Import Attendance (.xlsx)"
      className="max-w-4xl"
      footer={
        step === 'PREVIEW' ? (
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" onClick={resetImporterState} disabled={isImporting}>
              Re-upload File
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleModalClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isImporting || (summary?.unresolvedCount || 0) > 0 || summary?.hasConflicts}
                className="flex items-center gap-1.5"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Updating Counters...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Confirm & Import Attendance
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {/* STEP 1: UPLOAD AREA */}
      {step === 'UPLOAD' && (
        <div className="space-y-6 py-2">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-brand/60 bg-surface-elevated/30 hover:bg-surface-elevated/70 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
          >
            <div className="h-12 w-12 rounded-full bg-brand/10 text-brand flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Click to choose or drag & drop your college attendance Excel file
              </p>
              <p className="text-xs text-text-secondary mt-1">Supported format: Excel Workbook (.xlsx) • Max 5MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button size="sm" variant="secondary" className="mt-2 pointer-events-none">
              <Upload className="h-4 w-4 mr-1.5" /> Choose Excel File
            </Button>
          </div>

          {parseError && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg flex items-start gap-2.5 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Parsing Error</span>
                <span>{parseError}</span>
              </div>
            </div>
          )}

          <div className="bg-surface-elevated/40 border border-border/50 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-brand" /> Smart Attendance Importer Principles
            </h4>
            <ul className="text-xs text-text-secondary space-y-1 list-disc pl-4 font-normal">
              <li>Extracts raw <strong>Attended</strong> and <strong>Delivered</strong> component counters.</li>
              <li>Never trusts Excel percentages as canonical — Phase 4 engine calculates exact percentages.</li>
              <li>Reconciles imported counts by setting component totals directly. Does <strong>NOT</strong> double-count additively.</li>
              <li>Your existing <code>attendance_log</code> historical date events are <strong>never</strong> deleted or altered.</li>
            </ul>
          </div>
        </div>
      )}

      {/* STEP 2: ANALYZING LOADING STATE */}
      {step === 'ANALYZING' && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <RefreshCw className="h-10 w-10 text-brand animate-spin" />
          <div>
            <h3 className="text-base font-bold text-text-primary">Analyzing Attendance Workbook</h3>
            <p className="text-xs text-text-secondary mt-1">Reading "{fileName}", extracting attended/delivered counts & matching components...</p>
          </div>
        </div>
      )}

      {/* STEP 3: EDITABLE PREVIEW & RECONCILIATION SUMMARY */}
      {step === 'PREVIEW' && summary && (
        <div className="space-y-5">
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface-elevated/40 border border-border/60 rounded-xl">
              <span className="text-[10px] text-text-muted font-semibold uppercase">Records Detected</span>
              <div className="text-lg font-mono font-bold text-text-primary">{summary.recordsDetected}</div>
              <span className="text-[10px] text-text-secondary">{summary.subjectsDetected} subject(s), {summary.componentsDetected} comp(s)</span>
            </div>

            <div className="p-3 bg-safe-muted/20 border border-safe/30 rounded-xl">
              <span className="text-[10px] text-safe-foreground font-semibold uppercase">Total Attended / Delivered</span>
              <div className="text-base font-mono font-bold text-safe-foreground">{summary.totalAttended} / {summary.totalDelivered}</div>
              <span className="text-[10px] text-text-secondary">
                {summary.totalDelivered > 0 ? ((summary.totalAttended / summary.totalDelivered) * 100).toFixed(2) : 100}% overall
              </span>
            </div>

            <div className="p-3 bg-risk-muted/20 border border-risk/30 rounded-xl">
              <span className="text-[10px] text-risk-foreground font-semibold uppercase">🟡 Needs Review</span>
              <div className="text-lg font-mono font-bold text-risk-foreground">{summary.needsReviewCount}</div>
              <span className="text-[10px] text-text-secondary">New or mismatch</span>
            </div>

            <div className="p-3 bg-danger-muted/20 border border-danger/30 rounded-xl">
              <span className="text-[10px] text-danger-foreground font-semibold uppercase">🔴 Unresolved</span>
              <div className="text-lg font-mono font-bold text-danger-foreground">{summary.unresolvedCount}</div>
              <span className="text-[10px] text-text-secondary">Action required</span>
            </div>
          </div>

          {/* SAFETY CONFIRMATION BANNER */}
          <div className="p-3 bg-brand/10 border border-brand/30 rounded-xl flex items-start gap-2.5 text-xs text-text-primary">
            <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Reconciliation Policy: Set to Imported Values</span>
              <span className="text-text-secondary">
                Importing will update component attendance counters to match your reviewed spreadsheet totals. Existing <code>attendance_log</code> date history will <strong>NOT</strong> be deleted.
              </span>
            </div>
          </div>

          {/* TAB FILTERS & ACTIONS */}
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterStatus === 'ALL' ? 'bg-surface-elevated text-text-primary border border-border' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                All ({extractedRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('REVIEW')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterStatus === 'REVIEW' ? 'bg-surface-elevated text-text-primary border border-border' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Review Required ({summary.needsReviewCount + summary.unresolvedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('CONFIDENT')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterStatus === 'CONFIDENT' ? 'bg-surface-elevated text-text-primary border border-border' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Confident ({summary.confidentCount})
              </button>
            </div>

            <Button size="sm" variant="secondary" onClick={handleAddNewRecord} className="cursor-pointer flex items-center gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Record
            </Button>
          </div>

          {/* PREVIEW TABLE WITH RECONCILIATION */}
          <div className="max-h-[360px] overflow-y-auto border border-border rounded-xl divide-y divide-border/60">
            {displayedRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">No attendance records match the selected filter.</div>
            ) : (
              displayedRecords.map((rec) => {
                const isConflict = rec.status === 'UNRESOLVED' || !!rec.validationError;
                const isDiff = rec.existingAttended !== null && (rec.existingAttended !== rec.attended || rec.existingDelivered !== rec.delivered);

                return (
                  <div
                    key={rec.id}
                    className={`p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isConflict ? 'bg-danger/10 border-l-4 border-l-danger' : 'bg-surface-elevated/20 hover:bg-surface-elevated/60'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-text-primary">{rec.subjectName}</span>
                        {rec.subjectCode && (
                          <span className="font-mono text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border">
                            {rec.subjectCode}
                          </span>
                        )}
                        <span className="uppercase text-[10px] font-semibold text-text-secondary bg-surface px-1.5 py-0.5 rounded border">
                          {rec.componentName} ({rec.componentType})
                        </span>
                      </div>

                      {/* SIDE-BY-SIDE RECONCILIATION DISPLAY */}
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        {rec.existingAttended !== null && rec.existingAttended !== undefined ? (
                          <span className="text-text-muted">
                            Existing: <span className="font-bold">{rec.existingAttended}/{rec.existingDelivered}</span>
                          </span>
                        ) : (
                          <span className="text-risk-foreground">Existing: None (NEW)</span>
                        )}

                        <ArrowRight className="h-3 w-3 text-text-muted" />

                        <span className="text-brand">
                          Imported: <span className="font-bold">{rec.attended}/{rec.delivered}</span> ({rec.calculatedPercentage.toFixed(2)}%)
                        </span>

                        <ArrowRight className="h-3 w-3 text-text-muted" />

                        <span className="text-safe-foreground font-bold">
                          Result: {rec.attended}/{rec.delivered}
                        </span>
                      </div>

                      {rec.statusReason && (
                        <div className={`text-[11px] font-medium flex items-center gap-1 ${isConflict ? 'text-danger' : 'text-risk-foreground'}`}>
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{rec.statusReason}</span>
                        </div>
                      )}

                      {rec.validationError && (
                        <div className="text-[11px] font-medium text-danger flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{rec.validationError}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {rec.status === 'CONFIDENT' && !isConflict && (
                        <Badge variant={isDiff ? 'safe' : 'neutral'} className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {isDiff ? 'Update' : 'No Change'}
                        </Badge>
                      )}
                      {rec.status === 'NEEDS_REVIEW' && !isConflict && (
                        <Badge variant="risk" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Needs Review
                        </Badge>
                      )}
                      {isConflict && (
                        <Badge variant="danger" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Error
                        </Badge>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRecord(rec)}
                        className="h-7 w-7 p-0 cursor-pointer text-text-secondary hover:text-text-primary"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="h-7 w-7 p-0 cursor-pointer text-text-secondary hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* EDIT RECORD MODAL */}
      {editingRecord && (
        <Modal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          title="Edit Extracted Attendance Record"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEditingRecord(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleSaveEditedRecord(editingRecord)}>Save Changes</Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Mapped Subject</label>
                <select
                  value={editingRecord.matchedSubjectId || 'NEW_SUBJECT'}
                  onChange={(e) => setEditingRecord(handleRecordSubjectChange(e.target.value, editingRecord))}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                >
                  {dbSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.code ? `(${sub.code})` : ''}
                    </option>
                  ))}
                  <option value="NEW_SUBJECT">+ Create as NEW SUBJECT ("{editingRecord.subjectName}")</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Mapped Component</label>
                <select
                  value={editingRecord.matchedComponentId || 'NEW_COMPONENT'}
                  onChange={(e) => setEditingRecord(handleRecordComponentChange(e.target.value, editingRecord))}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                >
                  {editingRecord.matchedSubjectId &&
                    dbSubjects
                      .find((s) => s.id === editingRecord.matchedSubjectId)
                      ?.components.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.type} ({c.type}) — Current: {c.attended}/{c.delivered}
                        </option>
                      ))}
                  <option value="NEW_COMPONENT">+ Create as NEW COMPONENT ("{editingRecord.componentName}")</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Subject Display Name</label>
                <input
                  type="text"
                  value={editingRecord.subjectName}
                  onChange={(e) => setEditingRecord({ ...editingRecord, subjectName: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Subject Course Code</label>
                <input
                  type="text"
                  value={editingRecord.subjectCode || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, subjectCode: e.target.value })}
                  placeholder="e.g. CUCS1002"
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Component Display Name</label>
                <input
                  type="text"
                  value={editingRecord.componentName}
                  onChange={(e) => setEditingRecord({ ...editingRecord, componentName: e.target.value })}
                  placeholder="e.g. Theory / Practical"
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Component Type</label>
                <select
                  value={editingRecord.componentType}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, componentType: e.target.value as SupportedComponentType })
                  }
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                >
                  {COMPONENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Attended Classes</label>
                <input
                  type="number"
                  min="0"
                  value={editingRecord.attended}
                  onChange={(e) => setEditingRecord({ ...editingRecord, attended: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Delivered Classes</label>
                <input
                  type="number"
                  min="0"
                  value={editingRecord.delivered}
                  onChange={(e) => setEditingRecord({ ...editingRecord, delivered: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary font-mono text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
