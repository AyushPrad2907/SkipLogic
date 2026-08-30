/**
 * SkipLogic Attendance Engine
 *
 * This file serves as the single source of truth for all mathematical
 * and business logic related to attendance calculation, bunk limits,
 * recovery required, recommendations, and projections.
 *
 * It is a pure, deterministic, and strongly typed engine that has no dependencies
 * on React, Supabase, browser APIs, or the DOM.
 */

// ============================================================================
// TYPED ENGINE API & INTERFACES
// ============================================================================

export type Recommendation = 'SAFE' | 'RISKY' | 'MUST_ATTEND' | 'NEUTRAL';

export interface ComponentAttendance {
  id: string;
  attended: number;
  delivered: number;
}

export interface SubjectAttendanceResult {
  attended: number;
  delivered: number;
  percentage: number | null;
  eligible: boolean;
}

export interface ProjectionResult {
  attended: number;
  delivered: number;
  percentage: number | null;
  eligible: boolean;
}

export interface SkipImpactResult {
  currentPercentage: number | null;
  projectedPercentage: number | null;
  percentageChange: number | null;
  currentEligible: boolean;
  projectedEligible: boolean;
  recommendation: Recommendation;
}

// ============================================================================
// VALIDATION & HELPERS
// ============================================================================

/**
 * Validates attendance inputs to ensure they are logically sound.
 * Rejects negative numbers, non-numeric values, NaN, Infinity, and cases where attended > delivered.
 */
export function validateInputs(attended: number, delivered: number): void {
  if (attended === undefined || delivered === undefined || attended === null || delivered === null) {
    throw new Error('Attended and delivered values must be provided.');
  }

  if (typeof attended !== 'number' || typeof delivered !== 'number') {
    throw new Error('Attended and delivered values must be numeric.');
  }

  if (Number.isNaN(attended) || Number.isNaN(delivered)) {
    throw new Error('Attended and delivered values cannot be NaN.');
  }

  if (!Number.isFinite(attended) || !Number.isFinite(delivered)) {
    throw new Error('Attended and delivered values must be finite.');
  }

  if (attended < 0 || delivered < 0) {
    throw new Error('Attended and delivered values cannot be negative.');
  }

  if (attended > delivered) {
    throw new Error(`Attended (${attended}) cannot exceed delivered (${delivered}).`);
  }
}

// ============================================================================
// PURE MATHEMATICAL FUNCTIONS
// ============================================================================

/**
 * Calculates attendance percentage given attended and delivered classes.
 * Returns null if delivered classes is 0.
 */
export function pct(attended: number, delivered: number): number | null {
  validateInputs(attended, delivered);
  if (delivered === 0) {
    return null;
  }
  return (attended / delivered) * 100;
}

/**
 * Combines all components and calculates overall attendance statistics.
 *
 * Subject attendance is calculated as SUM(attended components) / SUM(delivered components).
 * Eligibility uses STRICTLY GREATER THAN (>) the configured threshold.
 */
export function calculateSubjectAttendance(
  components: ComponentAttendance[],
  threshold: number = 75
): SubjectAttendanceResult {
  let attended = 0;
  let delivered = 0;

  for (const comp of components) {
    validateInputs(comp.attended, comp.delivered);
    attended += comp.attended;
    delivered += comp.delivered;
  }

  const percentage = pct(attended, delivered);
  const eligible = percentage === null ? true : percentage > threshold;

  return {
    attended,
    delivered,
    percentage,
    eligible,
  };
}

/**
 * Calculates the maximum number of future classes the student can miss
 * while remaining STRICTLY ABOVE the threshold.
 *
 * Requirement: (attended / (delivered + x)) * 100 > threshold
 */
export function bunkLimit(attended: number, delivered: number, threshold: number): number {
  validateInputs(attended, delivered);

  if (delivered === 0) {
    return 0;
  }

  const currentPct = (attended / delivered) * 100;
  if (currentPct <= threshold) {
    return 0;
  }

  // Derived from: (attended / (delivered + x)) * 100 > threshold
  // => x < (100 * attended - threshold * delivered) / threshold
  const limitValue = (100 * attended - threshold * delivered) / threshold;
  let x = Math.max(0, Math.ceil(limitValue) - 1);

  // Safeguard/verification loop to protect against floating point inaccuracies
  while (x > 0 && (attended / (delivered + x)) * 100 <= threshold) {
    x--;
  }
  while ((attended / (delivered + x + 1)) * 100 > threshold) {
    x++;
  }

  return x;
}

/**
 * Calculates the minimum consecutive future classes the student must attend
 * to become STRICTLY ABOVE the threshold.
 *
 * Requirement: (attended + x) / (delivered + x) * 100 > threshold
 */
export function recoveryNeeded(attended: number, delivered: number, threshold: number): number {
  validateInputs(attended, delivered);

  if (delivered === 0) {
    return 0;
  }

  const currentPct = (attended / delivered) * 100;
  if (currentPct > threshold) {
    return 0;
  }

  const denominator = 100 - threshold;
  if (denominator <= 0) {
    // If target threshold is 100, student can never be strictly > 100.
    return 999; 
  }

  // Derived from: (attended + x) / (delivered + x) * 100 > threshold
  // => x > (threshold * delivered - 100 * attended) / (100 - threshold)
  const requiredValue = (threshold * delivered - 100 * attended) / denominator;
  let x = Math.max(0, Math.floor(requiredValue) + 1);

  // Safeguard/verification loop to protect against floating point inaccuracies
  while (x > 0 && ((attended + x - 1) / (delivered + x - 1)) * 100 > threshold) {
    x--;
  }
  while (((attended + x) / (delivered + x)) * 100 <= threshold) {
    x++;
  }

  return x;
}

/**
 * Returns a semantic recommendation based on attendance buffer.
 *
 * Boundary rules:
 * - NEUTRAL: No classes have been delivered yet.
 * - MUST_ATTEND: The current attendance is at or below the threshold.
 * - RISKY: The student is above the threshold but cannot skip a single class (bunkLimit === 0).
 * - SAFE: The student is above the threshold and can skip at least 1 class (bunkLimit > 0).
 */
export function recommendation(attended: number, delivered: number, threshold: number): Recommendation {
  validateInputs(attended, delivered);

  if (delivered === 0) {
    return 'NEUTRAL';
  }

  const currentPct = (attended / delivered) * 100;
  if (currentPct <= threshold) {
    return 'MUST_ATTEND';
  }

  const limit = bunkLimit(attended, delivered, threshold);
  return limit > 0 ? 'SAFE' : 'RISKY';
}

/**
 * Projects attendance after one class action (ATTEND or MISS).
 */
export function projectSubjectAfter(params: {
  attended: number;
  delivered: number;
  threshold: number;
  action: 'ATTEND' | 'MISS';
}): ProjectionResult {
  const { attended, delivered, threshold, action } = params;
  validateInputs(attended, delivered);

  const nextAttended = action === 'ATTEND' ? attended + 1 : attended;
  const nextDelivered = delivered + 1;
  const nextPercentage = pct(nextAttended, nextDelivered);
  const nextEligible = nextPercentage === null ? true : nextPercentage > threshold;

  return {
    attended: nextAttended,
    delivered: nextDelivered,
    percentage: nextPercentage,
    eligible: nextEligible,
  };
}

/**
 * Calculates the impact of skipping the very next class.
 * Recommendation is computed based on the projected stats if the class is missed.
 */
export function calculateClassSkipImpact(
  attended: number,
  delivered: number,
  threshold: number
): SkipImpactResult {
  validateInputs(attended, delivered);

  const currentPercentage = pct(attended, delivered);
  const currentEligible = currentPercentage === null ? true : currentPercentage > threshold;

  const projected = projectSubjectAfter({
    attended,
    delivered,
    threshold,
    action: 'MISS',
  });

  const projectedPercentage = projected.percentage;
  const projectedEligible = projected.eligible;

  const percentageChange =
    currentPercentage !== null && projectedPercentage !== null
      ? projectedPercentage - currentPercentage
      : null;

  // Compute recommendation based on the status after missing
  const nextRecommendation = recommendation(projected.attended, projected.delivered, threshold);

  return {
    currentPercentage,
    projectedPercentage,
    percentageChange,
    currentEligible,
    projectedEligible,
    recommendation: nextRecommendation,
  };
}

/**
 * Projects attendance update by changing only a single component.
 * Component-specific projections modify only the affected component.
 */
export function projectSubjectWithComponentAction(
  components: ComponentAttendance[],
  componentId: string,
  action: 'ATTEND' | 'MISS',
  threshold: number
): SubjectAttendanceResult {
  const updatedComponents = components.map((comp) => {
    if (comp.id === componentId) {
      validateInputs(comp.attended, comp.delivered);
      return {
        ...comp,
        attended: action === 'ATTEND' ? comp.attended + 1 : comp.attended,
        delivered: comp.delivered + 1,
      };
    }
    return comp;
  });

  return calculateSubjectAttendance(updatedComponents, threshold);
}

/**
 * Calculates the overall semester attendance using raw totals.
 */
export function calculateSemesterAttendance(
  allComponents: ComponentAttendance[],
  threshold: number
): SubjectAttendanceResult {
  return calculateSubjectAttendance(allComponents, threshold);
}

// ============================================================================
// FUTURE PREDICTION & SEMESTER INTELLIGENCE (PHASE 10)
// ============================================================================

export {
  walkFutureTimetable,
  predictSubject,
  simulateWhatIfScenario,
  parseLocalDate,
  formatLocalDate,
  getDayOfWeekFromDate,
} from './prediction';

export type {
  TimetableSlotInput,
  FutureClassOccurrence,
  ComponentFutureSummary,
  SubjectPredictionResult,
  WhatIfScenario,
  WhatIfSimulationResult,
  TimetableWalkerParams,
} from './prediction';
