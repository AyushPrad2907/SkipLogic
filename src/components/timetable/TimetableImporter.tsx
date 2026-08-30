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
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import { DayOfWeek } from '@/types';
import {
  ExtractedTimetableSlot,
  TimetableImportSummary,
  TimetableImportStrategy,
  ImportConfidenceStatus,
} from '@/types/xlsx.types';
import { parseXlsxWorkbook } from '@/lib/xlsx/parser';
import { matchAndNormalizeClasses } from '@/lib/xlsx/matcher';
import { validateAndSummarizeImport } from '@/lib/xlsx/validator';
import { executeTimetableImport } from '@/lib/xlsx/importer';
import { listSubjects, SubjectWithComponents } from '@/lib/subjects.functions';
import { SupportedComponentType } from '@/lib/components.functions';

interface TimetableImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const COMPONENT_TYPES: SupportedComponentType[] = ['PP', 'PR', 'TUT', 'LAB', 'THEORY', 'CUSTOM'];

export const TimetableImporter: React.FC<TimetableImporterProps> = ({
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
  const [extractedSlots, setExtractedSlots] = useState<ExtractedTimetableSlot[]>([]);
  const [summary, setSummary] = useState<TimetableImportSummary | null>(null);
  const [dbSubjects, setDbSubjects] = useState<SubjectWithComponents[]>([]);
  const [importStrategy, setImportStrategy] = useState<TimetableImportStrategy>('REPLACE');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'REVIEW' | 'CONFIDENT'>('ALL');

  // Editing state
  const [editingSlot, setEditingSlot] = useState<ExtractedTimetableSlot | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const resetImporterState = () => {
    setStep('UPLOAD');
    setFileName('');
    setParseError(null);
    setExtractedSlots([]);
    setSummary(null);
    setEditingSlot(null);
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

      // Read file buffer
      const buffer = await file.arrayBuffer();

      // 1. Parse raw Excel
      const { sheetsScanned, extractedClasses } = parseXlsxWorkbook(buffer);

      if (extractedClasses.length === 0) {
        setParseError('No timetable information could be extracted from this workbook. Check structure or format.');
        setStep('UPLOAD');
        return;
      }

      // 2. Fetch existing subjects from Supabase
      const existingSubjects = await listSubjects(activeSemesterId);
      setDbSubjects(existingSubjects);

      // 3. Match classes against database
      const matchedSlots = matchAndNormalizeClasses(extractedClasses, existingSubjects);

      // 4. Validate & Summarize
      const { validatedSlots, summary: initSummary } = validateAndSummarizeImport(matchedSlots, sheetsScanned);

      setExtractedSlots(validatedSlots);
      setSummary(initSummary);
      setStep('PREVIEW');
    } catch (err: any) {
      setParseError(err.message || 'An error occurred while parsing the Excel file.');
      setStep('UPLOAD');
      showToast({
        title: 'Parsing Failed',
        message: err.message || 'Could not parse Excel workbook.',
        type: 'danger',
      });
    }
  };

  // Re-run validation whenever slots change
  const updateSlotsState = (newSlots: ExtractedTimetableSlot[]) => {
    const sheetsScanned = summary?.sheetsScanned || 1;
    const { validatedSlots, summary: updatedSummary } = validateAndSummarizeImport(newSlots, sheetsScanned);
    setExtractedSlots(validatedSlots);
    setSummary(updatedSummary);
  };

  // Delete a slot from preview
  const handleDeleteSlot = (id: string) => {
    const filtered = extractedSlots.filter((s) => s.id !== id);
    updateSlotsState(filtered);
    showToast({
      title: 'Slot Removed',
      message: 'Removed class from preview.',
      type: 'info',
    });
  };

  // Add a new blank slot to preview
  const handleAddNewSlot = () => {
    const newSlot: ExtractedTimetableSlot = {
      id: `new-slot-${Date.now()}`,
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '10:00',
      subjectName: 'New Subject',
      componentName: 'Theory',
      componentType: 'PP',
      sourceSheet: 'Manual',
      sourceCell: 'N/A',
      matchedSubjectId: dbSubjects[0]?.id || null,
      matchedComponentId: dbSubjects[0]?.components?.[0]?.id || null,
      isNewSubject: dbSubjects.length === 0,
      isNewComponent: false,
      status: dbSubjects.length > 0 ? 'CONFIDENT' : 'NEEDS_REVIEW',
    };

    updateSlotsState([...extractedSlots, newSlot]);
    setEditingSlot(newSlot);
  };

  // Save changes to an edited slot
  const handleSaveEditedSlot = (updated: ExtractedTimetableSlot) => {
    const updatedList = extractedSlots.map((s) => (s.id === updated.id ? updated : s));
    updateSlotsState(updatedList);
    setEditingSlot(null);
  };

  // Subject dropdown change in editing slot
  const handleSlotSubjectChange = (subjectIdOrNew: string, targetSlot: ExtractedTimetableSlot) => {
    if (subjectIdOrNew === 'NEW_SUBJECT') {
      return {
        ...targetSlot,
        matchedSubjectId: null,
        matchedComponentId: null,
        isNewSubject: true,
        isNewComponent: true,
        status: 'NEEDS_REVIEW' as ImportConfidenceStatus,
        statusReason: 'Will be created as NEW SUBJECT.',
      };
    }

    const sub = dbSubjects.find((s) => s.id === subjectIdOrNew);
    if (!sub) return targetSlot;

    const comp = sub.components?.[0];
    return {
      ...targetSlot,
      matchedSubjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code || undefined,
      matchedComponentId: comp?.id || null,
      componentName: comp?.name || 'Theory',
      componentType: (comp?.type || 'PP') as SupportedComponentType,
      isNewSubject: false,
      isNewComponent: !comp,
      status: 'CONFIDENT' as ImportConfidenceStatus,
      statusReason: undefined,
    };
  };

  // Component dropdown change in editing slot
  const handleSlotComponentChange = (compIdOrNew: string, targetSlot: ExtractedTimetableSlot) => {
    if (compIdOrNew === 'NEW_COMPONENT') {
      return {
        ...targetSlot,
        matchedComponentId: null,
        isNewComponent: true,
        status: 'NEEDS_REVIEW' as ImportConfidenceStatus,
        statusReason: 'Will be created as NEW COMPONENT.',
      };
    }

    const sub = dbSubjects.find((s) => s.id === targetSlot.matchedSubjectId);
    const comp = sub?.components.find((c) => c.id === compIdOrNew);
    if (!comp) return targetSlot;

    return {
      ...targetSlot,
      matchedComponentId: comp.id,
      componentName: comp.name || comp.type,
      componentType: comp.type as SupportedComponentType,
      isNewComponent: false,
    };
  };

  // Final Import Confirmation
  const handleConfirmImport = async () => {
    if (!activeSemesterId || !summary) return;

    if (summary.unresolvedCount > 0 || summary.hasConflicts) {
      showToast({
        title: 'Unresolved Conflicts',
        message: 'Please resolve all 🔴 unresolved mappings and overlap conflicts before importing.',
        type: 'danger',
      });
      return;
    }

    setIsImporting(true);
    try {
      const res = await executeTimetableImport(activeSemesterId, extractedSlots, importStrategy);

      await refreshData();
      showToast({
        title: 'Import Successful',
        message: `Successfully imported ${res.slotsImported} timetable slot(s). (${res.subjectsCreated} new subject(s), ${res.componentsCreated} new component(s)).`,
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

  // Filter slots for preview display
  const displayedSlots = extractedSlots.filter((slot) => {
    if (filterStatus === 'REVIEW') {
      return slot.status === 'NEEDS_REVIEW' || slot.status === 'UNRESOLVED' || slot.hasOverlapConflict;
    }
    if (filterStatus === 'CONFIDENT') {
      return slot.status === 'CONFIDENT' && !slot.hasOverlapConflict;
    }
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Import Timetable (.xlsx)"
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
                    <RefreshCw className="h-4 w-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Confirm & Import Timetable
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
                Click to choose or drag & drop your college timetable
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
              <Info className="h-3.5 w-3.5 text-brand" /> Smart XLSX Importer Capabilities
            </h4>
            <ul className="text-xs text-text-secondary space-y-1 list-disc pl-4 font-normal">
              <li>Automatically detects Day/Time headers and multi-sheet workbooks.</li>
              <li>Extracts subject codes (e.g. CUCS1002) and components (Theory, Lab, PR, TUT).</li>
              <li>Matches timetable subjects against your existing SkipLogic subjects using fuzzy logic.</li>
              <li>Protects your attendance logs — importing will <strong>never</strong> erase attendance history.</li>
            </ul>
          </div>
        </div>
      )}

      {/* STEP 2: ANALYZING LOADING STATE */}
      {step === 'ANALYZING' && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <RefreshCw className="h-10 w-10 text-brand animate-spin" />
          <div>
            <h3 className="text-base font-bold text-text-primary">Analyzing Timetable Structure</h3>
            <p className="text-xs text-text-secondary mt-1">Reading "{fileName}", extracting days, times, subjects & components...</p>
          </div>
        </div>
      )}

      {/* STEP 3: EDITABLE PREVIEW & REVIEW SUMMARY */}
      {step === 'PREVIEW' && summary && (
        <div className="space-y-5">
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface-elevated/40 border border-border/60 rounded-xl">
              <span className="text-[10px] text-text-muted font-semibold uppercase">Classes Detected</span>
              <div className="text-lg font-mono font-bold text-text-primary">{summary.classesDetected}</div>
              <span className="text-[10px] text-text-secondary">{summary.sheetsScanned} sheet(s) scanned</span>
            </div>

            <div className="p-3 bg-safe-muted/20 border border-safe/30 rounded-xl">
              <span className="text-[10px] text-safe-foreground font-semibold uppercase">🟢 Confident</span>
              <div className="text-lg font-mono font-bold text-safe-foreground">{summary.confidentCount}</div>
              <span className="text-[10px] text-text-secondary">Ready for import</span>
            </div>

            <div className="p-3 bg-risk-muted/20 border border-risk/30 rounded-xl">
              <span className="text-[10px] text-risk-foreground font-semibold uppercase">🟡 Needs Review</span>
              <div className="text-lg font-mono font-bold text-risk-foreground">{summary.needsReviewCount}</div>
              <span className="text-[10px] text-text-secondary">New subjects/components</span>
            </div>

            <div className="p-3 bg-danger-muted/20 border border-danger/30 rounded-xl">
              <span className="text-[10px] text-danger-foreground font-semibold uppercase">🔴 Unresolved</span>
              <div className="text-lg font-mono font-bold text-danger-foreground">{summary.unresolvedCount}</div>
              <span className="text-[10px] text-text-secondary">Action required</span>
            </div>
          </div>

          {/* IMPORT STRATEGY SELECTOR & ALERTS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-elevated/50 border border-border/70 rounded-xl">
            <div>
              <span className="text-xs font-bold text-text-primary block">Existing Timetable Strategy</span>
              <span className="text-[11px] text-text-secondary">Choose how to handle existing timetable slots for this semester.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImportStrategy('REPLACE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  importStrategy === 'REPLACE'
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-background text-text-secondary border-border hover:text-text-primary'
                }`}
              >
                Replace Timetable
              </button>
              <button
                type="button"
                onClick={() => setImportStrategy('MERGE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  importStrategy === 'MERGE'
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-background text-text-secondary border-border hover:text-text-primary'
                }`}
              >
                Merge Changes
              </button>
            </div>
          </div>

          {summary.hasConflicts && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-2.5 text-xs text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Action Required Before Import</span>
                <span>
                  Please correct or remove overlapping class slots or unresolved mapping errors highlighted in red.
                </span>
              </div>
            </div>
          )}

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
                All ({extractedSlots.length})
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

            <Button size="sm" variant="secondary" onClick={handleAddNewSlot} className="cursor-pointer flex items-center gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Class
            </Button>
          </div>

          {/* PREVIEW TABLE */}
          <div className="max-h-[360px] overflow-y-auto border border-border rounded-xl divide-y divide-border/60">
            {displayedSlots.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">No timetable slots match the selected filter.</div>
            ) : (
              displayedSlots.map((slot) => {
                const isConflict = slot.hasOverlapConflict || slot.status === 'UNRESOLVED';
                return (
                  <div
                    key={slot.id}
                    className={`p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isConflict ? 'bg-danger/10 border-l-4 border-l-danger' : 'bg-surface-elevated/20 hover:bg-surface-elevated/60'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-text-primary uppercase bg-surface px-2 py-0.5 rounded border border-border">
                          {slot.dayOfWeek.slice(0, 3)}
                        </span>
                        <span className="font-mono text-brand font-semibold flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {slot.startTime} – {slot.endTime}
                        </span>
                        <span className="font-bold text-text-primary">{slot.subjectName}</span>
                        {slot.subjectCode && (
                          <span className="font-mono text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border">
                            {slot.subjectCode}
                          </span>
                        )}
                        <span className="uppercase text-[10px] font-semibold text-text-secondary bg-surface px-1.5 py-0.5 rounded border">
                          {slot.componentName} ({slot.componentType})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-text-muted font-mono">
                        {slot.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {slot.room}
                          </span>
                        )}
                        {slot.instructor && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {slot.instructor}
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted/70">
                          [{slot.sourceSheet} cell {slot.sourceCell}]
                        </span>
                      </div>

                      {slot.statusReason && (
                        <div className={`text-[11px] font-medium flex items-center gap-1 ${isConflict ? 'text-danger' : 'text-risk-foreground'}`}>
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{slot.statusReason}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {slot.status === 'CONFIDENT' && !slot.hasOverlapConflict && (
                        <Badge variant="safe" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </Badge>
                      )}
                      {slot.status === 'NEEDS_REVIEW' && !slot.hasOverlapConflict && (
                        <Badge variant="risk" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Needs Review
                        </Badge>
                      )}
                      {isConflict && (
                        <Badge variant="danger" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Conflict
                        </Badge>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingSlot(slot)}
                        className="h-7 w-7 p-0 cursor-pointer text-text-secondary hover:text-text-primary"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSlot(slot.id)}
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

      {/* EDIT SLOT MODAL */}
      {editingSlot && (
        <Modal
          isOpen={!!editingSlot}
          onClose={() => setEditingSlot(null)}
          title="Edit Extracted Class Slot"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEditingSlot(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleSaveEditedSlot(editingSlot)}>Save Changes</Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Mapped Subject</label>
                <select
                  value={editingSlot.matchedSubjectId || 'NEW_SUBJECT'}
                  onChange={(e) => setEditingSlot(handleSlotSubjectChange(e.target.value, editingSlot))}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                >
                  {dbSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.code ? `(${sub.code})` : ''}
                    </option>
                  ))}
                  <option value="NEW_SUBJECT">+ Create as NEW SUBJECT ("{editingSlot.subjectName}")</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Mapped Component</label>
                <select
                  value={editingSlot.matchedComponentId || 'NEW_COMPONENT'}
                  onChange={(e) => setEditingSlot(handleSlotComponentChange(e.target.value, editingSlot))}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                >
                  {editingSlot.matchedSubjectId &&
                    dbSubjects
                      .find((s) => s.id === editingSlot.matchedSubjectId)
                      ?.components.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.type} ({c.type})
                        </option>
                      ))}
                  <option value="NEW_COMPONENT">+ Create as NEW COMPONENT ("{editingSlot.componentName}")</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Subject Display Name</label>
                <input
                  type="text"
                  value={editingSlot.subjectName}
                  onChange={(e) => setEditingSlot({ ...editingSlot, subjectName: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Subject Course Code</label>
                <input
                  type="text"
                  value={editingSlot.subjectCode || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, subjectCode: e.target.value })}
                  placeholder="e.g. CUCS1002"
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Day of Week</label>
                <select
                  value={editingSlot.dayOfWeek}
                  onChange={(e) => setEditingSlot({ ...editingSlot, dayOfWeek: e.target.value as DayOfWeek })}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Start Time</label>
                <input
                  type="time"
                  value={editingSlot.startTime}
                  onChange={(e) => setEditingSlot({ ...editingSlot, startTime: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">End Time</label>
                <input
                  type="time"
                  value={editingSlot.endTime}
                  onChange={(e) => setEditingSlot({ ...editingSlot, endTime: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Component Name</label>
                <input
                  type="text"
                  value={editingSlot.componentName}
                  onChange={(e) => setEditingSlot({ ...editingSlot, componentName: e.target.value })}
                  placeholder="e.g. Theory / Lab"
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Component Type</label>
                <select
                  value={editingSlot.componentType}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, componentType: e.target.value as SupportedComponentType })
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

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Room / Venue</label>
                <input
                  type="text"
                  value={editingSlot.room || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, room: e.target.value })}
                  placeholder="e.g. AR-402"
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1">Faculty / Instructor</label>
              <input
                type="text"
                value={editingSlot.instructor || ''}
                onChange={(e) => setEditingSlot({ ...editingSlot, instructor: e.target.value })}
                placeholder="e.g. Prof. A. Sharma"
                className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
              />
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
