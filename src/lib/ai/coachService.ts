import { GoogleGenAI } from '@google/genai';
import { StructuredCoachContext } from './coachContext';
import { SYSTEM_INSTRUCTION_TEXT, buildCoachPromptPayload } from './coachPrompts';
import { parseCoachIntent } from './coachIntents';
import { validateCoachQuestion } from '@/lib/validation';
import { normalizeError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface CoachResponseContract {
  answer: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  factsUsed: string[];
  warnings: string[];
  recommendation: string | null;
}

export interface CoachApiResponse {
  success: boolean;
  data?: CoachResponseContract;
  error?: {
    code: string;
    message: string;
  };
}

export function generateDeterministicCoachAnswer(
  question: string,
  context: StructuredCoachContext
): CoachResponseContract {
  const intent = parseCoachIntent(question);
  const threshold = context.studentAttendance.threshold || 75;
  const overall = context.studentAttendance.overallPercentage;

  switch (intent.intent) {
    case 'TOMORROW_DECISION': {
      const tomorrow = context.tomorrow;
      if (!tomorrow || tomorrow.classesCount === 0) {
        return {
          answer: `Tomorrow (${tomorrow?.dayOfWeek || 'tomorrow'}) has no classes scheduled in your timetable. You're completely free to take the day off!`,
          confidence: 'HIGH',
          factsUsed: [`Schedule check for ${tomorrow?.dayOfWeek || 'tomorrow'}: 0 classes`],
          warnings: [],
          recommendation: 'Use this time to review any subjects where attendance buffer is low.',
        };
      }

      const safeClasses = tomorrow.classes.filter((c) => c.canBunk);
      const riskyClasses = tomorrow.classes.filter((c) => !c.canBunk);

      let answer = `Tomorrow (**${tomorrow.dayOfWeek}**) you have **${tomorrow.classesCount}** scheduled ${tomorrow.classesCount === 1 ? 'class' : 'classes'}:\n\n`;
      tomorrow.classes.forEach((c) => {
        const statusIcon = c.canBunk ? '✅' : '⚠️';
        const impact = c.skipImpactPct !== null ? `(Skipping drops you to ${c.skipImpactPct}%)` : '';
        const tag = c.canBunk ? 'SAFE TO SKIP' : 'MUST ATTEND';
        answer += `• ${statusIcon} **${c.subjectName}** (${c.startTime} - ${c.endTime}) — **${tag}** ${impact}\n`;
      });

      const facts = tomorrow.classes.map((c) => `${c.subjectName}: ${c.canBunk ? 'Safe buffer available' : `Below/at ${threshold}% if skipped`}`);

      return {
        answer,
        confidence: 'HIGH',
        factsUsed: facts,
        warnings: riskyClasses.length > 0 ? [`${riskyClasses.length} class(es) will drop you below your ${threshold}% target if skipped.`] : [],
        recommendation: riskyClasses.length > 0
          ? `Prioritize attending ${riskyClasses.map((c) => c.subjectName).join(', ')}.${safeClasses.length > 0 ? ` You can safely skip ${safeClasses.map((c) => c.subjectName).join(', ')}.` : ''}`
          : 'All classes tomorrow have a safe attendance buffer.',
      };
    }

    case 'TODAY_DECISION': {
      const today = context.today;
      if (!today || today.classesCount === 0) {
        return {
          answer: `You have no scheduled classes for today (${today.dayOfWeek}). Enjoy your day off!`,
          confidence: 'HIGH',
          factsUsed: [`Today's schedule: 0 classes`],
          warnings: [],
          recommendation: 'Check your upcoming timetable to plan ahead.',
        };
      }

      let answer = `Today (**${today.dayOfWeek}**) you have **${today.classesCount}** class decisions:\n\n`;
      today.classes.forEach((c) => {
        const icon = c.recommendation === 'SAFE' ? '✅' : c.recommendation === 'RISKY' ? '⚠️' : '🚨';
        answer += `• ${icon} **${c.subjectName}** (${c.startTime} - ${c.endTime}) — **${c.recommendation}**: ${c.explanation}\n`;
      });

      return {
        answer,
        confidence: 'HIGH',
        factsUsed: today.classes.map((c) => `${c.subjectName}: ${c.recommendation}`),
        warnings: today.classes.some((c) => c.recommendation !== 'SAFE') ? ['Some classes have high skip risk today.'] : [],
        recommendation: today.mostImportantClass ? `Key priority: ${today.mostImportantClass.subjectName} (${today.mostImportantClass.explanation})` : null,
      };
    }

    case 'MOST_IMPORTANT_CLASS': {
      if (context.today.mostImportantClass) {
        return {
          answer: `Your most crucial class today is **${context.today.mostImportantClass.subjectName}**.\n\n${context.today.mostImportantClass.explanation}`,
          confidence: 'HIGH',
          factsUsed: [`Identified high-priority subject: ${context.today.mostImportantClass.subjectName}`],
          warnings: [],
          recommendation: `Attend ${context.today.mostImportantClass.subjectName} to preserve your threshold safety.`,
        };
      }
      return {
        answer: 'You have no urgent attendance deficits today. All subjects are currently in a safe zone!',
        confidence: 'HIGH',
        factsUsed: ['No critical subjects below threshold today'],
        warnings: [],
        recommendation: 'Maintain consistent attendance across all subjects.',
      };
    }

    case 'RECOVERY': {
      const recovering = context.subjects.filter((s) => s.recoveryRequired > 0);
      if (recovering.length === 0) {
        return {
          answer: `Great news! None of your subjects are below your ${threshold}% target threshold. You do not need recovery classes at this moment.`,
          confidence: 'HIGH',
          factsUsed: ['All subjects are at or above target threshold'],
          warnings: [],
          recommendation: 'Keep maintaining your current attendance routine.',
        };
      }

      let answer = `You currently have **${recovering.length}** subject(s) requiring attendance recovery:\n\n`;
      recovering.forEach((s) => {
        answer += `• 🚨 **${s.subjectName}**: Currently at **${s.percentage ?? 0}%** (Target: ${threshold}%). You must attend **${s.recoveryRequired} consecutive class(es)** without absence to recover.\n`;
      });

      return {
        answer,
        confidence: 'HIGH',
        factsUsed: recovering.map((s) => `${s.subjectName}: ${s.recoveryRequired} classes needed to reach ${threshold}%`),
        warnings: ['Avoid skipping any classes in these subjects until recovery target is reached.'],
        recommendation: `Focus immediately on attending ${recovering.map((s) => s.subjectName).join(', ')}.`,
      };
    }

    case 'SAFE_BUNK': {
      const totalBunks = context.subjects.reduce((sum, s) => sum + s.bunkLimit, 0);
      let answer = `Across all subjects, you currently have a total buffer of **${totalBunks} safe bunk(s)** without dropping below your ${threshold}% requirement:\n\n`;
      context.subjects.forEach((s) => {
        const icon = s.bunkLimit > 0 ? '🟢' : '🔴';
        answer += `• ${icon} **${s.subjectName}**: **${s.bunkLimit} safe skip(s)** remaining (Current: ${s.percentage ?? 0}%)\n`;
      });

      return {
        answer,
        confidence: 'HIGH',
        factsUsed: context.subjects.map((s) => `${s.subjectName}: ${s.bunkLimit} safe bunks`),
        warnings: totalBunks === 0 ? ['You have 0 bunk buffers across all subjects.'] : [],
        recommendation: 'Only use bunks when necessary to keep a safety buffer for emergencies.',
      };
    }

    case 'WHAT_IF': {
      if (context.whatIfScenario) {
        const sc = context.whatIfScenario;
        const answer = `If you miss **${sc.n} class(es)** in **${sc.subjectName}**:\n\n` +
          `• Current Attendance: **${sc.currentPercentage}%**\n` +
          `• Projected Attendance: **${sc.simulatedPercentage}%**\n` +
          `• Target Threshold: **${sc.threshold}%**\n\n` +
          (sc.remainsEligible
            ? `✅ You will **remain eligible** (${sc.simulatedPercentage}% >= ${sc.threshold}%).`
            : `⚠️ This will drop you **below threshold** into danger (${sc.simulatedPercentage}% < ${sc.threshold}%).`);

        return {
          answer,
          confidence: 'HIGH',
          factsUsed: [`Simulated -${sc.n} classes in ${sc.subjectName}: ${sc.currentPercentage}% -> ${sc.simulatedPercentage}%`],
          warnings: !sc.remainsEligible ? [`Missing ${sc.n} classes will cause an attendance shortage.`] : [],
          recommendation: sc.remainsEligible ? 'Safe to proceed if needed.' : 'Do not skip these classes.',
        };
      }
      return {
        answer: `What-if projection: Skipping classes will reduce your percentage based on your total delivered count. Always verify your subject bunk limit first.`,
        confidence: 'HIGH',
        factsUsed: [`Threshold: ${threshold}%`],
        warnings: [],
        recommendation: 'Check the What-If Simulator in your Dashboard for interactive testing.',
      };
    }

    case 'OVERALL_STATUS':
    case 'GENERAL_ATTENDANCE':
    default: {
      const statusIcon = context.studentAttendance.status === 'SAFE' ? '🟢' : context.studentAttendance.status === 'WARNING' ? '🟡' : '🔴';
      const marginStr = context.studentAttendance.safetyMargin !== null
        ? (context.studentAttendance.safetyMargin >= 0 ? `+${context.studentAttendance.safetyMargin}%` : `${context.studentAttendance.safetyMargin}%`)
        : 'N/A';

      let answer = `### ${statusIcon} Attendance Status Overview\n\n` +
        `• **Overall Attendance**: **${overall !== null ? `${overall}%` : 'N/A'}** (Target: **${threshold}%**)\n` +
        `• **Safety Margin**: **${marginStr}**\n` +
        `• **Total Classes Attended**: **${context.studentAttendance.totalAttended} / ${context.studentAttendance.totalDelivered}**\n\n`;

      if (context.subjects.length > 0) {
        answer += `**Subject Breakdown:**\n`;
        context.subjects.forEach((s) => {
          const icon = s.status === 'SAFE' ? '✅' : s.status === 'WARNING' ? '⚠️' : '🚨';
          answer += `• ${icon} **${s.subjectName}**: ${s.percentage !== null ? `${s.percentage}%` : 'N/A'} (${s.attended}/${s.delivered}) — ${s.bunkLimit > 0 ? `${s.bunkLimit} bunks left` : s.recoveryRequired > 0 ? `${s.recoveryRequired} to recover` : 'At threshold'}\n`;
        });
      }

      return {
        answer,
        confidence: 'HIGH',
        factsUsed: [
          `Overall: ${overall ?? 0}%`,
          `Delivered: ${context.studentAttendance.totalDelivered}`,
          `Attended: ${context.studentAttendance.totalAttended}`,
        ],
        warnings: context.studentAttendance.status === 'DANGER' ? ['Overall attendance is below minimum required threshold.'] : [],
        recommendation: context.studentAttendance.status === 'SAFE'
          ? 'You are in good standing! Keep up the regular attendance.'
          : 'Focus on attending upcoming classes to restore your safety margin.',
      };
    }
  }
}

/**
 * Executes AI Attendance Coach request on the server.
 * Uses process.env.GEMINI_API_KEY securely without client exposure.
 * Enforces payload limits, input validation, and sanitized error responses.
 */
export async function processCoachRequest(
  question: string,
  context: StructuredCoachContext
): Promise<CoachResponseContract> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    logger.warn('Coach service requested without server GEMINI_API_KEY configuration');
    return {
      answer: 'AI Coach is temporarily unconfigured (GEMINI_API_KEY is not set on the server).',
      confidence: 'LOW',
      factsUsed: [],
      warnings: ['Missing server API key configuration.'],
      recommendation: null,
    };
  }

  // 1. Input Validation
  const valRes = validateCoachQuestion(question);
  if (!valRes.valid) {
    logger.warn('Coach request rejected due to invalid input', { error: valRes.error });
    return {
      answer: valRes.error || 'Invalid question provided.',
      confidence: 'LOW',
      factsUsed: [],
      warnings: ['Invalid question input.'],
      recommendation: null,
    };
  }

  const parsedIntent = parseCoachIntent(question);

  // 2. Handle unsupported questions locally without wasting API tokens
  if (parsedIntent.intent === 'UNSUPPORTED') {
    return {
      answer: 'I am SkipLogic’s AI Attendance Coach, specifically designed to help you analyze, understand, and plan your academic attendance. For questions outside academic attendance, please consult your college handbook or advisor.',
      confidence: 'HIGH',
      factsUsed: [],
      warnings: [],
      recommendation: 'Ask me about bunk limits, recovery classes, upcoming schedules, or historical attendance trends.',
    };
  }

  const promptPayload = buildCoachPromptPayload(question, context);

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Attempt primary model: gemini-2.5-flash, fallback to gemini-1.5-flash
    let rawText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptPayload,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_TEXT,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      rawText = response.text || '';
    } catch {
      // Fallback model attempt
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: promptPayload,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_TEXT,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      rawText = response.text || '';
    }

    if (!rawText) {
      throw new Error('Empty response received from Gemini API');
    }

    // Parse JSON
    const parsed = JSON.parse(rawText);

    return {
      answer: parsed.answer || 'I evaluated your attendance data.',
      confidence: parsed.confidence === 'HIGH' || parsed.confidence === 'MEDIUM' || parsed.confidence === 'LOW' ? parsed.confidence : 'HIGH',
      factsUsed: Array.isArray(parsed.factsUsed) ? parsed.factsUsed : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      recommendation: parsed.recommendation || null,
    };
  } catch (error) {
    const normalized = normalizeError(error, 'AI_ERROR');
    logger.error('Gemini API execution error in coachService', {
      category: normalized.category,
      code: normalized.code,
    });

    // Return sanitized, user-safe error without exposing raw keys or system traces
    return {
      answer: normalized.userMessage,
      confidence: 'LOW',
      factsUsed: [],
      warnings: ['Unable to reach AI explanation service.'],
      recommendation: null,
    };
  }
}
