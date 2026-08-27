import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MarketingLayout } from '@/layouts/MarketingLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { Landing } from '@/pages/Landing';
import { Auth } from '@/pages/Auth';
import { Dashboard } from '@/pages/Dashboard';
import { Setup } from '@/pages/Setup';
import { Subjects } from '@/pages/Subjects';
import { SubjectDetail } from '@/pages/SubjectDetail';
import { Timetable } from '@/pages/Timetable';
import { Semester } from '@/pages/Semester';

export const router = createBrowserRouter([
  // Marketing / Public Routes
  {
    path: '/',
    element: <MarketingLayout />,
    children: [
      {
        path: '',
        element: <Landing />,
      },
      {
        path: 'auth',
        element: <Auth />,
      },
    ],
  },
  // Authenticated App Shell Routes
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'setup',
        element: <Setup />,
      },
      {
        path: 'subjects',
        element: <Subjects />,
      },
      {
        path: 'subjects/:id',
        element: <SubjectDetail />,
      },
      {
        path: 'timetable',
        element: <Timetable />,
      },
      {
        path: 'semester',
        element: <Semester />,
      },
      // Fallback redirect under /app
      {
        path: '*',
        element: <Navigate to="/app" replace />,
      },
    ],
  },
  // Global Fallback
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
