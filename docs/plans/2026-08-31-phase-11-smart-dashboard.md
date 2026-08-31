# Phase 11 — Smart Dashboard & Decision Intelligence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the SkipLogic `/app` Dashboard into an actionable attendance command center powered by canonical engine math (Phase 4) and semester predictions (Phase 10).

**Architecture:** Create a unified dashboard data aggregation layer (`src/lib/dashboardViewModel.ts` and `src/hooks/useDashboardData.ts`) that computes the coherent `DashboardViewModel` once per render cycle. Update `src/pages/Dashboard.tsx` and modular dashboard UI components to display overall attendance command stats, today's decision cards with "Most Important Today" highlighting, subject risk prioritization, recovery alerts, safe bunk opportunities, semester forecasts with visual trajectory, "What-If" simulator integration, quick action flows, empty/loading/error states, and direct modal integrations for XLSX timetable & attendance import.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Supabase Client v2, Lucide Icons, Tailwind CSS v4, Vitest.

---

### Task 1: Create Dashboard View Model Aggregator & Pure Calculation Functions (`src/lib/dashboardViewModel.ts`)

**Files:**
- Create: `src/lib/dashboardViewModel.ts`
- Test: `src/lib/dashboardViewModel.test.ts`

**Step 1: Write failing tests in `src/lib/dashboardViewModel.test.ts`**
Cover:
1. Overall attendance aggregation: `totalAttended`, `totalDelivered`, percentage, threshold margin, overall status (`SAFE`, `RISKY`, `MUST_ATTEND`).
2. Today's decision cards: percentage calculation, skip impact (`ifSkippedPercentage`), recommendation, explanation string, current status, and deterministic "Most Important Class" selection.
3. Subject risk prioritization: sorting by UNRECOVERABLE -> MUST_ATTEND -> RISKY -> SAFE (with lowest attendance margin secondary sort).
4. Recovery alerts: filtering subjects below threshold with required consecutive classes & recovery date or unrecoverability alert.
5. Safe bunk opportunities: surface `safeBunkPlan` occurrences for safe subjects.
6. Semester forecast: current, best possible, worst possible percentages.
7. Empty state flags: `hasActiveSemester`, `hasSubjects`, `hasTimetable`, `hasAttendance`.

**Step 2: Run vitest to verify test fails**
Run: `npx vitest run src/lib/dashboardViewModel.test.ts`

**Step 3: Implement `src/lib/dashboardViewModel.ts`**
Implement strongly-typed `buildDashboardViewModel()` function using Phase 4 `engine.ts` functions (`calculateSubjectAttendance`, `pct`, `calculateClassSkipImpact`, `engineRecommendation`) and Phase 10 `prediction.ts` functions (`predictSubject`, `simulateWhatIfScenario`).

**Step 4: Run vitest to verify test passes**
Run: `npx vitest run src/lib/dashboardViewModel.test.ts`

---

### Task 2: Create Centralized Data Hook `src/hooks/useDashboardData.ts`

**Files:**
- Create: `src/hooks/useDashboardData.ts`

**Step 1: Implement `useDashboardData` hook**
- Wraps `useAttendance()` context and computes `viewModel` using `useMemo`.
- Exposes `viewModel`, `isLoading`, `isError`, `error`, `refetch`.
- Provides helper action handlers for logging/unmarking attendance and triggering import modals.

**Step 2: Run build to verify TypeScript types**
Run: `npm run build`

---

### Task 3: Build Modular Dashboard UI Components

**Files:**
- Create: `src/components/dashboard/OverallCommandCenter.tsx`
- Create: `src/components/dashboard/SubjectRiskOverview.tsx`
- Create: `src/components/dashboard/RecoveryAlertsCard.tsx`
- Create: `src/components/dashboard/SafeBunkPlanCard.tsx`
- Create: `src/components/dashboard/SemesterForecastCard.tsx`
- Create: `src/components/dashboard/WhatIfSimulatorCard.tsx`

**Step 1: Implement `OverallCommandCenter.tsx`**
- Big gauge/card showing overall attendance %, attended/delivered numbers, threshold, margin, status pill, and subject count badges.

**Step 2: Implement `SubjectRiskOverview.tsx`**
- Compact list of subjects ordered by priority (UNRECOVERABLE -> MUST ATTEND -> RISKY -> SAFE) with forecast %, safe bunks / recovery classes needed.

**Step 3: Implement `RecoveryAlertsCard.tsx`**
- Warning cards for subjects below threshold with recovery class count, recovery date, or unrecoverable alert.

**Step 4: Implement `SafeBunkPlanCard.tsx`**
- Card listing safe skip counts and specific upcoming dates/components from `safeBunkPlan`.

**Step 5: Implement `SemesterForecastCard.tsx` & Trajectory Visualization**
- Displays Current %, Best Possible %, Worst Possible %, and lightweight SVG trajectory bar comparing Current vs Threshold vs Best vs Worst.

**Step 6: Implement `WhatIfSimulatorCard.tsx`**
- Interactive card allowing student to test skipping/attending upcoming classes and view resulting percentage & recommendation.

**Step 7: Run build to verify component compilation**
Run: `npm run build`

---

### Task 4: Upgrade `src/pages/Dashboard.tsx` with Intelligence Command Center

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/components/dashboard/DecisionCard.tsx` (add `isMostImportant` badge & explanation text)

**Step 1: Update `DecisionCard.tsx`**
- Support optional `isMostImportant?: boolean` prop with glowing accent border & "MOST IMPORTANT TODAY" badge.
- Support `explanation?: string` rendering.

**Step 2: Rewrite `Dashboard.tsx`**
- Integrate `useDashboardData()`.
- Add Quick Actions bar with "Import Timetable" & "Import Attendance" opening `TimetableImporter` & `AttendanceImporter` modals directly.
- Add structured empty states ("Set up semester", "Add subjects", "Add timetable", "Mark attendance").
- Add Skeleton loading state & recoverable error banner with Retry button.
- Render Top Command Center, Today's Decision Center with "Most Important Today" badge, Recovery Alerts, Subject Risk Overview, Safe Bunk Opportunities, Semester Forecast, and What-If Simulator.

**Step 3: Verify build and run tests**
Run: `npm run build && npx vitest run`

---

### Task 5: End-to-End Verification & Final Testing

**Files:**
- All created & modified files

**Step 1: Run complete Vitest suite**
Run: `npx vitest run`

**Step 2: Run linter**
Run: `npm run lint`

**Step 3: Run production build**
Run: `npm run build`
