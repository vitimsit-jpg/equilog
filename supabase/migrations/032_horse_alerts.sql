CREATE TABLE IF NOT EXISTS horse_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal', -- normal | urgent | critique
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE horse_alerts ENABLE ROW LEVEL SECURITY;

-- Horse owner can see alerts for their horses
CREATE POLICY "Horse owners see their alerts"
ON horse_alerts FOR SELECT
TO authenticated
USING (
  horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid())
  OR reporter_id = auth.uid()
);

-- Authenticated users can insert alerts
CREATE POLICY "Users can report alerts"
ON horse_alerts FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Horse owner or reporter can update (resolve)
CREATE POLICY "Owners and reporters can update alerts"
ON horse_alerts FOR UPDATE
TO authenticated
USING (
  horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid())
  OR reporter_id = auth.uid()
);
