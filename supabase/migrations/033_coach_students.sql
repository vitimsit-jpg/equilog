-- Students registered by a coach
CREATE TABLE IF NOT EXISTS coach_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT NULL,
  horse_name TEXT NULL,
  notes TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coach_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage their own students"
ON coach_students FOR ALL TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

-- Planned sessions by a coach
CREATE TABLE IF NOT EXISTS coach_planned_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES coach_students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NULL,
  duration_min INT NULL DEFAULT 60,
  notes TEXT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coach_planned_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage their planned sessions"
ON coach_planned_sessions FOR ALL TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

-- Owner email for communication (gérant → propriétaire)
ALTER TABLE horses ADD COLUMN IF NOT EXISTS owner_email TEXT NULL;
