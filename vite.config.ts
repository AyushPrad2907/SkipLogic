import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

function coachApiPlugin() {
  return {
    name: 'coach-api-middleware',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/api/coach') {
          // 1. Enforce HTTP POST method
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: {
                  code: 'METHOD_NOT_ALLOWED',
                  message: 'Only HTTP POST requests are allowed on /api/coach',
                },
              })
            );
            return;
          }

          let body = '';
          let size = 0;
          const maxPayloadSize = 50 * 1024; // 50 KB limit

          req.on('data', (chunk: any) => {
            size += chunk.length;
            if (size > maxPayloadSize) {
              res.statusCode = 413;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: {
                    code: 'PAYLOAD_TOO_LARGE',
                    message: 'Request payload exceeds 50 KB size limit.',
                  },
                })
              );
              req.destroy();
              return;
            }
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const { question, context } = JSON.parse(body);
              const { processCoachRequest } = await server.ssrLoadModule('/src/lib/ai/coachService.ts');
              const result = await processCoachRequest(question, context);
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  data: result,
                })
              );
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: {
                    code: 'MALFORMED_PAYLOAD',
                    message: 'Invalid JSON request payload.',
                  },
                })
              );
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), coachApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
