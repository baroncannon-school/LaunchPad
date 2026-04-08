// ============================================================================
// LaunchPad — Next.js App Router Page Structure
//
// This file documents every route in the application.
// Role-based routing is handled by middleware + layout components.
// ============================================================================

/*
app/
├── layout.tsx                          # Root layout: auth provider, theme
├── page.tsx                            # Landing / login redirect
├── login/
│   └── page.tsx                        # Google OAuth login (SFHS domain)
├── auth/
│   └── callback/
│       └── route.ts                    # Supabase Auth callback handler
│
├── (authenticated)/                    # Layout group: requires auth
│   ├── layout.tsx                      # Checks session, fetches user role, redirects
│   │
│   ├── instructor/                     # ═══════ INSTRUCTOR VIEWS ═══════
│   │   ├── layout.tsx                  # Instructor nav: Dashboard, Ventures, Gradebook, Materials, Settings
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx                # COMMAND CENTER
│   │   │                               #   - Priority queue (overdue, needs review, stale check-ins)
│   │   │                               #   - Period selector with venture heatmap
│   │   │                               #   - Quick stats (% on track, avg score, submissions pending)
│   │   │                               #   - Recent activity feed
│   │   │
│   │   ├── ventures/
│   │   │   ├── page.tsx                # All ventures grid/list, filterable by period
│   │   │   │                           #   - Cards showing: name, members, completion %, score range
│   │   │   │                           #   - Sort by: period, score, last check-in, name
│   │   │   │
│   │   │   └── [ventureId]/
│   │   │       ├── page.tsx            # VENTURE DETAIL
│   │   │       │                       #   - Team roster with individual scores
│   │   │       │                       #   - Full milestone grid (interactive, toggleable)
│   │   │       │                       #   - Ownership/offering type display
│   │   │       │                       #   - Check-in history and next scheduled
│   │   │       │                       #   - Financial statement status per month
│   │   │       │
│   │   │       ├── milestones/
│   │   │       │   └── page.tsx        # Full milestone grid for this venture
│   │   │       │                       #   - Column per student, row per milestone
│   │   │       │                       #   - Click to toggle status / add notes
│   │   │       │                       #   - Filter by phase, period, req/optional
│   │   │       │
│   │   │       ├── check-ins/
│   │   │       │   ├── page.tsx        # Check-in history for this venture
│   │   │       │   └── new/
│   │   │       │       └── page.tsx    # Conduct new check-in
│   │   │       │                       #   - Pre-populated with: progress since last check-in,
│   │   │       │                       #     upcoming milestones, mentor notes
│   │   │       │                       #   - Fields: notes, action items, next check-in date
│   │   │       │                       #   - Attendance checkboxes
│   │   │       │
│   │   │       └── financials/
│   │   │           └── page.tsx        # Financial statement submissions for this venture
│   │   │                               #   - Month-by-month status
│   │   │                               #   - Review / accept / request revision
│   │   │
│   │   ├── students/
│   │   │   ├── page.tsx                # All students list, filterable by period/venture
│   │   │   │                           #   - Sortable columns: name, venture, score, % complete
│   │   │   │
│   │   │   └── [studentId]/
│   │   │       └── page.tsx            # Individual student detail
│   │   │                               #   - Their milestone progress (personal view)
│   │   │                               #   - Score breakdown with full transparency
│   │   │                               #   - Grade records across categories
│   │   │                               #   - Check-in attendance log
│   │   │                               #   - Activity timeline
│   │   │
│   │   ├── gradebook/
│   │   │   ├── page.tsx                # GRADEBOOK
│   │   │   │                           #   - Spreadsheet-style view, all students × categories
│   │   │   │                           #   - Semester toggle (Fall weights vs Spring weights)
│   │   │   │                           #   - Milestone tracker scores auto-populated
│   │   │   │                           #   - Manual entry for exams, quizzes, etc.
│   │   │   │                           #   - Weighted final grade calculation
│   │   │   │
│   │   │   └── export/
│   │   │       └── route.ts            # CSV export endpoint (Schoology-compatible format)
│   │   │                               #   - Generates CSV with: student name, ID, scores by category
│   │   │                               #   - Formatted for Schoology bulk import
│   │   │
│   │   ├── materials/
│   │   │   ├── page.tsx                # Materials management
│   │   │   │                           #   - Organized by semester → unit → material
│   │   │   │                           #   - Upload, reorder, publish/unpublish
│   │   │   │                           #   - Drag-and-drop sequencing
│   │   │   │
│   │   │   └── [unitId]/
│   │   │       └── page.tsx            # Unit detail with material list
│   │   │
│   │   ├── milestones/
│   │   │   └── page.tsx                # Milestone definition management
│   │   │                               #   - Edit titles, descriptions, guidance text
│   │   │                               #   - Adjust filters (ownership, offering, req level)
│   │   │                               #   - Link related course materials
│   │   │                               #   - Preview as student would see
│   │   │
│   │   └── settings/
│   │       └── page.tsx                # App settings
│   │                                   #   - Scoring rule multipliers
│   │                                   #   - Semester date ranges
│   │                                   #   - Grade weight configuration
│   │                                   #   - Notification preferences
│   │                                   #   - Mentor invite management
│   │                                   #   - Schoology integration config
│   │
│   ├── student/                        # ═══════ STUDENT VIEWS ═══════
│   │   ├── layout.tsx                  # Student nav: Dashboard, Milestones, Materials, Team
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx                # STUDENT HOME
│   │   │                               #   - "What to do next" priority list
│   │   │                               #   - Current score with visual progress bar
│   │   │                               #   - Upcoming deadlines
│   │   │                               #   - Recent check-in action items
│   │   │                               #   - Quick links to submit evidence
│   │   │
│   │   ├── milestones/
│   │   │   ├── page.tsx                # My milestones (filtered for my venture type)
│   │   │   │                           #   - Grouped by phase
│   │   │   │                           #   - Status indicators (done, in progress, upcoming, overdue)
│   │   │   │                           #   - Score impact shown per milestone
│   │   │   │
│   │   │   └── [milestoneId]/
│   │   │       └── page.tsx            # Milestone detail
│   │   │                               #   - Description and guidance
│   │   │                               #   - Evidence upload/submission
│   │   │                               #   - Related course materials
│   │   │                               #   - Status history
│   │   │                               #   - Notes (student + instructor)
│   │   │
│   │   ├── team/
│   │   │   └── page.tsx                # Team overview
│   │   │                               #   - Venture info (name, type, description)
│   │   │                               #   - Team member progress grid
│   │   │                               #   - Mentor contact info
│   │   │                               #   - Check-in history and upcoming
│   │   │                               #   - Action items from last check-in
│   │   │
│   │   ├── financials/
│   │   │   ├── page.tsx                # Financial statement submissions
│   │   │   │                           #   - Month selector
│   │   │   │                           #   - Upload interface
│   │   │   │                           #   - Status per month
│   │   │   │
│   │   │   └── [month]/
│   │   │       └── page.tsx            # Submit/view specific month's financials
│   │   │
│   │   ├── materials/
│   │   │   ├── page.tsx                # Course materials (read-only)
│   │   │   │                           #   - Organized by semester → unit
│   │   │   │                           #   - Smart suggestions based on current phase
│   │   │   │
│   │   │   └── [materialId]/
│   │   │       └── page.tsx            # Material viewer
│   │   │
│   │   ├── score/
│   │   │   └── page.tsx                # Score breakdown
│   │   │                               #   - Total score and percentage
│   │   │                               #   - Per-milestone contribution
│   │   │                               #   - What-if calculator: "if I complete X, my score becomes Y"
│   │   │                               #   - History chart showing score over time
│   │   │
│   │   └── grades/
│   │       └── page.tsx                # Full gradebook view (own grades only)
│   │                                   #   - All categories with weights
│   │                                   #   - Semester toggle
│   │                                   #   - Weighted final grade
│   │
│   └── mentor/                         # ═══════ MENTOR VIEWS ═══════
│       ├── layout.tsx                  # Mentor nav: Dashboard, My Teams
│       │
│       ├── dashboard/
│       │   └── page.tsx                # MENTOR HOME
│       │                               #   - Cards for each assigned venture
│       │                               #   - Upcoming milestones across all teams
│       │                               #   - Check-in schedule
│       │
│       └── ventures/
│           └── [ventureId]/
│               ├── page.tsx            # Venture detail (scoped view)
│               │                       #   - Team members and their progress
│               │                       #   - Milestone grid (no scores visible)
│               │                       #   - Check-in log with mentor's own notes
│               │
│               └── notes/
│                   └── page.tsx        # Mentor notes for this venture
│                                       #   - Rich text notes per meeting
│                                       #   - Visible to instructor and students
│
├── api/                                # ═══════ API ROUTES ═══════
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts                # Supabase Auth callback
│   │
│   ├── scores/
│   │   ├── calculate/
│   │   │   └── route.ts                # POST: Trigger score recalculation for a student
│   │   └── batch/
│   │       └── route.ts                # POST: Recalculate all scores for a section
│   │
│   ├── milestones/
│   │   ├── [milestoneProgressId]/
│   │   │   └── route.ts                # PATCH: Update milestone status
│   │   └── bulk-update/
│   │       └── route.ts                # POST: Instructor bulk status updates
│   │
│   ├── check-ins/
│   │   └── route.ts                    # POST: Create check-in, GET: List check-ins
│   │
│   ├── financials/
│   │   ├── upload/
│   │   │   └── route.ts                # POST: Upload financial statement
│   │   └── [statementId]/
│   │       └── route.ts                # PATCH: Review/accept/reject
│   │
│   ├── gradebook/
│   │   ├── export/
│   │   │   └── route.ts                # GET: CSV export for Schoology
│   │   └── sync/
│   │       └── route.ts                # POST: Sync to Schoology (when API available)
│   │
│   ├── notifications/
│   │   ├── route.ts                    # GET: User notifications, PATCH: mark read
│   │   └── digest/
│   │       └── route.ts                # POST: Trigger weekly digest (cron endpoint)
│   │
│   └── cron/
│       ├── overdue-check/
│       │   └── route.ts                # Runs daily: flags overdue milestones, sends alerts
│       ├── weekly-digest/
│       │   └── route.ts                # Runs weekly: sends digest emails
│       └── score-snapshot/
│           └── route.ts                # Runs nightly: snapshots all scores for history
│
└── middleware.ts                        # Auth check + role-based redirect
                                        #   - Unauthenticated → /login
                                        #   - INSTRUCTOR → /instructor/dashboard
                                        #   - STUDENT → /student/dashboard
                                        #   - MENTOR → /mentor/dashboard
*/

// ============================================================================
// Centralized Route Constants
// ============================================================================

/**
 * ROUTES: Comprehensive centralized route constants for the LaunchPad app
 *
 * Export this object from pages/components that need to navigate around the app.
 * All routes are organized by role and functionality to ensure consistency.
 *
 * Usage:
 *   import { ROUTES } from "@/app/ROUTES";
 *
 *   <Link href={ROUTES.student.dashboard}>Dashboard</Link>
 *   <Link href={ROUTES.instructor.venture("abc123")}>Venture Detail</Link>
 *   <Link href={ROUTES.api.scoresCalculate}>Calculate Scores</Link>
 */
export const ROUTES = {
  // ========== Auth Routes ==========
  login: "/login",
  authCallback: "/auth/callback",

  // ========== Student Routes ==========
  student: {
    dashboard: "/student/dashboard",
    milestones: "/student/milestones",
    milestone: (id: string) => `/student/milestones/${id}`,
    score: "/student/score",
    team: "/student/team",
    financials: "/student/financials",
    financialMonth: (month: string) => `/student/financials/${month}`,
    grades: "/student/grades",
    materials: "/student/materials",
    material: (id: string) => `/student/materials/${id}`,
  },

  // ========== Instructor Routes ==========
  instructor: {
    dashboard: "/instructor/dashboard",
    ventures: "/instructor/ventures",
    venture: (id: string) => `/instructor/ventures/${id}`,
    ventureCheckIns: (id: string) => `/instructor/ventures/${id}/check-ins`,
    ventureNewCheckIn: (id: string) => `/instructor/ventures/${id}/check-ins/new`,
    ventureFinancials: (id: string) => `/instructor/ventures/${id}/financials`,
    students: "/instructor/students",
    student: (id: string) => `/instructor/students/${id}`,
    milestones: "/instructor/milestones",
    gradebook: "/instructor/gradebook",
    materials: "/instructor/materials",
    materialUnit: (id: string) => `/instructor/materials/${id}`,
    materialNew: "/instructor/materials/new",
    settings: "/instructor/settings",
  },

  // ========== Mentor Routes ==========
  mentor: {
    dashboard: "/mentor/dashboard",
    ventures: "/mentor/ventures",
    venture: (id: string) => `/mentor/ventures/${id}`,
    ventureCheckIn: (id: string) => `/mentor/ventures/${id}/conduct-check-in`,
    ventureNotes: (id: string) => `/mentor/ventures/${id}/notes`,
  },

  // ========== API Routes ==========
  api: {
    // Auth
    authCallback: "/api/auth/callback",
    impersonate: "/api/impersonate",

    // Scores
    scoresCalculate: "/api/scores/calculate",
    scoresBatch: "/api/scores/batch",

    // Milestones
    milestones: "/api/milestones",
    milestone: (id: string) => `/api/milestones/${id}`,
    milestonesBulkUpdate: "/api/milestones/bulk-update",

    // Check-ins
    checkIns: "/api/check-ins",

    // Financials
    financialsUpload: "/api/financials/upload",
    financial: (id: string) => `/api/financials/${id}`,

    // Gradebook
    gradebook: "/api/gradebook",
    gradebookExport: "/api/gradebook/export",
    gradebookSync: "/api/gradebook/sync",

    // Notifications
    notifications: "/api/notifications",
    notificationsDigest: "/api/notifications/digest",

    // Cron jobs
    cronOverdueCheck: "/api/cron/overdue-check",
    cronWeeklyDigest: "/api/cron/weekly-digest",
    cronScoreSnapshot: "/api/cron/score-snapshot",
  },
} as const;

// ============================================================================
// Helper Constants for Role-Based Routing
// ============================================================================

export const ROLE_ROUTES = {
  INSTRUCTOR: ROUTES.instructor.dashboard,
  STUDENT: ROUTES.student.dashboard,
  MENTOR: ROUTES.mentor.dashboard,
} as const;

export const ROLE_PREFIXES = {
  INSTRUCTOR: "/instructor",
  STUDENT: "/student",
  MENTOR: "/mentor",
} as const;

// ============================================================================
// Middleware Implementation Notes
// ============================================================================
/*
 * Middleware ensures:
 * 1. All (authenticated) routes require a valid session
 * 2. Users can only access routes matching their role prefix
 * 3. Accessing / redirects to the appropriate dashboard based on user role
 * 4. Accessing another role's prefix returns 403 Forbidden
 *
 * Redirect Logic:
 *   - Unauthenticated users → /login
 *   - Authenticated INSTRUCTOR → ROLE_ROUTES.INSTRUCTOR
 *   - Authenticated STUDENT → ROLE_ROUTES.STUDENT
 *   - Authenticated MENTOR → ROLE_ROUTES.MENTOR
 */
