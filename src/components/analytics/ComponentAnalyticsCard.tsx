import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ComponentAnalyticsItem } from '@/lib/analytics';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComponentAnalyticsCardProps {
  components: ComponentAnalyticsItem[];
  threshold: number;
}

export const ComponentAnalyticsCard: React.FC<ComponentAnalyticsCardProps> = ({ components, threshold }) => {
  if (components.length === 0) return null;

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4.5 w-4.5 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Component-Level Attendance Analytics</h3>
        </div>
        <span className="text-xs font-mono text-text-muted">
          {components.length} components tracked
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {components.map((comp) => {
          const isEligible = (comp.percentage ?? 0) > threshold;

          return (
            <div
              key={comp.componentId}
              className="p-3.5 bg-surface border border-border/60 rounded-lg flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary">{comp.subjectName}</span>
                  <span className="font-mono text-[10px] text-brand bg-brand/10 px-1.5 py-0.5 rounded border border-brand/20 uppercase font-bold">
                    {comp.componentName || comp.componentType}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-text-secondary text-[11px] font-mono">
                  <span>
                    Delivered: <strong className="text-text-primary">{comp.attended} / {comp.delivered}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Missed: <strong className="text-danger">{comp.missed}</strong>
                  </span>
                </div>
              </div>

              <div className="text-right space-y-1 shrink-0">
                <div
                  className={cn(
                    'text-base font-mono font-black',
                    isEligible ? 'text-safe' : 'text-danger'
                  )}
                >
                  {comp.percentage !== null ? `${comp.percentage.toFixed(2)}%` : '—'}
                </div>

                <Badge
                  variant={
                    comp.trend === 'IMPROVING'
                      ? 'safe'
                      : comp.trend === 'DECLINING'
                      ? 'danger'
                      : comp.trend === 'STABLE'
                      ? 'risk'
                      : 'neutral'
                  }
                  className="text-[9px] font-mono uppercase font-bold py-0"
                >
                  {comp.trend}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
