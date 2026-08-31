import React from 'react';
import { Card } from '@/components/ui/Card';
import { SafeBunkOpportunityItem } from '@/lib/dashboardViewModel';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SafeBunkPlanCardProps {
  opportunities: SafeBunkOpportunityItem[];
}

export const SafeBunkPlanCard: React.FC<SafeBunkPlanCardProps> = ({ opportunities }) => {
  if (opportunities.length === 0) return null;

  return (
    <Card className="p-5 border-safe/30 bg-safe-muted/10 space-y-3">
      <div className="flex items-center gap-2 text-safe font-bold text-sm border-b border-safe/20 pb-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <h3>Safe Bunk Opportunities</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {opportunities.map((item) => (
          <div
            key={item.subjectId}
            className="p-3 bg-surface border border-safe/25 rounded-lg space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <Link
                to={`/app/subjects/${item.subjectId}`}
                className="font-bold text-text-primary hover:text-brand hover:underline"
              >
                {item.subjectName}
              </Link>
              <span className="font-mono text-[11px] font-bold text-safe bg-safe-muted/50 px-2 py-0.5 rounded border border-safe/30">
                {item.safeBunkCount} safe skip{item.safeBunkCount > 1 ? 's' : ''} left
              </span>
            </div>

            <p className="text-text-muted text-[11px]">Next safe opportunities to miss:</p>

            <ul className="space-y-1 text-text-secondary font-mono text-[11px]">
              {item.opportunities.map((opp, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-safe shrink-0" />
                  <span>
                    <strong>{opp.date}</strong> ({opp.dayOfWeek.slice(0, 3)}) —{' '}
                    <span className="uppercase text-text-primary">{opp.componentType}</span> ({opp.startTime})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
};
