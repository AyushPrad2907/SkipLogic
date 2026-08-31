import React from 'react';
import { Card } from '@/components/ui/Card';
import { SafeBunkOpportunityItem } from '@/lib/dashboardViewModel';
import { Sparkles, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SafeBunkPlanCardProps {
  opportunities: SafeBunkOpportunityItem[];
}

export const SafeBunkPlanCard: React.FC<SafeBunkPlanCardProps> = ({ opportunities }) => {
  if (opportunities.length === 0) return null;

  return (
    <Card variant="glass" className="p-5 border-safe/40 bg-safe-muted/10 space-y-3.5 shadow-[0_0_20px_rgba(0,245,160,0.12)]">
      <div className="flex items-center justify-between border-b border-safe/25 pb-2.5">
        <div className="flex items-center gap-2 text-safe font-bold text-sm font-mono tracking-wide">
          <Sparkles className="h-4 w-4 shrink-0 text-safe" />
          <h3 className="uppercase">SAFE BUNK OPPORTUNITIES ({opportunities.length})</h3>
        </div>
        <span className="text-[10px] font-mono text-safe font-bold bg-safe-muted px-2 py-0.5 rounded border border-safe/30">
          BUFFER AVAILABLE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {opportunities.map((item) => (
          <div
            key={item.subjectId}
            className="p-3.5 bg-surface/90 border border-safe/30 rounded-xl space-y-2.5 text-xs shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <Link
                to={`/app/subjects/${item.subjectId}`}
                className="font-bold text-text-primary hover:text-brand hover:underline tracking-tight text-sm line-clamp-1"
              >
                {item.subjectName}
              </Link>
              <span className="font-mono text-[10px] font-black text-safe bg-safe-muted px-2 py-0.5 rounded-md border border-safe/35 shrink-0">
                {item.safeBunkCount} safe skip{item.safeBunkCount > 1 ? 's' : ''} left
              </span>
            </div>

            <p className="text-text-muted text-[10px] font-mono uppercase tracking-wider">Next safe slots:</p>

            <ul className="space-y-1.5 text-text-secondary font-mono text-[11px]">
              {item.opportunities.map((opp, idx) => (
                <li key={idx} className="flex items-center justify-between bg-surface-elevated/70 px-2.5 py-1 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-safe shrink-0" />
                    <span>
                      <strong className="text-text-primary">{opp.date}</strong> ({opp.dayOfWeek.slice(0, 3)})
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-text-secondary bg-surface px-1.5 py-0.5 rounded border border-border">
                    {opp.componentType} · {opp.startTime}
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
