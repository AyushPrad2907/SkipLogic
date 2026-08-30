# Phase 7 — Real Attendance Marking + Attendance History Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the existing `attendance_log` database table to Supabase and implement real attendance marking (ATTENDED/MISSED), status swapping, idempotency, unmarking, and real attendance history across the application.

**Architecture:** Real attendance actions alter `attendance_log` and component `attended`/`delivered` counters in Supabase. Phase 4 pure engine remains the single source of truth for all percentage, bunk limit, and recovery calculations. TanStack Query hooks manage cache invalidation across Dashboard, Subjects, Subject Detail, and Timetable.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Supabase Client v2, Vitest, Lucide Icons, Tailwind CSS v4.

---

### Task 1: Create Data Access Layer `src/lib/attendance.functions.ts`

**Files:**
- Create: `src/lib/attendance.functions.ts`
- Test: `src/lib/attendance.test.ts`

**Step 1: Write the failing tests in `src/lib/attendance.test.ts`**
Define tests covering:
- Creating ATTENDED log & incrementing component attended + delivered
- Creating MISSED log & incrementing delivered only
- Idempotency: Duplicate marking returns existing record without incrementing counters
- Status swapping: MISSED -> ATTENDED adjusts component attended +1, delivered +0
- Status swapping: ATTENDED -> MISSED adjusts component attended -1, delivered +0
- Unmarking ATTENDED: component attended -1, delivered -1
- Unmarking MISSED: component delivered -1, attended 0
- Relationship validation: invalid subject/component/slot parameters rejected

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/lib/attendance.test.ts`

**Step 3: Implement `src/lib/attendance.functions.ts`**
Implement strongly typed functions:
- `requireAuth()`
- `listAttendanceLogs()`
- `getAttendanceForDate()`
- `markAttendance()`
- `updateAttendanceStatus()`
- `deleteAttendanceLog()`

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/lib/attendance.test.ts`

---

### Task 2: Create TanStack Query Hooks `src/hooks/useAttendanceData.ts`

**Files:**
- Create: `src/hooks/useAttendanceData.ts`

**Step 1: Implement hooks and mutations**
- `useAttendanceLogs(semesterId?, filters?)`
- `useAttendanceForDate(semesterId?, date?)`
- `useMarkAttendance()`
- `useUpdateAttendanceStatus()`
- `useDeleteAttendanceLog()`

**Step 2: Verify build**
Run: `npm run build`

---

### Task 3: Update `AttendanceProvider.tsx` to sync real Supabase logs

**Files:**
- Modify: `src/providers/AttendanceProvider.tsx`

**Step 1: Update context state and methods**
- Integrate `listAttendanceLogs`, `markAttendance`, `updateAttendanceStatus`, `deleteAttendanceLog`.
- Refetch real attendance logs on mount & auth changes.

**Step 2: Run all vitest tests**
Run: `npx vitest run`

---

### Task 4: Update UI — Dashboard, Today's Classes, and Decision Card

**Files:**
- Modify: `src/components/dashboard/DecisionCard.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Update `DecisionCard.tsx`**
- Show current marked status (`ATTENDED` | `MISSED` | `null`).
- Render active state styling for `[✓ ATTENDED]` and `[✕ MISSED]`.
- Support status swapping on click.

**Step 2: Update `Dashboard.tsx`**
- Pass slot `slotId`, `componentId`, and current attendance status to `DecisionCard`.
- Connect attendance marking buttons to real Supabase mutations.
- Display real recent logs with unmark/status update controls.

**Step 3: Verify build and tests**
Run: `npm run build && npx vitest run`

---

### Task 5: Add Real Attendance History Page & Route

**Files:**
- Create: `src/pages/AttendanceHistory.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/layouts/AppLayout.tsx`
- Modify: `src/pages/SubjectDetail.tsx`

**Step 1: Create `AttendanceHistory.tsx`**
- Show filterable table/list of real attendance logs (Date, Subject, Component, Slot time/room, Status).
- Provide unmark/delete and status swap controls.

**Step 2: Add route `/app/history` in `routes/index.tsx` and sidebar link in `AppLayout.tsx`**

**Step 3: Update `SubjectDetail.tsx` Course Logs to use real `attendance_log` data**

---

### Task 6: Final Verification & Integration Testing

**Files:**
- All created & modified files

**Step 1: Run build**
Run: `npm run build`

**Step 2: Run linter**
Run: `npm run lint`

**Step 3: Run complete Vitest suite**
Run: `npx vitest run`
