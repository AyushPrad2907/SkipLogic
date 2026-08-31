import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { AttendanceProvider } from '@/providers/AttendanceProvider';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { router } from '@/routes';

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="skiplogic-theme">
        <ToastProvider>
          <AttendanceProvider>
            <ErrorBoundary fallbackTitle="SkipLogic Application Error">
              <RouterProvider router={router} />
            </ErrorBoundary>
          </AttendanceProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
