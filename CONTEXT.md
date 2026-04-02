# LaunchPad — Course Companion App Context Briefing

## What This Is

I'm building a Next.js course companion app called **LaunchPad** for my high school Entrepreneurship course at Saint Francis High School (SFHS). The attached files contain the complete database schema (Prisma), seed data, scoring engine, Supabase RLS policies, and route map. The course documents show the syllabus, standards, final exam, and the current milestone tracker spreadsheet I'm replacing.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth (Google OAuth restricted to SFHS domain for students/instructor, magic links for mentors)
- **ORM**: Prisma
- **UI**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## Three User Roles

| Role | Who | Auth Method | Count |
|------|-----|-------------|-------|
| **Instructor** | Me (Baron) — full admin | Google OAuth (SFHS) | 1 |
| **Students** | ~80 across periods 3, 5, 6 | Google OAuth (SFHS) | ~80 |
| **Mentors** | External advisors scoped to specific ventures | Magic links | Variable |

## The Milestone Tracker (Centerpiece)

The milestone tracker is the core feature and represents **50% of the Spring semester grade**.

- **60 milestones** defined in `prisma/seed.ts`
- Milestones are filtered by **ownership type** (School / Self / Both), **offering type** (Product / Service / Both), and **requirement level** (Required / Optional)
- Milestones are grouped into **6 phases**: Initial Development, Fundraising Simulation, Sales Strategy & Going to Market, Product Market Fit & Attaining Profitability, Scaling & Winding Down, and Advanced Milestones
- Milestones span **8 time periods**: P1 (Nov) through P7 (May) + P8 (Other)

## Scoring System

The scoring engine lives in `lib/scoring.ts` and uses multiplier-based calculation:

| Scenario | Multiplier |
|----------|-----------|
| Group Required — completed (member) | 0.93 |
| Group Required — incomplete | 0.60 |
| Group Optional — completed | 0.50 |
| Lead Required — completed (bonus) | 0.25 |
| Lead Optional — completed (bonus) | 0.125 |

Score = sum of applicable milestone multipliers based on completion status. Leads earn additional bonus points on top of member scores. Waived milestones are excluded from the denominator.

## Spring Semester Grade Weights

| Category | Weight |
|----------|--------|
| Exams | 25% |
| **Milestone Tracker** | **50%** |
| Quizzes | 5% |
| Authentic Assessment | 5% |
| Design Showcase | 15% |

## Architecture Files (Source of Truth)

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Complete data model — 18 models, all enums, all relations |
| `prisma/seed.ts` | All 60 milestone definitions, scoring rules, semester configs, curriculum units |
| `lib/scoring.ts` | Multiplier-based score calculation engine with batch support |
| `supabase/rls-policies.sql` | Row-level security policies for all three roles |
| `app/ROUTES.ts` | Full page routing structure with every view documented |

## Course Documents

| File | Purpose |
|------|---------|
| `course-docs/Entrepreneurship Syllabus - 2025-2026.pdf` | Full course syllabus with grade weights and schedule |
| `course-docs/Entrepreneurship Course Standards.pdf` | State standards the course aligns to |
| `course-docs/Entrepreneurship Final Exam (Fall 2025).pdf` | Fall semester final exam for content reference |
| `course-docs/Simulation Milestone Tracker (Spring '26).xlsx` | The current spreadsheet-based tracker being replaced |

## Build Priority

1. Database schema + seed migration
2. Auth + role routing
3. Instructor milestone grid view
4. Student dashboard
5. Check-in system
6. Mentor portal
7. Notifications
8. Schoology grade export
9. Materials library

## Key Design Decisions Already Made

- **Milestone filtering**: Milestones are defined once and filtered per venture based on ownership/offering type — not duplicated per venture
- **Score snapshots**: Scores are calculated on-demand and cached in `score_snapshots` for performance and history
- **RLS at database level**: Security isn't just in the API layer — Supabase RLS enforces role access at the PostgreSQL level
- **Mentors can't see grades**: Intentional policy decision reflected in RLS
- **Financial statements are per-venture per-month**: Monthly submission cadence with review workflow
- **Activity logs**: Full audit trail for all significant actions
