import { SubjectWithComponents } from '@/lib/subjects.functions';
import { RawExtractedClass, ExtractedTimetableSlot, ImportConfidenceStatus } from '@/types/xlsx.types';
import { SupportedComponentType } from '@/lib/components.functions';

/**
 * Calculates Jaccard token similarity between two strings.
 * Returns score between 0.0 and 1.0.
 */
export function calculateTokenSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0);

  const tokens1 = new Set(tokenize(str1));
  const tokens2 = new Set(tokenize(str2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return intersection / union;
}

/**
 * Checks if one string is an acronym for another (e.g. "DS" for "Data Structures").
 */
export function isAcronymMatch(acronym: string, fullName: string): boolean {
  if (!acronym || !fullName) return false;
  const cleanAcronym = acronym.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (cleanAcronym.length < 2) return false;

  const words = fullName
    .split(/\s+/)
    .filter((w) => w.length > 0 && !['and', 'or', 'of', 'in', 'the', 'for', '&', 'using'].includes(w.toLowerCase()));

  const computedAcronym = words.map((w) => w[0]?.toUpperCase()).join('');
  return cleanAcronym === computedAcronym;
}

export interface MatchSubjectResult {
  matchedSubject: SubjectWithComponents | null;
  score: number;
  isAmbiguous: boolean;
  ambiguousCandidates: SubjectWithComponents[];
}

/**
 * Matches an extracted subject against a list of existing subjects in the database.
 */
export function matchSubject(
  extractedName: string,
  extractedCode: string | undefined,
  existingSubjects: SubjectWithComponents[]
): MatchSubjectResult {
  if (existingSubjects.length === 0) {
    return { matchedSubject: null, score: 0, isAmbiguous: false, ambiguousCandidates: [] };
  }

  const cleanExtractedName = extractedName.trim().toLowerCase();
  const cleanExtractedCode = extractedCode?.trim().toUpperCase();

  // Priority 1: Exact Subject Code match
  if (cleanExtractedCode) {
    const codeMatch = existingSubjects.find(
      (s) => s.code && s.code.trim().toUpperCase() === cleanExtractedCode
    );
    if (codeMatch) {
      return { matchedSubject: codeMatch, score: 1.0, isAmbiguous: false, ambiguousCandidates: [] };
    }
  }

  // Priority 2: Exact Subject Name match
  const nameMatch = existingSubjects.find(
    (s) => s.name.trim().toLowerCase() === cleanExtractedName
  );
  if (nameMatch) {
    return { matchedSubject: nameMatch, score: 1.0, isAmbiguous: false, ambiguousCandidates: [] };
  }

  // Priority 3: Acronym or Alias match
  const aliasMatches = existingSubjects.filter(
    (s) => isAcronymMatch(extractedName, s.name) || isAcronymMatch(s.name, extractedName)
  );

  if (aliasMatches.length === 1) {
    return { matchedSubject: aliasMatches[0], score: 0.9, isAmbiguous: false, ambiguousCandidates: [] };
  } else if (aliasMatches.length > 1) {
    return {
      matchedSubject: null,
      score: 0.9,
      isAmbiguous: true,
      ambiguousCandidates: aliasMatches,
    };
  }

  // Priority 4: Token similarity / Fuzzy match
  const scored = existingSubjects
    .map((s) => ({
      subject: s,
      score: calculateTokenSimilarity(extractedName, s.name),
    }))
    .sort((a, b) => b.score - a.score);

  const topMatch = scored[0];
  const secondMatch = scored[1];

  if (!topMatch || topMatch.score < 0.3) {
    return { matchedSubject: null, score: 0, isAmbiguous: false, ambiguousCandidates: [] };
  }

  // Check if top two matches are ambiguous (e.g. score difference < 0.1 and both > 0.4)
  if (secondMatch && topMatch.score - secondMatch.score < 0.1 && topMatch.score >= 0.4) {
    return {
      matchedSubject: null,
      score: topMatch.score,
      isAmbiguous: true,
      ambiguousCandidates: [topMatch.subject, secondMatch.subject],
    };
  }

  return {
    matchedSubject: topMatch.subject,
    score: topMatch.score,
    isAmbiguous: false,
    ambiguousCandidates: [],
  };
}

/**
 * Matches extracted component against components of a matched subject.
 */
export function matchComponent(
  componentType: SupportedComponentType,
  componentName: string,
  subjectComponents: SubjectWithComponents['components']
): { matchedComponentId: string | null; isNewComponent: boolean } {
  if (!subjectComponents || subjectComponents.length === 0) {
    return { matchedComponentId: null, isNewComponent: true };
  }

  // 1. Exact type match (e.g. PR, PP, TUT, LAB, THEORY)
  const typeMatch = subjectComponents.find((c) => c.type === componentType);
  if (typeMatch) {
    return { matchedComponentId: typeMatch.id, isNewComponent: false };
  }

  // 2. Exact name match (case-insensitive)
  const nameMatch = subjectComponents.find(
    (c) => (c.name || '').trim().toLowerCase() === componentName.trim().toLowerCase()
  );
  if (nameMatch) {
    return { matchedComponentId: nameMatch.id, isNewComponent: false };
  }

  return { matchedComponentId: null, isNewComponent: true };
}

/**
 * Processes raw extracted classes into ExtractedTimetableSlot objects with matched IDs and status flags.
 */
export function matchAndNormalizeClasses(
  rawClasses: RawExtractedClass[],
  existingSubjects: SubjectWithComponents[]
): ExtractedTimetableSlot[] {
  return rawClasses.map((raw, idx) => {
    const id = `extracted-slot-${idx + 1}-${Date.now()}`;
    const subjectName = (raw.subjectName || 'Unknown Subject').trim();
    const subjectCode = raw.subjectCode ? raw.subjectCode.trim() : undefined;
    const componentName = raw.componentName || 'Theory';
    const componentType = (raw.componentType || 'PP') as SupportedComponentType;
    const dayOfWeek = raw.dayOfWeek || 'MONDAY';
    const startTime = raw.startTime || '09:00';
    let endTime = raw.endTime || '';

    // Default end time if missing
    if (!endTime && startTime) {
      const parts = startTime.split(':').map(Number);
      const endHour = (parts[0] + 1) % 24;
      endTime = `${endHour.toString().padStart(2, '0')}:${(parts[1] || 0).toString().padStart(2, '0')}`;
    }

    const { matchedSubject, isAmbiguous, ambiguousCandidates } = matchSubject(
      subjectName,
      subjectCode,
      existingSubjects
    );

    let matchedSubjectId: string | null = null;
    let matchedComponentId: string | null = null;
    let isNewSubject = false;
    let isNewComponent = false;

    if (matchedSubject) {
      matchedSubjectId = matchedSubject.id;
      const compRes = matchComponent(componentType, componentName, matchedSubject.components);
      matchedComponentId = compRes.matchedComponentId;
      isNewComponent = compRes.isNewComponent;
    } else if (!isAmbiguous) {
      isNewSubject = true;
      isNewComponent = true;
    }

    // Determine confidence status
    let status: ImportConfidenceStatus = 'CONFIDENT';
    let statusReason: string | undefined;

    if (!raw.dayOfWeek || !raw.startTime || !raw.endTime) {
      status = 'UNRESOLVED';
      statusReason = 'Missing mandatory day or time selection.';
    } else if (isAmbiguous) {
      status = 'UNRESOLVED';
      const names = ambiguousCandidates.map((c) => c.name).join(' OR ');
      statusReason = `Ambiguous subject match (${names}). Select correct subject.`;
    } else if (isNewSubject) {
      status = 'NEEDS_REVIEW';
      statusReason = `Subject "${subjectName}" not found. Will be created as NEW SUBJECT.`;
    } else if (isNewComponent) {
      status = 'NEEDS_REVIEW';
      statusReason = `Component "${componentName}" (${componentType}) not found on subject. Will be created as NEW COMPONENT.`;
    }

    return {
      id,
      dayOfWeek,
      startTime,
      endTime,
      subjectName,
      subjectCode,
      componentName,
      componentType,
      room: raw.room || undefined,
      instructor: raw.instructor || undefined,
      sourceSheet: raw.sourceSheet,
      sourceCell: raw.sourceCell,
      matchedSubjectId,
      matchedComponentId,
      isNewSubject,
      isNewComponent,
      status,
      statusReason,
    };
  });
}
