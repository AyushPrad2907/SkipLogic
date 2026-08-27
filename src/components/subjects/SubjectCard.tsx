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
      variant="interactive"
      onClick={handleCardClick}
      className={cn(
        'border relative flex flex-col justify-between overflow-hidden cursor-pointer h-full group',
        subject.status === 'SAFE' && 'border-safe/10 hover:border-safe/30',
        subject.status === 'RISKY' && 'border-risk/10 hover:border-risk/30',
        subject.status === 'MUST_ATTEND' && 'border-danger/10 hover:border-danger/30'
      )}
    >
      <div>
        {/* Title / Code Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border border-black/10 shrink-0"
              style={{ backgroundColor: subject.color || '#818cf8' }}
            />
            <div>
              <h3 className="font-bold text-text-primary text-sm group-hover:text-brand transition-colors line-clamp-1">
                {subject.name}
              </h3>
              {subject.code && (
                <p className="text-[10px] text-text-muted font-mono uppercase mt-0.5 tracking-wider">
                  {subject.code}
                </p>
              )}
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
        </div>

        {/* Detailed Metrics Panel */}
        <div className="grid grid-cols-2 gap-4 mt-5 items-center">
          <div className="space-y-2 border-r border-border/40 pr-2">
            <div className="text-xs text-text-secondary flex justify-between">
              <span>Attended:</span>
              <span className="font-mono font-bold text-text-primary">{subject.totalAttended}</span>
            </div>
            <div className="text-xs text-text-secondary flex justify-between">
              <span>Delivered:</span>
              <span className="font-mono font-bold text-text-primary">{subject.totalDelivered}</span>
            </div>
            <div className="border-t border-border/30 pt-1.5 flex justify-between text-xs font-semibold">
              {subject.status === 'MUST_ATTEND' ? (
                <>
                  <span className="text-danger">Recover:</span>
                  <span className="font-mono text-danger">{subject.recoveryRequired} cls</span>
                </>
              ) : (
                <>
                  <span className="text-safe">Bunk cap:</span>
                  <span className="font-mono text-safe">{subject.bunkLimit} cls</span>
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
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
        <Badge variant={badgeVariants[subject.status]}>
          {subject.status === 'SAFE' && 'SAFE BUNK'}
          {subject.status === 'RISKY' && 'RISK LINE'}
          {subject.status === 'MUST_ATTEND' && 'CRITICAL ATTEND'}
          {subject.status === 'NEUTRAL' && 'NO TRACKS'}
        </Badge>
        <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
          Target: {subject.targetThreshold}%
        </span>
      </div>
    </Card>
  );
};
