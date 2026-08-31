export type CoachIntentType =
  | 'TODAY_DECISION'
  | 'TOMORROW_DECISION'
  | 'MOST_IMPORTANT_CLASS'
  | 'SUBJECT_STATUS'
  | 'RECOVERY'
  | 'SAFE_BUNK'
  | 'WHAT_IF'
  | 'SEMESTER_FORECAST'
  | 'TREND_ANALYSIS'
  | 'MISSED_CLASS_ANALYSIS'
  | 'OVERALL_STATUS'
  | 'GENERAL_ATTENDANCE'
  | 'UNSUPPORTED';

export interface ParsedCoachIntent {
  intent: CoachIntentType;
  subjectQuery?: string;
  whatIfMissN?: number;
  whatIfAttendN?: number;
  normalizedQuestion: string;
}

const ATTENDANCE_KEYWORDS = [
  'attendance',
  'bunk',
  'skip',
  'class',
  'subject',
  'recover',
  'recovery',
  'schedule',
  'timetable',
  'semester',
  'threshold',
  'eligible',
  'ineligible',
  'miss',
  'missed',
  'present',
  'absent',
  'lecture',
  'lab',
  'tutorial',
  'skiplogic',
  'safe',
  'risk',
  'margin',
  'status',
  'today',
  'tomorrow',
  'how am i doing',
  'what if',
];

/**
 * Normalizes natural-language student question into structured intent and parameters.
 */
export function parseCoachIntent(question: string): ParsedCoachIntent {
  const q = question.toLowerCase().trim();

  // 1. Prompt Injection or Malicious attempt check
  if (
    q.includes('ignore previous instructions') ||
    q.includes('system prompt') ||
    q.includes('api key') ||
    q.includes('password') ||
    q.includes('delete database') ||
    q.includes('modify database') ||
    q.includes('mark attendance')
  ) {
    return {
      intent: 'UNSUPPORTED',
      normalizedQuestion: question,
    };
  }

  // 2. Explicit off-topic / non-academic check
  if (
    q.includes('weather') ||
    q.includes('recipe') ||
    q.includes('movie') ||
    q.includes('football') ||
    q.includes('joke') ||
    q.includes('capital of') ||
    q.includes('who are you') ||
    q.includes('tell me a story') ||
    q.includes('song')
  ) {
    return {
      intent: 'UNSUPPORTED',
      normalizedQuestion: question,
    };
  }

  // 3. What-if miss N classes
  const missMatch = q.match(/miss\s+(\d+)|bunk\s+(\d+)|skip\s+(\d+)/i);
  if (missMatch && (q.includes('what if') || q.includes('if i'))) {
    const num = parseInt(missMatch[1] || missMatch[2] || missMatch[3], 10);
    return {
      intent: 'WHAT_IF',
      whatIfMissN: Number.isNaN(num) ? 1 : num,
      normalizedQuestion: question,
    };
  }

  // 4. Tomorrow decision
  if (q.includes('tomorrow')) {
    return {
      intent: 'TOMORROW_DECISION',
      normalizedQuestion: question,
    };
  }

  // 5. Most important class
  if (q.includes('most important') || q.includes('priority class') || q.includes('crucial class')) {
    return {
      intent: 'MOST_IMPORTANT_CLASS',
      normalizedQuestion: question,
    };
  }

  // 6. Today decision
  if (q.includes('today') || q.includes('bunk today') || q.includes('skip today')) {
    return {
      intent: 'TODAY_DECISION',
      normalizedQuestion: question,
    };
  }

  // 7. Recovery
  if (q.includes('recover') || q.includes('how many to attend') || q.includes('consecutive classes')) {
    return {
      intent: 'RECOVERY',
      normalizedQuestion: question,
    };
  }

  // 8. Safe bunk / bunk limit
  if (q.includes('safe bunk') || q.includes('bunk limit') || q.includes('how many can i bunk')) {
    return {
      intent: 'SAFE_BUNK',
      normalizedQuestion: question,
    };
  }

  // 9. Semester forecast
  if (q.includes('end of semester') || q.includes('forecast') || q.includes('final attendance') || q.includes('how am i doing')) {
    return {
      intent: 'SEMESTER_FORECAST',
      normalizedQuestion: question,
    };
  }

  // 10. Trend / Drop analysis
  if (q.includes('trend') || q.includes('drop') || q.includes('decrease') || q.includes('recently')) {
    return {
      intent: 'TREND_ANALYSIS',
      normalizedQuestion: question,
    };
  }

  // 11. Missed class analysis
  if (q.includes('missed class') || q.includes('absences') || q.includes('hurting')) {
    return {
      intent: 'MISSED_CLASS_ANALYSIS',
      normalizedQuestion: question,
    };
  }

  // 12. Overall status / Am I safe
  if (q.includes('overall') || q.includes('am i safe') || q.includes('my attendance') || q.includes('status')) {
    return {
      intent: 'OVERALL_STATUS',
      normalizedQuestion: question,
    };
  }

  // 13. General attendance keyword presence check
  const hasAttendanceKeyword = ATTENDANCE_KEYWORDS.some((kw) => q.includes(kw));

  if (!hasAttendanceKeyword) {
    return {
      intent: 'UNSUPPORTED',
      normalizedQuestion: question,
    };
  }

  return {
    intent: 'GENERAL_ATTENDANCE',
    normalizedQuestion: question,
  };
}
