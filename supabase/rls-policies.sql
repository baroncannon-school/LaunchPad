-- ============================================================================
-- LaunchPad — Supabase Row Level Security (RLS) Policies
--
-- These policies enforce access control at the database level:
--   INSTRUCTOR: Full read/write on everything
--   STUDENT:    Read own data, read team data, write own milestone progress
--   MENTOR:     Read assigned venture data only, write mentor notes
--
-- Assumes Supabase Auth with a custom claim or users table lookup for role.
-- The auth.uid() function returns the Supabase Auth user ID.
-- We join to the users table via supabase_uid to get the app-level role.
-- ============================================================================

-- Helper function: get the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE supabase_uid = auth.uid()::text;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: get the current user's app-level ID
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS TEXT AS $$
  SELECT id FROM public.users WHERE supabase_uid = auth.uid()::text;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if current user is instructor
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE supabase_uid = auth.uid()::text AND role = 'INSTRUCTOR'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if current user is a member of a venture
CREATE OR REPLACE FUNCTION public.is_venture_member(v_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships tm
    JOIN public.users u ON u.id = tm.user_id
    WHERE u.supabase_uid = auth.uid()::text
      AND tm.venture_id = v_id
      AND tm.is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if current user is a mentor for a venture
CREATE OR REPLACE FUNCTION public.is_venture_mentor(v_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_assignments ma
    JOIN public.users u ON u.id = ma.user_id
    WHERE u.supabase_uid = auth.uid()::text
      AND ma.venture_id = v_id
      AND ma.is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;


-- ============================================================================
-- USERS TABLE
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Instructors see all users
CREATE POLICY "Instructors can view all users"
  ON public.users FOR SELECT
  USING (public.is_instructor());

-- Students see themselves and their teammates
CREATE POLICY "Students can view themselves and teammates"
  ON public.users FOR SELECT
  USING (
    supabase_uid = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.team_memberships tm1
      JOIN public.team_memberships tm2 ON tm1.venture_id = tm2.venture_id
      JOIN public.users u ON u.id = tm1.user_id
      WHERE u.supabase_uid = auth.uid()::text
        AND tm2.user_id = public.users.id
        AND tm1.is_active = true AND tm2.is_active = true
    )
  );

-- Mentors see students in their assigned ventures
CREATE POLICY "Mentors can view assigned venture students"
  ON public.users FOR SELECT
  USING (
    supabase_uid = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.mentor_assignments ma
      JOIN public.users mentor ON mentor.id = ma.user_id
      JOIN public.team_memberships tm ON tm.venture_id = ma.venture_id
      WHERE mentor.supabase_uid = auth.uid()::text
        AND tm.user_id = public.users.id
        AND ma.is_active = true AND tm.is_active = true
    )
  );


-- ============================================================================
-- VENTURES TABLE
-- ============================================================================
ALTER TABLE public.ventures ENABLE ROW LEVEL SECURITY;

-- Instructors see all ventures
CREATE POLICY "Instructors can manage all ventures"
  ON public.ventures FOR ALL
  USING (public.is_instructor());

-- Students see their own venture
CREATE POLICY "Students can view their venture"
  ON public.ventures FOR SELECT
  USING (public.is_venture_member(id));

-- Mentors see assigned ventures
CREATE POLICY "Mentors can view assigned ventures"
  ON public.ventures FOR SELECT
  USING (public.is_venture_mentor(id));


-- ============================================================================
-- MILESTONE DEFINITIONS (read-only for non-instructors)
-- ============================================================================
ALTER TABLE public.milestone_definitions ENABLE ROW LEVEL SECURITY;

-- Everyone can read milestone definitions (they're course-wide)
CREATE POLICY "All authenticated users can view milestone definitions"
  ON public.milestone_definitions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only instructors can modify
CREATE POLICY "Instructors can manage milestone definitions"
  ON public.milestone_definitions FOR ALL
  USING (public.is_instructor());


-- ============================================================================
-- MILESTONE PROGRESS
-- ============================================================================
ALTER TABLE public.milestone_progress ENABLE ROW LEVEL SECURITY;

-- Instructors have full access
CREATE POLICY "Instructors can manage all milestone progress"
  ON public.milestone_progress FOR ALL
  USING (public.is_instructor());

-- Students can view their own progress
CREATE POLICY "Students can view own progress"
  ON public.milestone_progress FOR SELECT
  USING (student_id = public.get_user_id());

-- Students can view their teammates' progress
CREATE POLICY "Students can view teammate progress"
  ON public.milestone_progress FOR SELECT
  USING (public.is_venture_member(venture_id));

-- Students can update their own progress (submit, add evidence)
CREATE POLICY "Students can update own progress"
  ON public.milestone_progress FOR UPDATE
  USING (student_id = public.get_user_id())
  WITH CHECK (student_id = public.get_user_id());

-- Students can insert their own progress records
CREATE POLICY "Students can create own progress"
  ON public.milestone_progress FOR INSERT
  WITH CHECK (student_id = public.get_user_id());

-- Mentors can view assigned venture progress
CREATE POLICY "Mentors can view assigned venture progress"
  ON public.milestone_progress FOR SELECT
  USING (public.is_venture_mentor(venture_id));


-- ============================================================================
-- CHECK-INS
-- ============================================================================
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Instructors have full access
CREATE POLICY "Instructors can manage all check-ins"
  ON public.check_ins FOR ALL
  USING (public.is_instructor());

-- Students can view check-ins for their venture
CREATE POLICY "Students can view own venture check-ins"
  ON public.check_ins FOR SELECT
  USING (public.is_venture_member(venture_id));

-- Mentors can view and add check-ins for assigned ventures
CREATE POLICY "Mentors can view assigned venture check-ins"
  ON public.check_ins FOR SELECT
  USING (public.is_venture_mentor(venture_id));


-- ============================================================================
-- FINANCIAL STATEMENTS
-- ============================================================================
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can manage all financial statements"
  ON public.financial_statements FOR ALL
  USING (public.is_instructor());

CREATE POLICY "Students can view own venture financials"
  ON public.financial_statements FOR SELECT
  USING (public.is_venture_member(venture_id));

CREATE POLICY "Students can submit own venture financials"
  ON public.financial_statements FOR INSERT
  WITH CHECK (public.is_venture_member(venture_id));

CREATE POLICY "Students can update own venture financials"
  ON public.financial_statements FOR UPDATE
  USING (public.is_venture_member(venture_id) AND submitted_by_id = public.get_user_id());

CREATE POLICY "Mentors can view assigned venture financials"
  ON public.financial_statements FOR SELECT
  USING (public.is_venture_mentor(venture_id));


-- ============================================================================
-- GRADE RECORDS (instructor and student-self only)
-- ============================================================================
ALTER TABLE public.grade_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can manage all grades"
  ON public.grade_records FOR ALL
  USING (public.is_instructor());

CREATE POLICY "Students can view own grades"
  ON public.grade_records FOR SELECT
  USING (student_id = public.get_user_id());

-- NOTE: Mentors CANNOT see grades. This is intentional.


-- ============================================================================
-- MATERIALS (course-wide read access)
-- ============================================================================
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view published materials"
  ON public.materials FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_published = true);

CREATE POLICY "Instructors can manage all materials"
  ON public.materials FOR ALL
  USING (public.is_instructor());


-- ============================================================================
-- NOTIFICATIONS (private to recipient)
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = public.get_user_id());

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (user_id = public.get_user_id());

CREATE POLICY "Instructors can manage all notifications"
  ON public.notifications FOR ALL
  USING (public.is_instructor());


-- ============================================================================
-- SCORING RULES (read-only for non-instructors)
-- ============================================================================
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view scoring rules"
  ON public.scoring_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Instructors can manage scoring rules"
  ON public.scoring_rules FOR ALL
  USING (public.is_instructor());


-- ============================================================================
-- SCORE SNAPSHOTS
-- ============================================================================
ALTER TABLE public.score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can view all score snapshots"
  ON public.score_snapshots FOR ALL
  USING (public.is_instructor());

CREATE POLICY "Students can view own score snapshots"
  ON public.score_snapshots FOR SELECT
  USING (student_id = public.get_user_id());


-- ============================================================================
-- ACTIVITY LOGS (instructor only for full view)
-- ============================================================================
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can view all activity logs"
  ON public.activity_logs FOR ALL
  USING (public.is_instructor());

CREATE POLICY "Students can view own venture activity"
  ON public.activity_logs FOR SELECT
  USING (
    user_id = public.get_user_id()
    OR (venture_id IS NOT NULL AND public.is_venture_member(venture_id))
  );
