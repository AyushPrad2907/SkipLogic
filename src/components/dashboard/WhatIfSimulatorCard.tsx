import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { SubjectRiskSummary } from '@/lib/dashboardViewModel';
import { simulateWhatIfScenario } from '@/lib/prediction';
import { Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatIfSimulatorCardProps {
  subjects: SubjectRiskSummary[];
}

export const WhatIfSimulatorCard: React.FC<WhatIfSimulatorCardProps> = ({ subjects }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects.length > 0 ? subjects[0].subjectId : ''
  );

  if (subjects.length === 0) return null;

  const currentSubject = subjects.find((s) => s.subjectId === selectedSubjectId) || subjects[0];
  const pred = currentSubject.prediction;

  const attendNextResult = simulateWhatIfScenario(pred, { type: 'ATTEND_NEXT' });
  const missNextResult = simulateWhatIfScenario(pred, { type: 'MISS_NEXT' });

  return (
    <Card className="p-5 border-border/80 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">"What If I Bunk Today?" Simulator</h3>
        </div>

        {/* Subject Selector */}
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="bg-surface border border-border rounded px-2.5 py-1 text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-brand"
        >
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.subjectName} ({s.currentPercentage !== null ? `${s.currentPercentage}%` : '—'})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Current State */}
        <div className="p-3 bg-surface rounded-lg border border-border/60 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Current</span>
          <div className="text-xl font-mono font-bold text-text-primary mt-1">
            {currentSubject.currentPercentage !== null ? `${currentSubject.currentPercentage.toFixed(2)}%` : '—'}
          </div>
          <span className="text-[10px] font-mono text-text-muted">
            {currentSubject.currentAttended} / {currentSubject.currentDelivered}
          </span>
        </div>

        {/* If Attend Next */}
        <div className="p-3 bg-safe-muted/20 border border-safe/30 rounded-lg text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-safe">If You Attend Next</span>
          <div className="text-xl font-mono font-bold text-safe mt-1">
            {attendNextResult.simulatedPercentage !== null ? `${attendNextResult.simulatedPercentage.toFixed(2)}%` : '—'}
          </div>
          <span className="text-[10px] font-mono text-safe">
            +{attendNextResult.margin !== null ? attendNextResult.margin.toFixed(2) : '0'}% margin
          </span>
        </div>

        {/* If Miss Next */}
        <div className="p-3 bg-danger-muted/20 border border-danger/30 rounded-lg text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-danger">If You Miss Next</span>
          <div
            className={cn(
              'text-xl font-mono font-bold mt-1',
              missNextResult.simulatedEligible ? 'text-warning' : 'text-danger'
            )}
          >
            {missNextResult.simulatedPercentage !== null ? `${missNextResult.simulatedPercentage.toFixed(2)}%` : '—'}
          </div>
          <span className="text-[10px] font-mono text-danger">
            {missNextResult.simulatedEligible ? 'Stays above target' : 'Breaches target threshold!'}
          </span>
        </div>
      </div>
    </Card>
  );
};
