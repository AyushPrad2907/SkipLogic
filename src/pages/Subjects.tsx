import React, { useState } from 'react';
import { useAttendance } from '@/providers/AttendanceProvider';
import { useToast } from '@/providers/ToastProvider';
import { SubjectCard } from '@/components/subjects/SubjectCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookOpen, Plus, Play } from 'lucide-react';

export const Subjects: React.FC = () => {
  const { subjects, addSubject, loadMockData, settings } = useAttendance();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subThreshold, setSubThreshold] = useState<number>(settings.targetThreshold);
  const [subColor, setSubColor] = useState('#818cf8');

  const handleOpenAddModal = () => {
    setSubName('');
    setSubCode('');
    setSubThreshold(settings.targetThreshold);
    setIsAddModalOpen(true);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) {
      showToast({ title: 'Validation Error', message: 'Subject name is required.', type: 'danger' });
      return;
    }

    addSubject({
      name: subName.trim(),
      code: subCode.trim() || undefined,
      targetThreshold: subThreshold,
      totalDelivered: 0,
      totalAttended: 0,
      color: subColor,
      components: [
        { id: `comp-th-${Math.random()}`, subjectId: '', name: 'Theory', type: 'LECTURE', totalDelivered: 0, totalAttended: 0 }
      ],
    });

    setIsAddModalOpen(false);
    showToast({
      title: 'Subject Added',
      message: `Successfully created ${subName}. Ready for logs.`,
      type: 'success',
    });
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
        description="View tracked subjects, boundaries, and bunk caps."
        actions={
          <Button size="sm" onClick={handleOpenAddModal} className="flex items-center gap-1 cursor-pointer">
            <Plus className="h-4 w-4" /> Add Subject
          </Button>
        }
      />

      {subjects.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="No tracked subjects"
            description="Add your course subjects to map timetable slots and log attendance updates."
            icon={<BookOpen className="h-6 w-6 text-brand" />}
            action={
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                <Button onClick={handleOpenAddModal} className="w-full sm:w-auto flex items-center gap-1 cursor-pointer">
                  <Plus className="h-4 w-4" /> Add Subject
                </Button>
                <Button onClick={loadMockData} variant="secondary" className="w-full sm:w-auto flex items-center gap-1 cursor-pointer">
                  <Play className="h-4 w-4" /> Load Mock Courses
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
        onClose={() => setIsAddModalOpen(false)}
        title="Add Subject"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleAdd} className="cursor-pointer">
              Save Subject
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Subject Name
            </label>
            <input
              type="text"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Subject Code
              </label>
              <input
                type="text"
                value={subCode}
                onChange={(e) => setSubCode(e.target.value)}
                placeholder="e.g. CS-301"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Target Threshold (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={subThreshold}
                onChange={(e) => setSubThreshold(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Color Theme Accent
            </label>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSubColor(color)}
                  className="h-8 w-8 rounded-full border border-black/10 transition-transform relative cursor-pointer active:scale-90"
                  style={{ backgroundColor: color }}
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
    </div>
  );
};
