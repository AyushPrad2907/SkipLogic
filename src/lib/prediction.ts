import { DayOfWeek } from '@/types';
import { SupportedComponentType } from '@/lib/components.functions';
import {
  calculateSubjectAttendance,
  pct,
  bunkLimit as engineBunkLimit,
  recoveryNeeded as engineRecoveryNeeded,
  recommendation as engineRecommendation,
  Recommendation,
  ComponentAttendance,
} from './engine';

export interface TimetableSlotInput {
  id: string;
  semesterId?: string;
  subjectId: string;
  componentId: string;
  componentType?: SupportedComponentType;
  componentName?: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  room?: string;
  faculty?: string;
  slotOrder?: number;
}

export interface FutureClassOccurrence {
  id: string; // virtual ID e.g. "occ-slot123-2026-09-15"
  date: string; // ISO date string "YYYY-MM-DD"
  dayOfWeek: DayOfWeek;
  slotId: string;
  subjectId: string;
  componentId: string;
  componentType: SupportedComponentType;
  componentName?: string;
  startTime: string;
  endTime: string;
  room?: string;
  faculty?: string;
}

export interface ComponentFutureSummary {
  componentId: string;
  componentName?: string;
  componentType: SupportedComponentType;
  currentAttended: number;
  currentDelivered: number;
  futureCount: number;
}

export interface SubjectPredictionResult {
  subjectId: string;
  subjectName?: string;
  threshold: number;

  // Current State
  currentAttended: number;
  currentDelivered: number;
  currentPercentage: number | null;
  currentEligible: boolean; // strictly > threshold
  currentRecommendation: Recommendation;
  currentBunkLimit: number;
  currentRecoveryNeeded: number;

  // Future Timetable Stats
  futureClassesTotal: number;
  futureClassesByComponent: ComponentFutureSummary[];
  futureOccurrences: FutureClassOccurrence[];

  // Best Possible (Attends ALL future classes)
  bestPossibleAttended: number;
  bestPossibleDelivered: number;
  bestPossiblePercentage: number | null;
  bestPossibleEligible: boolean;

  // Worst Possible (Misses ALL future classes)
  worstPossibleAttended: number;
  worstPossibleDelivered: number;
  worstPossiblePercentage: number | null;
  worstPossibleEligible: boolean;

  // Recovery Prediction
  recoverable: boolean;
  recoveryClassesNeeded: number; // minimum consecutive classes to attend to become > threshold
  recoveryDate: string | null;   // YYYY-MM-DD date when threshold is crossed

  // Bunk Limit & Safe Bunk Plan
  bunkLimitFuture: number;       // max future classes student can skip while remaining > threshold
  safeBunkPlan: FutureClassOccurrence[]; // specific future occurrences that can be safely missed

  // Overall Status Summary
  status: 'SAFE' | 'RISKY' | 'MUST_ATTEND' | 'UNRECOVERABLE' | 'NEUTRAL';
}

export interface TimetableWalkerParams {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  currentDate: string; // YYYY-MM-DD
  workingDays: DayOfWeek[];
  holidays: string[]; // YYYY-MM-DD array
  timetableSlots: TimetableSlotInput[];
  subjectId?: string;
}

/**
 * Parses YYYY-MM-DD string to local Date object (midnight).
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Formats local Date object to YYYY-MM-DD string.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converts JS Date day of week (0-6) to canonical DayOfWeek enum.
 */
export function getDayOfWeekFromDate(date: Date): DayOfWeek {
  const map: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return map[date.getDay()];
}

/**
 * Deterministic Timetable Walker: Walks future calendar days from currentDate to endDate.
 * Virtual future class occurrences are generated only on working days that are not holidays.
 */
export function walkFutureTimetable(params: TimetableWalkerParams): FutureClassOccurrence[] {
  const {
    startDate,
    endDate,
    currentDate,
    workingDays,
    holidays,
    timetableSlots,
    subjectId,
  } = params;

  if (!startDate || !endDate || !currentDate || timetableSlots.length === 0) {
    return [];
  }

  const startD = parseLocalDate(startDate);
  const endD = parseLocalDate(endDate);
  const currD = parseLocalDate(currentDate);

  // Walk starts from max(currD, startD)
  const walkStartD = currD > startD ? currD : startD;
  if (walkStartD > endD) {
    return [];
  }

  const holidaySet = new Set(holidays.map((h) => h.trim()));
  const workingSet = new Set(workingDays);
  const occurrences: FutureClassOccurrence[] = [];

  const loopD = new Date(walkStartD);
  while (loopD <= endD) {
    const dateStr = formatLocalDate(loopD);
    const dayOfWeek = getDayOfWeekFromDate(loopD);

    // Check holiday exclusion & working day setting
    if (!holidaySet.has(dateStr) && workingSet.has(dayOfWeek)) {
      // Find matching slots for this day of week
      const matchingSlots = timetableSlots.filter((s) => {
        if (s.dayOfWeek !== dayOfWeek) return false;
        if (subjectId && s.subjectId !== subjectId) return false;
        return true;
      });

      // Sort slots by start time
      matchingSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (const slot of matchingSlots) {
        occurrences.push({
          id: `occ-${slot.id}-${dateStr}`,
          date: dateStr,
          dayOfWeek,
          slotId: slot.id,
          subjectId: slot.subjectId,
          componentId: slot.componentId,
          componentType: slot.componentType || 'PP',
          componentName: slot.componentName || 'Theory',
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room,
          faculty: slot.faculty,
        });
      }
    }

    loopD.setDate(loopD.getDate() + 1);
  }

  return occurrences;
}

/**
 * Predicts future subject attendance, recovery requirement, recovery date, and safe bunk plan.
 */
export function predictSubject(
  subjectId: string,
  components: { id: string; type?: string; name?: string; attended: number; delivered: number }[],
  threshold: number = 75,
  walkerParams: Omit<TimetableWalkerParams, 'subjectId'>
): SubjectPredictionResult {
  // 1. Current State Calculations
  const engineComponents: ComponentAttendance[] = components.map((c) => ({
    id: c.id,
    attended: c.attended,
    delivered: c.delivered,
  }));

  const currentStats = calculateSubjectAttendance(engineComponents, threshold);
  const currentAttended = currentStats.attended;
  const currentDelivered = currentStats.delivered;
  const currentPercentage = currentStats.percentage !== null ? Number(currentStats.percentage.toFixed(2)) : null;
  const currentEligible = currentStats.eligible; // strictly > threshold

  const currentRec = engineRecommendation(currentAttended, currentDelivered, threshold);
  const currentBunkLimit = engineBunkLimit(currentAttended, currentDelivered, threshold);
  const currentRecoveryNeeded = engineRecoveryNeeded(currentAttended, currentDelivered, threshold);

  // 2. Future Occurrences from Timetable Walker
  const occurrences = walkFutureTimetable({ ...walkerParams, subjectId });
  const futureClassesTotal = occurrences.length;

  // Group future occurrences by component
  const compFutureMap = new Map<string, number>();
  for (const occ of occurrences) {
    const count = compFutureMap.get(occ.componentId) || 0;
    compFutureMap.set(occ.componentId, count + 1);
  }

  const futureClassesByComponent: ComponentFutureSummary[] = components.map((c) => ({
    componentId: c.id,
    componentName: c.name || c.type,
    componentType: (c.type || 'PP') as SupportedComponentType,
    currentAttended: c.attended,
    currentDelivered: c.delivered,
    futureCount: compFutureMap.get(c.id) || 0,
  }));

  // 3. Best Possible (Attends ALL future classes)
  const bestPossibleAttended = currentAttended + futureClassesTotal;
  const bestPossibleDelivered = currentDelivered + futureClassesTotal;
  const bestPossiblePctRaw = pct(bestPossibleAttended, bestPossibleDelivered);
  const bestPossiblePercentage = bestPossiblePctRaw !== null ? Number(bestPossiblePctRaw.toFixed(2)) : null;
  const bestPossibleEligible = bestPossiblePercentage !== null ? bestPossiblePercentage > threshold : true;

  // 4. Worst Possible (Misses ALL future classes)
  const worstPossibleAttended = currentAttended;
  const worstPossibleDelivered = currentDelivered + futureClassesTotal;
  const worstPossiblePctRaw = pct(worstPossibleAttended, worstPossibleDelivered);
  const worstPossiblePercentage = worstPossiblePctRaw !== null ? Number(worstPossiblePctRaw.toFixed(2)) : null;
  const worstPossibleEligible = worstPossiblePercentage !== null ? worstPossiblePercentage > threshold : false;

  // 5. Recoverability Check
  const recoverable = bestPossibleEligible;

  // 6. Recovery Classes & Recovery Date Calculation
  let recoveryClassesNeeded = 0;
  let recoveryDate: string | null = null;

  if (currentEligible) {
    recoveryClassesNeeded = 0;
    recoveryDate = null;
  } else if (!recoverable) {
    recoveryClassesNeeded = engineRecoveryNeeded(currentAttended, currentDelivered, threshold);
    recoveryDate = null;
  } else {
    // Chronological simulation to find exact required count & date
    let simAttended = currentAttended;
    let simDelivered = currentDelivered;
    let neededCount = 0;

    for (let i = 0; i < occurrences.length; i++) {
      const occ = occurrences[i];
      simAttended++;
      simDelivered++;
      neededCount++;

      const simPct = (simAttended / simDelivered) * 100;
      if (simPct > threshold) {
        recoveryClassesNeeded = neededCount;
        recoveryDate = occ.date;
        break;
      }
    }

    if (!recoveryDate) {
      recoveryClassesNeeded = engineRecoveryNeeded(currentAttended, currentDelivered, threshold);
    }
  }

  // 7. Bunk Limit & Safe Bunk Plan Calculation
  // Calculate maximum future classes that can be missed while staying strictly > threshold
  let bunkLimitFuture = 0;
  const safeBunkPlan: FutureClassOccurrence[] = [];

  if (currentDelivered === 0 && futureClassesTotal > 0) {
    bunkLimitFuture = 0;
  } else {
    let simAttended = currentAttended;
    let simDelivered = currentDelivered;

    // Test how many future occurrences can be skipped in sequence
    for (let i = 0; i < occurrences.length; i++) {
      const testDelivered = simDelivered + 1;
      const testPct = (simAttended / testDelivered) * 100;

      if (testPct > threshold) {
        bunkLimitFuture++;
        simDelivered = testDelivered;
        safeBunkPlan.push(occurrences[i]);
      } else {
        break;
      }
    }
  }

  // 8. Overall Status Determination
  let status: 'SAFE' | 'RISKY' | 'MUST_ATTEND' | 'UNRECOVERABLE' | 'NEUTRAL' = 'SAFE';

  if (currentDelivered === 0 && futureClassesTotal === 0) {
    status = 'NEUTRAL';
  } else if (!recoverable) {
    status = 'UNRECOVERABLE';
  } else if (!currentEligible) {
    status = 'MUST_ATTEND';
  } else if (bunkLimitFuture === 0 || currentBunkLimit === 0) {
    status = 'RISKY';
  } else {
    status = 'SAFE';
  }

  return {
    subjectId,
    threshold,
    currentAttended,
    currentDelivered,
    currentPercentage,
    currentEligible,
    currentRecommendation: currentRec,
    currentBunkLimit,
    currentRecoveryNeeded,
    futureClassesTotal,
    futureClassesByComponent,
    futureOccurrences: occurrences,
    bestPossibleAttended,
    bestPossibleDelivered,
    bestPossiblePercentage,
    bestPossibleEligible,
    worstPossibleAttended,
    worstPossibleDelivered,
    worstPossiblePercentage,
    worstPossibleEligible,
    recoverable,
    recoveryClassesNeeded,
    recoveryDate,
    bunkLimitFuture,
    safeBunkPlan,
    status,
  };
}

export type WhatIfScenario =
  | { type: 'ATTEND_NEXT' }
  | { type: 'MISS_NEXT' }
  | { type: 'ATTEND_ALL' }
  | { type: 'MISS_ALL' }
  | { type: 'MISS_N'; count: number }
  | { type: 'CUSTOM_PLAN'; missedOccurrenceIds: string[] };

export interface WhatIfSimulationResult {
  scenario: WhatIfScenario;
  simulatedAttended: number;
  simulatedDelivered: number;
  simulatedPercentage: number | null;
  simulatedEligible: boolean; // strictly > threshold
  simulatedRecommendation: Recommendation;
  margin: number | null; // percentage - threshold
}

/**
 * Simulates future attendance what-if scenarios.
 */
export function simulateWhatIfScenario(
  prediction: SubjectPredictionResult,
  scenario: WhatIfScenario
): WhatIfSimulationResult {
  const { currentAttended, currentDelivered, threshold, futureOccurrences } = prediction;
  let simulatedAttended = currentAttended;
  let simulatedDelivered = currentDelivered;

  if (scenario.type === 'ATTEND_NEXT') {
    if (futureOccurrences.length > 0) {
      simulatedAttended += 1;
      simulatedDelivered += 1;
    }
  } else if (scenario.type === 'MISS_NEXT') {
    if (futureOccurrences.length > 0) {
      simulatedDelivered += 1;
    }
  } else if (scenario.type === 'ATTEND_ALL') {
    simulatedAttended += futureOccurrences.length;
    simulatedDelivered += futureOccurrences.length;
  } else if (scenario.type === 'MISS_ALL') {
    simulatedDelivered += futureOccurrences.length;
  } else if (scenario.type === 'MISS_N') {
    const missCount = Math.min(scenario.count, futureOccurrences.length);
    const attendCount = futureOccurrences.length - missCount;
    simulatedAttended += attendCount;
    simulatedDelivered += futureOccurrences.length;
  } else if (scenario.type === 'CUSTOM_PLAN') {
    const missedSet = new Set(scenario.missedOccurrenceIds);
    for (const occ of futureOccurrences) {
      simulatedDelivered += 1;
      if (!missedSet.has(occ.id)) {
        simulatedAttended += 1;
      }
    }
  }

  const simulatedPctRaw = pct(simulatedAttended, simulatedDelivered);
  const simulatedPercentage = simulatedPctRaw !== null ? Number(simulatedPctRaw.toFixed(2)) : null;
  const simulatedEligible = simulatedPercentage !== null ? simulatedPercentage > threshold : true;
  const simulatedRecommendation = engineRecommendation(simulatedAttended, simulatedDelivered, threshold);
  const margin = simulatedPercentage !== null ? Number((simulatedPercentage - threshold).toFixed(2)) : null;

  return {
    scenario,
    simulatedAttended,
    simulatedDelivered,
    simulatedPercentage,
    simulatedEligible,
    simulatedRecommendation,
    margin,
  };
}
