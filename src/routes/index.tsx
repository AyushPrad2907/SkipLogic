/* eslint-disable react-refresh/only-export-components */
// oxlint-disable react/only-export-components
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MarketingLayout } from '@/layouts/MarketingLayout';
import { AppLayout } from '@/layouts/AppLayout';

// Lazy-loaded routes for optimal code-splitting and bundle size efficiency
const Landing = lazy(() => import('@/pages/Landing').then((m) => ({ default: m.Landing })));
const Auth = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.Auth })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Setup = lazy(() => import('@/pages/Setup').then((m) => ({ default: m.Setup })));
const Subjects = lazy(() => import('@/pages/Subjects').then((m) => ({ default: m.Subjects })));
const SubjectDetail = lazy(() => import('@/pages/SubjectDetail').then((m) => ({ default: m.SubjectDetail })));
const Timetable = lazy(() => import('@/pages/Timetable').then((m) => ({ default: m.Timetable })));
const Semester = lazy(() => import('@/pages/Semester').then((m) => ({ default: m.Semester })));
const AttendanceHistory = lazy(() => import('@/pages/AttendanceHistory').then((m) => ({ default: m.AttendanceHistory })));
const Analytics = lazy(() => import('@/pages/Analytics').then((m) => ({ default: m.Analytics })));
const CoachPage = lazy(() => import('@/pages/Coach').then((m) => ({ default: m.CoachPage })));

const RouteLoadingSpinner = () => (
  <div className="flex items-center justify-center p-12 w-full min-h-[40vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand border-t-transparent" />
  </div>
);

const renderWithSuspense = (Element: React.ReactElement) => (
  <Suspense fallback={<RouteLoadingSpinner />}>{Element}</Suspense>
);

export const router = createBrowserRouter([
  // Marketing / Public Routes
  {
    path: '/',
    element: <MarketingLayout />,
    children: [
      {
        path: '',
        element: renderWithSuspense(<Landing />),
      },
      {
        path: 'auth',
        element: renderWithSuspense(<Auth />),
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
        element: renderWithSuspense(<Dashboard />),
      },
      {
        path: 'setup',
        element: renderWithSuspense(<Setup />),
      },
      {
        path: 'subjects',
        element: renderWithSuspense(<Subjects />),
      },
      {
        path: 'subjects/:id',
        element: renderWithSuspense(<SubjectDetail />),
      },
      {
        path: 'timetable',
        element: renderWithSuspense(<Timetable />),
      },
      {
        path: 'history',
        element: renderWithSuspense(<AttendanceHistory />),
      },
      {
        path: 'analytics',
        element: renderWithSuspense(<Analytics />),
      },
      {
        path: 'coach',
        element: renderWithSuspense(<CoachPage />),
      },
      {
        path: 'semester',
        element: renderWithSuspense(<Semester />),
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
