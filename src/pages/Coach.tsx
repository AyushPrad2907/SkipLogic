import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { AIAttendanceCoach } from '@/components/coach/AIAttendanceCoach';

export const CoachPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="AI Attendance Coach"
        description="Ask natural-language questions about bunking, class priority, recovery timelines, and trajectory forecasts."
      />
      <AIAttendanceCoach />
    </div>
  );
};
