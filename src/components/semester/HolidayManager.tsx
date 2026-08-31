import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  HolidayInput,
  validateHolidayInput,
  analyzeHolidayConflict,
} from '@/lib/semesterCalendar';
import { DayOfWeek } from '@/types';
import { Settings, Plus, Trash2, Edit2, Search } from 'lucide-react';

interface HolidayManagerProps {
  holidays: HolidayInput[];
  startDate: string;
  endDate: string;
  workingDays: DayOfWeek[];
  onAddHoliday: (date: string, name?: string) => Promise<void>;
  onEditHoliday: (id: string, date: string, name?: string) => Promise<void>;
  onDeleteHoliday: (id: string) => Promise<void>;
  showToast: (msg: { title: string; message: string; type: 'success' | 'danger' | 'warning' | 'info' }) => void;
}

export const HolidayManager: React.FC<HolidayManagerProps> = ({
  holidays,
  startDate,
  endDate,
  workingDays,
  onAddHoliday,
  onEditHoliday,
  onDeleteHoliday,
  showToast,
}) => {
  const [dateInput, setDateInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editName, setEditName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) {
      showToast({ title: 'Validation Error', message: 'Holiday date is required.', type: 'danger' });
      return;
    }

    const validation = validateHolidayInput(dateInput, startDate, endDate, holidays);
    if (!validation.isValid) {
      showToast({ title: 'Holiday Error', message: validation.error!, type: 'danger' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddHoliday(dateInput, nameInput.trim() || undefined);
      setDateInput('');
      setNameInput('');
      showToast({ title: 'Holiday Added', message: `Exclusion for ${dateInput} registered successfully.`, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error Adding Holiday', message: err.message || 'Failed to add holiday.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (h: HolidayInput) => {
    setEditingId(h.id || null);
    setEditDate(h.date);
    setEditName(h.name || h.description || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDate('');
    setEditName('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editDate) {
      showToast({ title: 'Validation Error', message: 'Holiday date is required.', type: 'danger' });
      return;
    }

    const validation = validateHolidayInput(editDate, startDate, endDate, holidays, id);
    if (!validation.isValid) {
      showToast({ title: 'Holiday Error', message: validation.error!, type: 'danger' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onEditHoliday(id, editDate, editName.trim() || undefined);
      handleCancelEdit();
      showToast({ title: 'Holiday Updated', message: 'Holiday updated successfully.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Update Error', message: err.message || 'Failed to update holiday.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, date: string) => {
    if (confirm(`Remove holiday entry for ${date}?`)) {
      try {
        await onDeleteHoliday(id);
        showToast({ title: 'Holiday Deleted', message: `Removed holiday for ${date}.`, type: 'info' });
      } catch (err: any) {
        showToast({ title: 'Delete Error', message: err.message || 'Failed to delete holiday.', type: 'danger' });
      }
    }
  };

  const filteredHolidays = holidays.filter((h) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (h.name || h.description || '').toLowerCase().includes(query);
    const dateMatch = h.date.includes(query);
    return nameMatch || dateMatch;
  });

  return (
    <Card className="space-y-4 border-border/80 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <h3 className="text-sm font-bold flex items-center gap-2 text-text-primary">
          <Settings className="h-4.5 w-4.5 text-brand" /> Term Holidays & Calendar Exclusions
        </h3>

        {/* Search bar */}
        {holidays.length > 0 && (
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="Filter holidays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-border bg-background rounded-md text-text-primary focus:outline-none focus:border-brand w-full sm:w-48"
            />
          </div>
        )}
      </div>

      {/* Add Holiday Form */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-elevated/40 p-3 rounded-lg border border-border/60">
        <div>
          <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Holiday Date
          </label>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs font-mono focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Description / Name
          </label>
          <input
            type="text"
            placeholder="e.g. Independence Day"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-text-primary text-xs focus:outline-none"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Holiday
          </Button>
        </div>
      </form>

      {/* Holiday List */}
      {holidays.length === 0 ? (
        <div className="p-6 text-center text-text-muted text-xs border border-dashed border-border/60 rounded-lg">
          No holidays configured. Classes will run according to weekly timetable slots across the semester.
        </div>
      ) : filteredHolidays.length === 0 ? (
        <div className="p-4 text-center text-text-muted text-xs">
          No holidays matching "{searchQuery}".
        </div>
      ) : (
        <div className="border border-border rounded-lg max-h-64 overflow-y-auto divide-y divide-border/40">
          {filteredHolidays.map((h) => {
            const isEditing = editingId === h.id;
            const conflict = analyzeHolidayConflict(h, startDate, endDate, workingDays);

            if (isEditing) {
              return (
                <div key={h.id} className="p-3 bg-surface-elevated/60 flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="h-8 px-2 rounded border border-border bg-background text-xs font-mono text-text-primary"
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Description"
                    className="h-8 px-2 rounded border border-border bg-background text-xs text-text-primary flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <Button size="sm" onClick={() => handleSaveEdit(h.id!)} disabled={isSubmitting} className="h-8 text-xs cursor-pointer">
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelEdit} className="h-8 text-xs cursor-pointer">
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={h.id || h.date} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-surface-elevated/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-text-primary">{h.date}</span>
                    <span className="text-text-secondary font-medium">
                      {h.name || h.description || 'Holiday'}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted">
                      ({conflict.dayOfWeek.slice(0, 3)})
                    </span>
                  </div>

                  <p className="text-[10px] text-text-muted font-sans">
                    {conflict.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Badge
                    variant={
                      conflict.conflictType === 'WORKING_DAY_EXCLUSION'
                        ? 'risk'
                        : conflict.conflictType === 'NON_WORKING_DAY'
                        ? 'neutral'
                        : conflict.conflictType === 'TODAY_HOLIDAY'
                        ? 'safe'
                        : 'neutral'
                    }
                    className="text-[9px] font-mono py-0"
                  >
                    {conflict.conflictType.replace('_', ' ')}
                  </Badge>

                  {h.id && (
                    <>
                      <button
                        onClick={() => handleStartEdit(h)}
                        className="p-1 text-text-muted hover:text-text-primary rounded cursor-pointer"
                        title="Edit holiday"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(h.id!, h.date)}
                        className="p-1 text-text-muted hover:text-danger rounded cursor-pointer"
                        title="Delete holiday"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
