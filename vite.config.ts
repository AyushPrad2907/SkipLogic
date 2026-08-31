import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

function coachApiPlugin() {
  return {
    name: 'coach-api-middleware',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/api/coach' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { question, context } = JSON.parse(body);
              const { processCoachRequest } = await server.ssrLoadModule('/src/lib/ai/coachService.ts');
              const result = await processCoachRequest(question, context);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  answer: 'AI Coach is temporarily unavailable. Please try again.',
                  confidence: 'LOW',
                  factsUsed: [],
                  warnings: [],
                  recommendation: null,
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
