import type { IncomingMessage, ServerResponse } from 'http';
import { processCoachRequest } from '../src/lib/ai/coachService';

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Only HTTP POST requests are allowed on /api/coach' },
      })
    );
    return;
  }

  // Handle body parsing
  let bodyStr = '';
  if (typeof req.body === 'object' && req.body !== null) {
    const { question, context } = req.body;
    try {
      const result = await processCoachRequest(question, context);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, data: result }));
      return;
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } }));
      return;
    }
  }

  // Stream body if not pre-parsed
  req.on('data', (chunk) => {
    bodyStr += chunk;
  });

  req.on('end', async () => {
    try {
      const { question, context } = JSON.parse(bodyStr || '{}');
      const result = await processCoachRequest(question, context);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (err: any) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: { code: 'MALFORMED_PAYLOAD', message: 'Invalid JSON body.' } }));
    }
  });
}
