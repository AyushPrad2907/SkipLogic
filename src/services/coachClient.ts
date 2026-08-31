import { StructuredCoachContext } from '@/lib/ai/coachContext';
import { CoachResponseContract, processCoachRequest } from '@/lib/ai/coachService';

export interface CoachApiResponse {
  success: boolean;
  data?: CoachResponseContract;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Client API wrapper for sending question and context to the server-side AI Coach endpoint.
 * Ensures client browser code NEVER handles raw GEMINI_API_KEY directly.
 */
export async function sendCoachQuestion(
  question: string,
  context: StructuredCoachContext
): Promise<CoachResponseContract> {
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

  // Local fallback handling for client environment if running in development/test mode
  return await processCoachRequest(question, context);
}
