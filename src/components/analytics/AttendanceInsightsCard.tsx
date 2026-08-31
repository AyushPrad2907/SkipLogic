import React from 'react';
import { Card } from '@/components/ui/Card';
import { AttendanceInsightItem } from '@/lib/analytics';
import { Sparkles, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface AttendanceInsightsCardProps {
  insights: AttendanceInsightItem[];
}

export const AttendanceInsightsCard: React.FC<AttendanceInsightsCardProps> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <Card className="p-5 border-border/80 space-y-3">
      <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
        <Sparkles className="h-4.5 w-4.5 text-brand" />
        <h3 className="text-sm font-bold text-text-primary">Behavioral Attendance Observations</h3>
      </div>

      <div className="space-y-2.5">
        {insights.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-surface border border-border/50 rounded-lg flex items-start gap-2.5 text-xs"
          >
            {item.category === 'POSITIVE' ? (
              <CheckCircle2 className="h-4 w-4 text-safe shrink-0 mt-0.5" />
            ) : item.category === 'WARNING' ? (
              <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            )}

            <div className="space-y-0.5">
              <h4 className="font-bold text-text-primary">{item.title}</h4>
              <p className="text-text-secondary leading-relaxed font-sans">{item.message}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
