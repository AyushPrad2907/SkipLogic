import { StructuredCoachContext } from '@/lib/ai/coachContext';
import {
  CoachResponseContract,
  processCoachRequest,
  generateDeterministicCoachAnswer,
} from '@/lib/ai/coachService';

export interface CoachApiResponse {
  success: boolean;
  data?: CoachResponseContract;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Client API wrapper for sending question and context to the AI Coach.
 * 1. Checks for server-side endpoint `/api/coach`.
 * 2. Checks for custom client-side Gemini API key in localStorage.
 * 3. Seamlessly falls back to SkipLogic's built-in deterministic mathematical reasoning engine.
 */
export async function sendCoachQuestion(
  question: string,
  context: StructuredCoachContext
): Promise<CoachResponseContract> {
  // 1. If user provided a client-side Gemini key in UI settings, invoke with that key
  const customKey =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('skiplogic_gemini_api_key')
      : null;

  if (customKey && customKey.trim()) {
    const origKey = process.env.GEMINI_API_KEY;
    try {
      process.env.GEMINI_API_KEY = customKey.trim();
      const res = await processCoachRequest(question, context);
      process.env.GEMINI_API_KEY = origKey;
      if (res.confidence !== 'LOW' || !res.answer.includes('unconfigured')) {
        return res;
      }
    } catch {
      process.env.GEMINI_API_KEY = origKey;
    }
  }

  // 2. Attempt server endpoint
  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, context }),
    });

    if (response.ok) {
      const resData: CoachApiResponse = await response.json();
      if (resData.success && resData.data) {
        return resData.data;
      }
    }
  } catch {
    // Network or server endpoint fetch failure fallback
  }

  // 3. Built-in precision engine fallback
  const localRes = await processCoachRequest(question, context);
  if (localRes.answer.includes('GEMINI_API_KEY is not set') || localRes.confidence === 'LOW') {
    return generateDeterministicCoachAnswer(question, context);
  }

  return localRes;
}
