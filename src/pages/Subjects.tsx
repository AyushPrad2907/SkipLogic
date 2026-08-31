import React, { useState } from 'react';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { SubjectCard } from '@/components/subjects/SubjectCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TacticalLoader } from '@/components/ui/Loading';
import { AttendanceImporter } from '@/components/subjects/AttendanceImporter';
import { BookOpen, Plus, FileSpreadsheet } from 'lucide-react';

export const Subjects: React.FC = () => {
  const { subjects, addSubject, isLoading } = useAttendance();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subColor, setSubColor] = useState('#818cf8');

  const handleOpenAddModal = () => {
    setSubName('');
    setSubCode('');
    setSubColor('#818cf8');
    setIsAddModalOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameTrimmed = subName.trim();
    if (!nameTrimmed) {
      showToast({ title: 'Validation Error', message: 'Subject name is required.', type: 'danger' });
      return;
    }

    const codeTrimmed = subCode.trim();

    // Check duplicate name in local state for instant feedback
    const duplicateName = subjects.some(
      (s) => s.name.toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (duplicateName) {
      showToast({
        title: 'Duplicate Subject Name',
        message: `A subject named "${nameTrimmed}" already exists in this semester.`,
        type: 'danger',
      });
      return;
    }

    // Check duplicate code if code provided
    if (codeTrimmed) {
      const duplicateCode = subjects.some(
        (s) => s.code && s.code.toLowerCase() === codeTrimmed.toLowerCase()
      );
      if (duplicateCode) {
        showToast({
          title: 'Duplicate Subject Code',
          message: `A subject with course code "${codeTrimmed}" already exists in this semester.`,
          type: 'danger',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await addSubject({
        name: nameTrimmed,
        code: codeTrimmed || undefined,
        color: subColor,
      });

      setIsAddModalOpen(false);
      showToast({
        title: 'Subject Added',
        message: `Successfully created ${nameTrimmed}.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Failed to Add Subject',
        message: err.message || 'An error occurred while creating the subject.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = [
    '#818cf8', // Indigo
    '#10b981', // Emerald/Green
    '#f59e0b', // Amber/Yellow
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#14b8a6', // Teal
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="View tracked subjects, component breakdowns, and bunk caps."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-brand" /> Import Attendance (.xlsx)
            </Button>
            <Button size="sm" onClick={handleOpenAddModal} className="flex items-center gap-1 cursor-pointer">
              <Plus className="h-4 w-4" /> Add Subject
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-center py-8">
            <TacticalLoader message="Loading Subjects & Components..." size="md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      ) : subjects.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="No subjects yet"
            description="Upload your current college attendance Excel file or add your first subject manually."
            icon={<BookOpen className="h-6 w-6 text-brand" />}
            action={
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" /> Import Attendance (.xlsx)
                </Button>
                <Button variant="secondary" onClick={handleOpenAddModal} className="flex items-center gap-1 cursor-pointer">
                  <Plus className="h-4 w-4" /> Add Subject Manually
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}

      {/* Add Subject Modal Popup Form */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title="Add Subject"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? 'Saving...' : 'Save Subject'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Subject Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Subject Code (Optional)
            </label>
            <input
              type="text"
              value={subCode}
              onChange={(e) => setSubCode(e.target.value)}
              placeholder="e.g. CS-301"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Color Accent
            </label>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSubColor(color)}
                  className="h-8 w-8 rounded-full border border-black/10 transition-transform relative cursor-pointer active:scale-90"
                  style={{ backgroundColor: color }}
                  disabled={isSubmitting}
                >
                  {subColor === color && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold drop-shadow">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* IMPORT ATTENDANCE XLSX MODAL */}
      <AttendanceImporter
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
