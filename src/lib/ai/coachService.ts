import { GoogleGenAI } from '@google/genai';
import { StructuredCoachContext } from './coachContext';
import { SYSTEM_INSTRUCTION_TEXT, buildCoachPromptPayload } from './coachPrompts';
import { parseCoachIntent } from './coachIntents';

export interface CoachResponseContract {
  answer: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  factsUsed: string[];
  warnings: string[];
  recommendation: string | null;
}

/**
 * Executes AI Attendance Coach request on the server.
 * Uses process.env.GEMINI_API_KEY securely without client exposure.
 */
export async function processCoachRequest(
  question: string,
  context: StructuredCoachContext
): Promise<CoachResponseContract> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return {
      answer: 'AI Coach is temporarily unconfigured (GEMINI_API_KEY is not set on the server).',
      confidence: 'LOW',
      factsUsed: [],
      warnings: ['Missing server API key configuration.'],
      recommendation: null,
    };
  }

  const parsedIntent = parseCoachIntent(question);

  // Handle unsupported questions locally without wasting API tokens
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
  } catch {
    // Return sanitized, user-safe error without exposing raw keys or system traces
    return {
      answer: 'AI Coach is temporarily unavailable. Please check your network connection or try again in a moment.',
      confidence: 'LOW',
      factsUsed: [],
      warnings: ['Unable to reach AI explanation service.'],
      recommendation: null,
    };
  }
}
