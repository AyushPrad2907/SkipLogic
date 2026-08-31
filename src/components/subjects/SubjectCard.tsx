import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RingProgress } from '@/components/ui/RingProgress';
import { Subject } from '@/types';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubjectCardProps {
  subject: Subject;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/app/subjects/${subject.id}`);
  };

  const badgeVariants = {
    SAFE: 'safe' as const,
    RISKY: 'risk' as const,
    MUST_ATTEND: 'danger' as const,
    NEUTRAL: 'neutral' as const,
  };

  return (
    <Card
      variant="glass"
      onClick={handleCardClick}
      className={cn(
        'border relative flex flex-col justify-between overflow-hidden cursor-pointer h-full group p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl select-none',
        subject.status === 'SAFE' && 'hover:border-safe/60 hover:shadow-[0_0_20px_rgba(0,245,160,0.15)]',
        subject.status === 'RISKY' && 'hover:border-risk/60 hover:shadow-[0_0_20px_rgba(255,184,0,0.15)]',
        subject.status === 'MUST_ATTEND' && 'hover:border-danger/60 hover:shadow-[0_0_20px_rgba(255,51,102,0.18)]'
      )}
    >
      <div>
        {/* Title / Code Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="h-3.5 w-3.5 rounded-full ring-2 ring-white/10 shrink-0 shadow-sm"
              style={{ backgroundColor: subject.color || '#00d2ff' }}
            />
            <div>
              <h3 className="font-bold text-text-primary text-sm tracking-tight group-hover:text-brand transition-colors line-clamp-1">
                {subject.name}
              </h3>
              {subject.code && (
                <p className="text-[10px] text-text-muted font-mono uppercase mt-0.5 tracking-wider font-semibold">
                  {subject.code}
                </p>
              )}
            </div>
          </div>
          <div className="h-7 w-7 rounded-lg bg-surface-elevated flex items-center justify-center text-text-muted group-hover:text-brand group-hover:bg-brand/10 transition-colors border border-border/60 shrink-0">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Detailed Metrics Panel */}
        <div className="grid grid-cols-2 gap-4 mt-5 items-center bg-surface-elevated/50 p-3 rounded-xl border border-border/50">
          <div className="space-y-1.5 border-r border-border/40 pr-2 font-mono text-xs">
            <div className="text-text-secondary flex justify-between">
              <span>Attended:</span>
              <strong className="text-text-primary">{subject.totalAttended}</strong>
            </div>
            <div className="text-text-secondary flex justify-between">
              <span>Delivered:</span>
              <strong className="text-text-primary">{subject.totalDelivered}</strong>
            </div>
            <div className="border-t border-border/40 pt-1.5 flex justify-between text-xs font-bold">
              {subject.status === 'MUST_ATTEND' ? (
                <>
                  <span className="text-danger">Recover:</span>
                  <span className="text-danger bg-danger-muted px-1 rounded">{subject.recoveryRequired} cls</span>
                </>
              ) : (
                <>
                  <span className="text-safe">Bunk cap:</span>
                  <span className="text-safe bg-safe-muted px-1 rounded">{subject.bunkLimit} cls</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <RingProgress
              value={subject.currentPercentage}
              status={subject.status}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Footer Tag */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
        <Badge variant={badgeVariants[subject.status]} className="px-2 py-0.5">
          {subject.status === 'SAFE' && 'SAFE BUNK'}
          {subject.status === 'RISKY' && 'RISK LINE'}
          {subject.status === 'MUST_ATTEND' && 'MUST ATTEND'}
          {subject.status === 'NEUTRAL' && 'NO TRACKS'}
        </Badge>
        <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider font-semibold">
          Target: {subject.targetThreshold}%
        </span>
      </div>
    </Card>
  );
};
